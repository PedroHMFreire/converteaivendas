// api/billing/mercadopago/webhook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET,
} = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a || "");
  const B = Buffer.from(b || "");
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

/** Valida x-signature (ts,v1) com manifest "id:{resourceId};request-id:{x-request-id};ts:{ts};" */
function verifyMPSignature({
  signature,
  requestId,
  resourceId,
  secret,
}: {
  signature?: string;
  requestId?: string;
  resourceId?: string;
  secret?: string;
}) {
  if (!signature || !requestId || !resourceId || !secret) return false;
  let ts = "", v1 = "";
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=");
    if (k?.trim() === "ts") ts = (v || "").trim();
    if (k?.trim() === "v1") v1 = (v || "").trim();
  }
  if (!ts || !v1) return false;
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(computed, v1);
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET) {
      return res.status(500).json({ error: "Faltam MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET" });
    }

    // ---- 1) Validar assinatura do MP
    const signature = (req.headers["x-signature"] as string) || "";
    const requestId = (req.headers["x-request-id"] as string) || "";
    const q = (req.query || {}) as any;
    const b = (req.body || {}) as any;

    const resourceId =
      q["data.id"]?.toString() ||
      q["id"]?.toString() ||
      b?.data?.id?.toString() ||
      b?.id?.toString() ||
      "";

    if (!verifyMPSignature({
      signature,
      requestId,
      resourceId,
      secret: MP_WEBHOOK_SECRET!,
    })) {
      return res.status(401).json({ ok: false, where: "sig", msg: "invalid x-signature" });
    }

    // ---- 2) Buscar pagamento (Checkout Pro)
    const pr = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await pr.json();
    if (!pr.ok) {
      return res.status(400).json({ ok: false, where: "mp", details: payment });
    }

    // status: approved|pending|rejected...
    const status: string = payment.status || "";
    const externalRef: string = payment.external_reference || "";
    const payerEmail: string = payment.payer?.email || "";

    if (!externalRef) {
      // sem referência não dá pra mapear usuário/plano
      return res.status(202).json({ ok: true, where: "no-external-ref" });
    }

    const [userId, plan] = externalRef.split("|");
    const planType = (plan || "").toLowerCase();
    const months = monthsForPlan(planType);

    // Idempotência simples: não inserir subscription duplicada para o mesmo payment_id
    // (garanta UNIQUE em subscriptions.payment_id no Supabase para reforçar)
    if (status !== "approved") {
      // para pending/rejected apenas aceite 200 (sem atualizar)
      return res.status(200).json({ ok: true, status, ignore: true });
    }

    // ---- 3) Atualizar profiles: plan_type e expires_at = GREATEST(now, expires_at) + months
    // Buscar expires_at atual
    const { data: prof } = await supabase
      .from("profiles")
      .select("expires_at")
      .eq("user_id", userId)
      .single();

    const now = new Date();
    const base = prof?.expires_at ? new Date(prof.expires_at) : now;
    const start = base > now ? base : now; // GREATEST(now, expires_at)
    const newExpires = months > 0 ? addMonths(start, months) : start;

    // Atualiza estado atual
    await supabase.from("profiles").update({
      plan_type: planType,                 // enum/texto: 'mensal'|'trimestral'|'anual'
      expires_at: newExpires.toISOString(),
      mp_last_payment_id: payment.id?.toString?.() || String(payment.id || ""),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    // ---- 4) (Opcional recomendado) Registrar histórico em subscriptions
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_type: planType,
      period_start: start.toISOString(),
      period_end: newExpires.toISOString(),
      amount: Number(payment.transaction_amount || payment.transaction_details?.total_paid_amount || 0),
      currency: (payment.currency_id || "BRL"),
      payment_status: status,
      payment_id: String(payment.id || ""),
    }).select().maybeSingle();

    return res.status(200).json({
      ok: true,
      where: "payment",
      external_reference: externalRef,
      plan_type: planType,
      period_start: start.toISOString(),
      expires_at: newExpires.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, where: "catch", msg: err?.message || "unknown" });
  }
}
