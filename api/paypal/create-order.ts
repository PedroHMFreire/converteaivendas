// api/paypal/create-order.ts
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      PAYPAL_CLIENT_ID,
      PAYPAL_SECRET,
      PAYPAL_CLIENT_SECRET,
      PAYPAL_ENV,
      PAYPAL_CURRENCY, // opcional (default BRL)

      // Preferenciais (BRL):
      PAYPAL_PRICE_MENSAL_BRL,
      PAYPAL_PRICE_TRIMESTRAL_BRL,
      PAYPAL_PRICE_ANUAL_BRL,

      // Retrocompatível (se você tiver usado *_USD no Vercel):
      PAYPAL_PRICE_MENSAL_USD,
      PAYPAL_PRICE_TRIMESTRAL_USD,
      PAYPAL_PRICE_ANUAL_USD,
    } = process.env;

  const SECRET = PAYPAL_SECRET || PAYPAL_CLIENT_SECRET; // accept both names
  if (!PAYPAL_CLIENT_ID || !SECRET) {
      return res.status(500).json({ error: "PAYPAL_CLIENT_ID/SECRET ausentes" });
    }

    const baseURL =
      PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const { userId, plan, amountBRL } = (req.body || {}) as {
      userId?: string;
      plan?: "mensal" | "trimestral" | "anual";
      amountBRL?: number; // opcional (se quiser enviar direto do front)
    };

    if (!userId) return res.status(400).json({ error: "userId obrigatório" });
    if (!plan || !["mensal", "trimestral", "anual"].includes(plan)) {
      return res.status(400).json({ error: "plan inválido (mensal|trimestral|anual)" });
    }

    const currency = (PAYPAL_CURRENCY || "BRL").toUpperCase();

    const toNum = (v?: string | number) => {
      if (v == null) return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    };

    const cfgMensal = toNum(PAYPAL_PRICE_MENSAL_BRL) ?? toNum(PAYPAL_PRICE_MENSAL_USD);
    const cfgTri    = toNum(PAYPAL_PRICE_TRIMESTRAL_BRL) ?? toNum(PAYPAL_PRICE_TRIMESTRAL_USD);
    const cfgAnual  = toNum(PAYPAL_PRICE_ANUAL_BRL) ?? toNum(PAYPAL_PRICE_ANUAL_USD);

    let value: number | undefined =
      typeof amountBRL === "number" && Number.isFinite(amountBRL) ? amountBRL : undefined;

    if (value == null) {
      if (plan === "mensal") value = cfgMensal;
      if (plan === "trimestral") value = cfgTri;
      if (plan === "anual") value = cfgAnual;
    }
    if (value == null) {
      return res.status(400).json({
        error:
          "Defina o preço do plano: configure PAYPAL_PRICE_MENSAL_BRL/TRIMESTRAL_BRL/ANUAL_BRL (ou *_USD) no Vercel, ou envie amountBRL no body.",
      });
    }
    const amountStr = value.toFixed(2);

    // OAuth
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${SECRET}`).toString("base64");
    const tokenResp = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(400).json({
        error: "paypal_oauth_error",
        status: tokenResp.status,
        details: tokenJson,
        hint:
          "Verifique PAYPAL_ENV=live, PAYPAL_CLIENT_ID, PAYPAL_SECRET/PAYPAL_CLIENT_SECRET e se a credencial é do app live.",
      });
    }
    const accessToken = tokenJson.access_token as string;

    // Criar Order
    const orderResp = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: amountStr },
            custom_id: `${userId}|${plan}`,
          },
        ],
      }),
    });
    const orderJson = await orderResp.json();
    if (!orderResp.ok) return res.status(400).json({ error: "paypal_create_order_error", details: orderJson });

    return res.status(200).json({ orderID: orderJson.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "internal error" });
  }
}
