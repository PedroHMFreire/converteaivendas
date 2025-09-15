// api/paypal/confirm.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function monthsForPlan(plan: string) {
  if (plan === "mensal") return 1;
  if (plan === "trimestral") return 3;
  if (plan === "anual") return 12;
  return 0;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV } = process.env;
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return res.status(500).json({ error: "PAYPAL_CLIENT_ID/SECRET ausentes" });
    }
    const baseURL =
      PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const { orderID } = (req.body || {}) as { orderID?: string };
    if (!orderID) return res.status(400).json({ error: "orderID obrigatório" });

    // OAuth
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const tokenResp = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) return res.status(400).json({ error: "paypal_oauth_error", details: tokenJson });
    const accessToken = tokenJson.access_token as string;

    // Capturar
    const capResp = await fetch(`${baseURL}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const capJson = await capResp.json();
    if (!capResp.ok) return res.status(400).json({ error: "paypal_capture_error", details: capJson });

    const status = capJson.status as string; // COMPLETED
    const pu = Array.isArray(capJson.purchase_units) ? capJson.purchase_units[0] : undefined;

    // custom_id pode estar no capture ou na order
    const customFromCapture: string =
      (pu?.payments?.captures?.[0]?.custom_id || pu?.custom_id || "") as string;

    let finalCustom = customFromCapture;
    if (!finalCustom) {
      const orderResp = await fetch(`${baseURL}/v2/checkout/orders/${orderID}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const orderJson = await orderResp.json();
      finalCustom = (orderJson?.purchase_units?.[0]?.custom_id as string) || "";
    }
    if (!finalCustom) return res.status(202).json({ ok: true, where: "no-custom-id", status });

    const [userId, planRaw] = finalCustom.split("|");
    const plan = (planRaw || "").toLowerCase();
    const months = monthsForPlan(plan);

    const capture = pu?.payments?.captures?.[0] || null;
    const paymentId = String(capture?.id || orderID);

    if (status !== "COMPLETED") {
      return res.status(200).json({ ok: true, status, ignore: true });
    }

    // Empilhar validade em profiles (usar v_profiles_access para leitura)
    const { data: prof } = await supabase
      .from("v_profiles_access")
      .select("data_expiracao")
      .eq("user_id", userId)
      .single();

    const now = new Date();
    const base = prof?.data_expiracao ? new Date(prof.data_expiracao) : now;
    const start = base > now ? base : now;
    const newExpires = months > 0 ? addMonths(start, months) : start;

    await supabase
      .from("profiles")
      .update({
        plano: plan === "mensal" ? "basic" : plan === "anual" ? "premium" : "basic", // Mapear para AppPlan
        data_expiracao: newExpires.toISOString(),
        plano_recorrencia: plan, // 'mensal' | 'trimestral' | 'anual'
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Histórico (idempotente por payment_id)
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_type: plan,
        period_start: start.toISOString(),
        period_end: newExpires.toISOString(),
        amount: Number(capture?.amount?.value || 0),
        currency: String(capture?.amount?.currency_code || "BRL"),
        payment_status: status,
        payment_id: paymentId,
      });
    }

    return res.status(200).json({
      ok: true,
      status,
      user_id: userId,
      plan_type: plan,
      period_start: start.toISOString(),
      expires_at: newExpires.toISOString(),
      payment_id: paymentId,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "internal error" });
  }
}
