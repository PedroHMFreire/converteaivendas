import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET,
  MP_PLAN_ID_MENSAL,
  MP_PLAN_ID_TRIMESTRAL,
  MP_PLAN_ID_ANUAL,
} = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// --- utils ---

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

/**
 * Valida header `x-signature` do Mercado Pago (formato: "ts=...,v1=...").
 * Manifesto: "id:{resourceId};request-id:{x-request-id};ts:{ts};"
 * Docs: x-signature + ts/v1. */
function verifyMPSignature({
  signature,
  requestId,
  resourceId,
  secret,
}: {
  signature: string;
  requestId: string;
  resourceId: string;
  secret: string;
}) {
  if (!signature || !requestId || !resourceId) return false;

  let ts = "";
  let v1 = "";
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=");
    if (k?.trim() === "ts") ts = v?.trim() || "";
    if (k?.trim() === "v1") v1 = v?.trim() || "";
  }
  if (!ts || !v1) return false;

  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(computed, v1);
}

// Mapeia o plano do MP para a recorrência "mensal|trimestral|anual"
function recurrenceFromPlanId(planId?: string) {
  if (!planId) return "desconhecida";
  if (MP_PLAN_ID_MENSAL && planId === MP_PLAN_ID_MENSAL) return "mensal";
  if (MP_PLAN_ID_TRIMESTRAL && planId === MP_PLAN_ID_TRIMESTRAL) return "trimestral";
  if (MP_PLAN_ID_ANUAL && planId === MP_PLAN_ID_ANUAL) return "anual";
  return "desconhecida";
}

// Atualiza/insere perfil por e-mail
async function upsertProfileByEmail(email: string, patch: Record<string, any>) {
  // Ajuste o nome da tabela/colunas se necessário.
  return supabase.from("profiles").upsert({ email, ...patch }, { onConflict: "email" }).select().single();
}

// Busca assinatura/preapproval no MP
async function fetchPreapproval(preapprovalId: string) {
  const r = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`MP preapproval fetch failed: ${r.status} ${t}`);
  }
  return r.json() as Promise<any>;
}

export function registerMercadoPagoBilling(app: Express) {
  if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET) {
    console.warn("[MP] MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET ausentes — webhook será registrado, mas inválido.");
  }

  // Webhook oficial do Mercado Pago
  app.post("/api/billing/mercadopago/webhook", async (req: Request, res: Response) => {
    try {
      const signature = (req.headers["x-signature"] as string) || "";
      const requestId = (req.headers["x-request-id"] as string) || "";

      // Os webhooks do MP podem mandar o id em query ou body
      const q = req.query as any;
      const b = (req.body || {}) as any;
      const resourceId =
        q["data.id"]?.toString() ||
        q["id"]?.toString() ||
        b?.data?.id?.toString() ||
        b?.id?.toString() ||
        "";

      // 1) valida assinatura
      if (!verifyMPSignature({ signature, requestId, resourceId, secret: MP_WEBHOOK_SECRET || "" })) {
        return res.status(401).json({ ok: false, where: "sig", msg: "invalid x-signature" });
      }

      // 2) descobre o tipo e busca detalhes (assinaturas usam "preapproval")
      // Mesmo que o body.type varie, o id acima é suficiente para buscar a assinatura:
      const pre = await fetchPreapproval(resourceId);

      // Campos úteis (variam por conta/país; manter fallback defensivo)
      const status: string = pre.status || pre.application_status || "";
      const payerEmail: string =
        pre.payer_email || pre.payer?.email || pre.payer?.email_address || "";
      const planId: string | undefined = pre.preapproval_plan_id;
      const recurrence = recurrenceFromPlanId(planId);

      // 3) define patch no seu banco
      // status comuns: authorized/active => libera; paused/cancelled => bloqueia
      let patch: Record<string, any> = {
        mp_preapproval_id: pre.id,
        plano: "basic",            // ou 'premium' se quiser separar no futuro
        plano_recorrencia: recurrence,
      };

      if (["authorized", "active"].includes(status)) {
        patch.ativo = true;
        patch.data_expiracao = null; // sai do trial
      } else if (["paused", "cancelled", "cancelled_by_collector", "cancelled_by_user"].includes(status)) {
        patch.ativo = false;
      }

      if (!payerEmail) {
        // Não dá pra associar ao usuário — registre e retorne 202 (aceito, mas sem match)
        console.warn("[MP] Webhook sem payerEmail — não foi possível associar ao usuário");
        return res.status(202).json({ ok: true, where: "no-email", pre });
      }

      const { data, error } = await upsertProfileByEmail(payerEmail, patch);
      if (error) {
        console.error("[MP] upsert profile error", error);
        return res.status(500).json({ ok: false, where: "db", error });
      }

      return res.json({ ok: true, where: "preapproval", status, recurrence, profile: data });
    } catch (err: any) {
      console.error("[MP] webhook error", err?.message || err);
      return res.status(500).json({ ok: false, where: "catch", msg: err?.message || "unknown" });
    }
  });

  // (Opcional) Endpoint para sincronizar manualmente após o /billing/success
  app.post("/api/billing/mercadopago/sync", async (_req: Request, res: Response) => {
    return res.json({ ok: true });
  });
}