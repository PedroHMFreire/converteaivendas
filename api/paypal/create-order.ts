// api/paypal/create-order.ts
export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      PAYPAL_CLIENT_ID,
      PAYPAL_SECRET,
      PAYPAL_ENV,
      PAYPAL_CURRENCY, // opcional (default BRL)
      // Preços em BRL (preferencial)
      PAYPAL_PRICE_MENSAL_BRL,
      PAYPAL_PRICE_TRIMESTRAL_BRL,
      PAYPAL_PRICE_ANUAL_BRL,
      // Retrocompatibilidade: se você ainda tiver setado *_BRL nas envs, também aceitamos
      PAYPAL_PRICE_MENSAL_USD,
      PAYPAL_PRICE_TRIMESTRAL_USD,
      PAYPAL_PRICE_ANUAL_USD,
    } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return res.status(500).json({ error: "PAYPAL_CLIENT_ID/SECRET ausentes" });
    }

    const baseURL =
      PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const { userId, plan, amountBRL } = (req.body || {}) as {
      userId?: string;
      plan?: "mensal" | "trimestral" | "anual";
      amountBRL?: number; // opcional: se quiser enviar o preço direto do front
    };

    if (!userId) return res.status(400).json({ error: "userId obrigatório" });
    if (!plan || !["mensal", "trimestral", "anual"].includes(plan)) {
      return res.status(400).json({ error: "plan inválido (mensal|trimestral|anual)" });
    }

    // ----- Moeda (default BRL) -----
    const currency = (PAYPAL_CURRENCY || "BRL").toUpperCase();

    // ----- Descobrir o valor do plano (em BRL) -----
    // Preferimos *_BRL; se não tiver, caímos em *_BRL por retrocompatibilidade (o NOME da env não importa, a ordem é criada na moeda `currency`).
    function pickPrice(p?: string | number, fallback?: string | number) {
      const raw = p ?? fallback;
      if (raw == null) return undefined;
      const n = typeof raw === "string" ? Number(raw) : raw;
      return Number.isFinite(n) ? n : undefined;
    }

    const cfgMensal =
      pickPrice(PAYPAL_PRICE_MENSAL_BRL, PAYPAL_PRICE_MENSAL_BRL) ?? undefined;
    const cfgTri =
      pickPrice(PAYPAL_PRICE_TRIMESTRAL_BRL, PAYPAL_PRICE_TRIMESTRAL_BRL) ?? undefined;
    const cfgAnual =
      pickPrice(PAYPAL_PRICE_ANUAL_BRL, PAYPAL_PRICE_ANUAL_BRL) ?? undefined;

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
          "Defina o preço do plano: configure PAYPAL_PRICE_MENSAL_BRL/TRIMESTRAL_BRL/ANUAL_BRL (ou *_BRL) no Vercel, ou envie amountBRL no body.",
      });
    }

    // Sanitiza para 2 casas
    const amountStr = value.toFixed(2);

    // ----- OAuth2 -----
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const tokenResp = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(400).json({ error: "paypal_oauth_error", details: tokenJson });
    }
    const accessToken = tokenJson.access_token as string;

    // ----- Criar Order (intent=CAPTURE) -----
    const orderResp = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency, // <<< BRL por padrão
              value: amountStr,
            },
            custom_id: `${userId}|${plan}`,
          },
        ],
      }),
    });

    const orderJson = await orderResp.json();
    if (!orderResp.ok) {
      return res.status(400).json({ error: "paypal_create_order_error", details: orderJson });
    }

    return res.status(200).json({ orderID: orderJson.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "internal error" });
  }
}
