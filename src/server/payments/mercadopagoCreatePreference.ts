// api/mp/create-preference.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const {
  MP_ACCESS_TOKEN,
  APP_BASE_URL,              // ex.: https://seuapp.vercel.app
  MP_PRICE_MENSAL,           // opcional: preço default
  MP_PRICE_TRIMESTRAL,
  MP_PRICE_ANUAL,
} = process.env;

type Plano = "mensal" | "trimestral" | "anual";

function getInstallments(plano: Plano) {
  if (plano === "anual") return { installments: 10, default_installments: 10 };
  if (plano === "trimestral") return { installments: 3, default_installments: 3 };
  return { installments: 1, default_installments: 1 }; // ajuste se quiser parcelar mensal
}

function getAmount(plano: Plano, total?: number) {
  if (typeof total === "number") return Number(total);
  if (plano === "mensal" && MP_PRICE_MENSAL) return Number(MP_PRICE_MENSAL);
  if (plano === "trimestral" && MP_PRICE_TRIMESTRAL) return Number(MP_PRICE_TRIMESTRAL);
  if (plano === "anual" && MP_PRICE_ANUAL) return Number(MP_PRICE_ANUAL);
  throw new Error("Preço não informado. Envie `total` no body ou defina MP_PRICE_* no .env");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!MP_ACCESS_TOKEN || !APP_BASE_URL) {
      return res.status(500).json({ error: "Faltam variáveis MP_ACCESS_TOKEN/APP_BASE_URL" });
    }

    const { userId, plan, total, title } = (req.body || {}) as {
      userId?: string;
      plan?: Plano;
      total?: number;
      title?: string;
    };

    if (!userId) return res.status(400).json({ error: "userId obrigatório" });
    if (!plan || !["mensal", "trimestral", "anual"].includes(plan)) {
      return res.status(400).json({ error: "plan inválido (use: mensal|trimestral|anual)" });
    }

    const amount = getAmount(plan as Plano, total);
    const { installments, default_installments } = getInstallments(plan as Plano);

    const preferenceBody = {
      items: [
        {
          title: title ?? `Assinatura ${plan}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      external_reference: `${userId}|${plan}`,
      back_urls: {
        success: `${APP_BASE_URL}/billing/success`,
        failure: `${APP_BASE_URL}/billing/error`,
        pending: `${APP_BASE_URL}/billing/pending`,
      },
      auto_return: "approved",
      notification_url: `${APP_BASE_URL}/api/billing/mercadopago/webhook`,
      payment_methods: {
        installments,
        default_installments,
        // Para forçar só cartão (sem PIX/boletos), descomente:
        // excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
      },
      statement_descriptor: "SANTE",
    };

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    const json = await r.json();
    if (!r.ok) return res.status(400).json({ error: "MP preference error", details: json });

    return res.status(200).json({ preferenceId: json.id, init_point: json.init_point });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "internal error" });
  }
}
