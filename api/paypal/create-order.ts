// api/paypal/create-order.ts
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      PAYPAL_CLIENT_ID,
      PAYPAL_SECRET,
      PAYPAL_PRICE_MENSAL_USD,
      PAYPAL_PRICE_TRIMESTRAL_USD,
      PAYPAL_PRICE_ANUAL_USD,
      PAYPAL_ENV,
    } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return res.status(500).json({ error: "PAYPAL_CLIENT_ID/SECRET ausentes" });
    }

    const baseURL =
      PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const { userId, plan, amountUSD } = (req.body || {}) as {
      userId?: string;
      plan?: "mensal" | "trimestral" | "anual";
      amountUSD?: number;
    };

    if (!userId) return res.status(400).json({ error: "userId obrigatório" });
    if (!plan || !["mensal", "trimestral", "anual"].includes(plan)) {
      return res.status(400).json({ error: "plan inválido (mensal|trimestral|anual)" });
    }

    // Valor: usa amountUSD do body ou variáveis de ambiente (USD)
    let value: number | undefined = typeof amountUSD === "number" ? amountUSD : undefined;
    if (value == null) {
      if (plan === "mensal" && PAYPAL_PRICE_MENSAL_USD) value = Number(PAYPAL_PRICE_MENSAL_USD);
      if (plan === "trimestral" && PAYPAL_PRICE_TRIMESTRAL_USD) value = Number(PAYPAL_PRICE_TRIMESTRAL_USD);
      if (plan === "anual" && PAYPAL_PRICE_ANUAL_USD) value = Number(PAYPAL_PRICE_ANUAL_USD);
    }
    if (value == null || Number.isNaN(value)) {
      return res.status(400).json({ error: "Defina o preço: amountUSD no body ou PAYPAL_PRICE_*_USD no .env" });
    }

    // 1) OAuth2 para pegar access_token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const tokenResp = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) return res.status(400).json({ error: "paypal_oauth_error", details: tokenJson });
    const accessToken = tokenJson.access_token as string;

    // 2) Criar Order (intent=CAPTURE)
    const orderResp = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: value.toFixed(2) },
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