"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, Target,
  CalendarClock, DollarSign, Users, Store
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  data: string;          // "YYYY-MM-DD"
  user_id: string;
  vendas: number;        // qtd vendas
  atendimentos: number;  // qtd atendimentos
  valor?: number;        // opcional, não usado nos cálculos de perda
};
type Loja = { id: string; nome: string; ticketMedio?: number };
type Vendedor = { id: string; nome: string; lojaId: string };

type Insight = {
  id: string;
  title: string;
  description: string;
  tag: "alert" | "opportunity" | "info";
  icon: "trendingUp" | "trendingDown" | "alert" | "target" | "calendar" | "dollar" | "users" | "store";
  metric?: string;
  action?: string;
};

const icons = {
  trendingUp: <TrendingUp className="w-5 h-5" />,
  trendingDown: <TrendingDown className="w-5 h-5" />,
  alert: <AlertTriangle className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  calendar: <CalendarClock className="w-5 h-5" />,
  dollar: <DollarSign className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  store: <Store className="w-5 h-5" />,
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const dateOnly = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(new Date(d)).toISOString().split("T")[0];

const addDays = (d: Date, days: number) => {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
};
const inRange = (s: string, a: Date, b: Date) => {
  const ds = new Date(dateOnly(s));
  return ds >= a && ds <= b;
};

export default function InsightsIA() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [today, setToday] = useState<string>(dateOnly(new Date().toISOString()));
  const [regenLoading, setRegenLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) {
          toast({ title: "Faça login para ver os insights", variant: "destructive" });
          setLoading(false);
          return;
        }
        const uid = auth.user.id;
        setUserId(uid);

        // 1) Cadastros (lojas com ticketMedio + vendedores)
        const { data: cad, error: cadErr } = await supabase
          .from("cadastros")
          .select("lojas, vendedores")
          .eq("user_id", uid)
          .limit(1)
          .single();
        if (cadErr) throw cadErr;

        const lojasDb = ((cad?.lojas ?? []) as Loja[]) || [];
        const vendedoresDb = ((cad?.vendedores ?? []) as Vendedor[]) || [];
        setLojas(lojasDb);
        setVendedores(vendedoresDb);

        // 2) Registros dos últimos 60 dias, projetando apenas colunas necessárias
        const sinceStr = dateOnly(addDays(new Date(), -60).toISOString());
        const { data: regs, error: regsErr } = await supabase
          .from("registros")
          .select("id, vendedorId, lojaId, data, user_id, vendas, atendimentos")
          .eq("user_id", uid)
          .gte("data", sinceStr)
          .lte("data", today);
        if (regsErr) throw regsErr;

        const vendasData = (regs || []).map((r: any) => ({ ...r, data: dateOnly(r.data) })) as Venda[];
        setVendas(vendasData);

        // 3) Tenta carregar insights do dia (cache)
        const { data: insRow, error: insErr } = await supabase
          .from("insights")
          .select("items")
          .eq("user_id", uid)
          .eq("date", today)
          .limit(1)
          .single();
        if (insErr && insErr.code !== 'PGRST116') throw insErr; // ignora not found

        if (insRow?.items) {
          setInsights(insRow.items as Insight[]);
        } else {
          // computa e salva
          const fresh = generateDailyInsights(vendasData, lojasDb, vendedoresDb);
          setInsights(fresh);
          await supabase
            .from("insights")
            .upsert(
              [{ user_id: uid, date: today, items: fresh, updated_at: new Date().toISOString() }],
              { onConflict: "user_id,date" }
            );
        }
      } catch (e: any) {
        console.error("InsightsIA: erro ao carregar dados", e);
        toast({ title: "Erro ao carregar insights", description: e?.message || String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [today]);

  const regenerate = async () => {
    if (!userId || regenLoading) return;
    setRegenLoading(true);
    try {
      const fresh = generateDailyInsights(vendas, lojas, vendedores);
      setInsights(fresh);
      const { error } = await supabase
        .from("insights")
        .upsert([{ user_id: userId, date: today, items: fresh, updated_at: new Date().toISOString() }], { onConflict: "user_id,date" });
      if (error) throw error;
      toast({ title: "Insights do dia atualizados!" });
    } catch (e: any) {
      console.error("InsightsIA: erro ao regerar", e);
      toast({ title: "Erro ao regerar insights", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-500" /> Insights da IA
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border rounded p-2 text-sm dark:bg-zinc-900 dark:text-white"
            value={today}
            onChange={(e) => setToday(e.target.value)}
          />
          <Button variant="outline" onClick={regenerate} title="Regerar os 5 insights do dia" disabled={regenLoading}>
            <RefreshCw className="w-4 h-4 mr-2" /> {regenLoading ? 'Regerando...' : 'Regerar'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando dados e gerando insights...</div>
      ) : insights.length === 0 ? (
        <div className="text-sm text-gray-500">Sem dados suficientes para gerar insights. Cadastre registros e defina ticket médio nas Lojas.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {insights.map((it) => (
            <li
              key={it.id}
              className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center rounded-full w-8 h-8 ${
                    it.tag === "alert"
                      ? "bg-rose-100 text-rose-700"
                      : it.tag === "opportunity"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700"
                  }`}>
                    {icons[it.icon]}
                  </span>
                  <h3 className="font-semibold">{it.title}</h3>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  it.tag === "alert"
                    ? "bg-rose-100 text-rose-700"
                    : it.tag === "opportunity"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                }`}>{it.tag === "alert" ? "Alerta" : it.tag === "opportunity" ? "Oportunidade" : "Insight"}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{it.description}</p>
              {it.metric && <p className="mt-2 text-xs text-gray-500">Métrica: {it.metric}</p>}
              {it.action && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (it.id === 'tickets' || (it.action || '').toLowerCase().includes('cadastros')) {
                        navigate('/cadastros');
                      }
                    }}
                  >
                    {it.action}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-10 text-xs text-gray-500">
        Os insights usam os seus dados dos últimos 7 dias e o <strong>ticket médio</strong> cadastrado por loja.
      </footer>
    </div>
  );
}

/* ================== Núcleo de geração (5 por dia) ================== */

function generateDailyInsights(vendas: Venda[], lojas: Loja[], vendedores: Vendedor[]): Insight[] {
  const today = new Date();
  const d7 = addDays(today, -6);
  const d14 = addDays(today, -13);

  const lojasMap = Object.fromEntries(lojas.map(l => [l.id, l]));
  const vendedoresMap = Object.fromEntries(vendedores.map(v => [v.id, v]));

  const last7 = vendas.filter(v => inRange(v.data, d7, today));
  const prev7 = vendas.filter(v => inRange(v.data, d14, addDays(today, -7)));

  // helpers
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);

  const at = (regs: Venda[]) => sum(regs.map(r => r.atendimentos || 0));
  const vd = (regs: Venda[]) => sum(regs.map(r => r.vendas || 0));
  const conv = (regs: Venda[]) => {
    const A = at(regs); const V = vd(regs);
    return A > 0 ? (V / A) * 100 : 0;
  };

  const convLast = conv(last7);
  const convPrev = conv(prev7);
  const trendDelta = convPrev > 0 ? ((convLast - convPrev) / convPrev) * 100 : (convLast > 0 ? 100 : 0);

  // por loja (últimos 7d)
  type Agg = { atend: number; vendas: number; perdidos: number; valorPerdido: number };
  const byLoja: Record<string, Agg> = {};
  const byVend: Record<string, Agg> = {};
  const byDow: Record<number, { atend: number; vendas: number }> = {};

  for (const r of last7) {
    const t = safe(lojasMap[r.lojaId]?.ticketMedio ?? 0);
    const perd = Math.max((r.atendimentos || 0) - (r.vendas || 0), 0);
    if (!byLoja[r.lojaId]) byLoja[r.lojaId] = { atend: 0, vendas: 0, perdidos: 0, valorPerdido: 0 };
    if (!byVend[r.vendedorId]) byVend[r.vendedorId] = { atend: 0, vendas: 0, perdidos: 0, valorPerdido: 0 };
    byLoja[r.lojaId].atend += r.atendimentos || 0;
    byLoja[r.lojaId].vendas += r.vendas || 0;
    byLoja[r.lojaId].perdidos += perd;
    byLoja[r.lojaId].valorPerdido += perd * t;

    byVend[r.vendedorId].atend += r.atendimentos || 0;
    byVend[r.vendedorId].vendas += r.vendas || 0;
    byVend[r.vendedorId].perdidos += perd;
    byVend[r.vendedorId].valorPerdido += perd * t;

    const dow = new Date(r.data).getDay(); // 0=Dom
    if (!byDow[dow]) byDow[dow] = { atend: 0, vendas: 0 };
    byDow[dow].atend += r.atendimentos || 0;
    byDow[dow].vendas += r.vendas || 0;
  }

  const worstStore = Object.entries(byLoja)
    .sort((a, b) => b[1].valorPerdido - a[1].valorPerdido)[0];
  const worstVend = Object.entries(byVend)
    .sort((a, b) => b[1].valorPerdido - a[1].valorPerdido)[0];

  // pior dia da semana
  const dowConv = Object.entries(byDow).map(([k, v]) => ({
    dow: Number(k),
    conv: v.atend > 0 ? (v.vendas / v.atend) * 100 : 0,
    atend: v.atend,
  })).sort((a, b) => a.conv - b.conv);
  const worstDow = dowConv[0];

  // tickets faltando?
  const lojasSemTicket = lojas.filter(l => !(typeof l.ticketMedio === "number" && l.ticketMedio > 0)).map(l => l.nome);

  // projeção +1pp
  const projMais1pp = sum(
    Object.entries(byLoja).map(([lojaId, agg]) => {
      const t = safe(lojasMap[lojaId]?.ticketMedio ?? 0);
      return (agg.atend * 0.01) * t; // +1 ponto percentual de conversão
    })
  );

  // monta os 5 insights
  const out: Insight[] = [];

  // 1) Tendência da conversão
  if (last7.length > 0) {
    out.push({
      id: "trend",
      title: trendDelta >= 0 ? "Conversão subiu" : "Conversão caiu",
      description:
        trendDelta >= 0
          ? `Sua conversão média nos últimos 7 dias foi ${convLast.toFixed(1)}%, ${Math.abs(trendDelta).toFixed(1)}% acima da semana anterior (${convPrev.toFixed(1)}%).`
          : `Sua conversão média nos últimos 7 dias foi ${convLast.toFixed(1)}%, ${Math.abs(trendDelta).toFixed(1)}% abaixo da semana anterior (${convPrev.toFixed(1)}%). Foque em abordagem e fechamento.`,
      tag: trendDelta >= 0 ? "info" : "alert",
      icon: trendDelta >= 0 ? "trendingUp" : "trendingDown",
      metric: `Últimos 7d: ${convLast.toFixed(1)}% • Semana anterior: ${convPrev.toFixed(1)}%`,
      action: trendDelta >= 0 ? "Replicar boas práticas desta semana" : "Reforçar script de abordagem"
    });
  }

  // 2) Loja com maior valor perdido
  if (worstStore) {
    const [lojaId, agg] = worstStore;
    out.push({
      id: "store_loss",
      title: `Maior valor perdido: ${lojasMap[lojaId]?.nome ?? "Loja"}`,
      description: `Estimativa de R$ ${brl(agg.valorPerdido)} em vendas perdidas nos últimos 7 dias (perdidos: ${agg.perdidos}).`,
      tag: "alert",
      icon: "store",
      metric: `Perdidos: ${agg.perdidos} • Ticket: ${brl(safe(lojasMap[lojaId]?.ticketMedio ?? 0))}`,
      action: "Revisar escala e abordagem nesta loja"
    });
  }

  // 3) Vendedor com maior valor perdido
  if (worstVend) {
    const [vendId, agg] = worstVend;
    const vend = vendedoresMap[vendId];
    const loja = vend ? lojasMap[vend.lojaId] : undefined;
    out.push({
      id: "seller_loss",
      title: `Vendedor com maior perda: ${vend?.nome ?? "Vendedor"}`,
      description: `Perdeu potencial de ${brl(agg.valorPerdido)} (perdidos: ${agg.perdidos}) nos últimos 7 dias.`,
      tag: "alert",
      icon: "users",
      metric: `Loja: ${loja?.nome ?? "-"} • Ticket: ${brl(safe(loja?.ticketMedio ?? 0))}`,
      action: "Fazer coaching 1:1 com simulação de objeções"
    });
  }

  // 4) Pior dia da semana
  if (worstDow && worstDow.atend >= 10) {
    const nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    out.push({
      id: "dow",
      title: `Dia fraco: ${nomes[worstDow.dow]}`,
      description: `Conversão de ${worstDow.conv.toFixed(1)}% no período. Ajuste escala/ações neste dia para capturar a demanda.`,
      tag: "opportunity",
      icon: "calendar",
      metric: `Atendimentos no dia: ${worstDow.atend}`,
      action: "Planejar campanha + reforço de equipe"
    });
  }

  // 5) Ticket médio pendente OU projeção +1pp
  if (lojasSemTicket.length > 0) {
    out.push({
      id: "tickets",
      title: "Ticket médio pendente",
      description: `Defina o ticket médio em Cadastros para: ${lojasSemTicket.slice(0,3).join(", ")}${lojasSemTicket.length>3?"…":""}. Sem isso, a estimativa de valor perdido fica subavaliada.`,
      tag: "alert",
      icon: "dollar",
      action: "Abrir Cadastros → Lojas"
    });
  } else {
    out.push({
      id: "plus1pp",
      title: "Meta rápida: +1pp de conversão",
      description: `Se a conversão subir 1 ponto percentual nos próximos 7 dias, a estimativa de ganho é de ${brl(projMais1pp)}.`,
      tag: "opportunity",
      icon: "target",
      action: "Definir micro-metas por loja e vendedor"
    });
  }

  // garante 5 (corta excesso) e sem negativos
  return out.slice(0, 5);
}