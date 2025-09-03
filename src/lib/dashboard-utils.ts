
import { supabase } from "@/lib/supabaseClient";

// Tipos auxiliares
export type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor?: number;
  data: string;        // YYYY-MM-DD preferencialmente
  user_id: string;
  vendas: number;      // 1 = venda efetivada, 0 = só atendimento
  atendimentos: number; // número de atendimentos
};

export type Loja = { id: string; nome: string };
export type Vendedor = { id: string; nome: string; lojaId: string };

export type DashboardData = {
  totalAtendimentos: number;
  totalVendas: number;
  conversaoGeral: number;
  atendimentosVendasPorDia: { data: string; atendimentos: number; vendas: number }[];
  vendasPorVendedor: { nome: string; vendas: number }[];
  atendimentosPorVendedor: { nome: string; atendimentos: number }[];
  diasDaSemana: { dia: string; atendimentos: number; vendas: number }[];
  conversaoPorLoja: { nome: string; conversao: number }[];
  rankingConversao: { id: string; nome: string; lojaNome: string; atendimentos: number; vendas: number; conversao: number }[];
  melhorVendedor: string;
  melhorLoja: string;
};

// ===== Helpers de data (sem timezone/UTC flip) =====
export const dateOnly = (d: string) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const nd = new Date(d);
  const local = new Date(nd.getFullYear(), nd.getMonth(), nd.getDate());
  return local.toISOString().split("T")[0];
};

const parseLocal = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const pct1 = (n: number) => Number(n.toFixed(1));

// ===== LocalStorage helpers (guard: browser only) =====
function getLocalKey(entity: string, userId: string) {
  return `converte:${entity}:${userId}`;
}

export function carregarLocais<T>(entity: string, userId: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getLocalKey(entity, userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ===== CALC =====
export function calculateDashboardData(
  userId: string,
  dataInicio?: string,
  dataFim?: string,
  vendasArg?: Venda[],
  lojasArg?: Loja[],
  vendedoresArg?: Vendedor[]
): DashboardData {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = dateOnly(dataInicio || inicioMes.toISOString().split("T")[0]);
  const fim = dateOnly(dataFim || new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString().split("T")[0]);

  // Dados fornecidos (já vindos do Supabase) com normalização de data
  const vendasRaw: Venda[] = (vendasArg ?? [])
    .map(v => ({ ...v, data: dateOnly(v.data) }))
    .filter(v => {
      const dv = parseLocal(v.data);
      return dv >= parseLocal(inicio) && dv <= parseLocal(fim);
    });

  const lojas: Loja[] = lojasArg ?? [];
  const vendedores: Vendedor[] = vendedoresArg ?? [];

  // Totais
  const totalAtendimentos = vendasRaw.reduce((acc, v) => acc + (v.atendimentos || 0), 0);
  const totalVendas = vendasRaw.reduce((acc, v) => acc + (v.vendas || 0), 0);
  const conversaoGeral = totalAtendimentos > 0 ? pct1((totalVendas / totalAtendimentos) * 100) : 0;

  // Por dia
  const dias: Record<string, { data: string; atendimentos: number; vendas: number }> = {};
  for (const v of vendasRaw) {
    if (!dias[v.data]) dias[v.data] = { data: v.data, atendimentos: 0, vendas: 0 };
    dias[v.data].atendimentos += v.atendimentos || 0;
    dias[v.data].vendas += v.vendas || 0;
  }
  const atendimentosVendasPorDia = Object.values(dias).sort((a, b) => a.data.localeCompare(b.data));

  // Por vendedor
  const vendasPorVendedor = vendedores
    .map((vend) => ({
      nome: vend.nome,
      vendas: vendasRaw.filter((vd) => vd.vendedorId === vend.id)
        .reduce((acc, vd) => acc + (vd.vendas || 0), 0),
    }))
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 6);

  const atendimentosPorVendedor = vendedores
    .map((vend) => ({
      nome: vend.nome,
      atendimentos: vendasRaw.filter((vd) => vd.vendedorId === vend.id)
        .reduce((acc, vd) => acc + (vd.atendimentos || 0), 0),
    }))
    .sort((a, b) => b.atendimentos - a.atendimentos)
    .slice(0, 6);

  // Dia da semana (0-dom..6-sáb) — somente os campos do tipo
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => {
    const at = vendasRaw.filter((v) => parseLocal(v.data).getDay() === i)
      .reduce((acc, v) => acc + (v.atendimentos || 0), 0);
    const vd = vendasRaw.filter((v) => parseLocal(v.data).getDay() === i)
      .reduce((acc, v) => acc + (v.vendas || 0), 0);
    return { dia: String(i), atendimentos: at, vendas: vd };
  });

  // Conversão por loja
  const conversaoPorLoja = lojas.map((l) => {
    const at = vendasRaw.filter((v) => v.lojaId === l.id).reduce((acc, v) => acc + (v.atendimentos || 0), 0);
    const vd = vendasRaw.filter((v) => v.lojaId === l.id).reduce((acc, v) => acc + (v.vendas || 0), 0);
    return { nome: l.nome, conversao: at > 0 ? pct1((vd / at) * 100) : 0 };
  }).sort((a,b) => b.conversao - a.conversao);

  // Ranking por conversão — com mínimo de volume
  const MIN_AT = 3;
  const rankingConversao = vendedores
    .map((vend) => {
      const at = vendasRaw.filter((vd) => vd.vendedorId === vend.id).reduce((acc, vd) => acc + (vd.atendimentos || 0), 0);
      const vd = vendasRaw.filter((vd) => vd.vendedorId === vend.id).reduce((acc, vd) => acc + (vd.vendas || 0), 0);
      const loja = lojas.find((l) => l.id === vend.lojaId);
      const conv = at > 0 ? (vd / at) * 100 : 0;
      return { id: vend.id, nome: vend.nome, lojaNome: loja?.nome ?? "-", atendimentos: at, vendas: vd, conversao: pct1(conv) };
    })
    .filter(r => r.atendimentos >= MIN_AT)
    .sort((a, b) => b.conversao - a.conversao)
    .slice(0, 6);

  const melhorVendedor = rankingConversao[0]?.nome ?? "-";
  const melhorLoja = conversaoPorLoja[0]?.nome ?? "-";

  return {
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    atendimentosVendasPorDia,
    vendasPorVendedor,
    atendimentosPorVendedor,
    diasDaSemana,
    conversaoPorLoja,
    rankingConversao,
    melhorVendedor,
    melhorLoja,
  };
}

// ===== Conveniências =====
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  const d = parseLocal(dateString);
  return d.toLocaleDateString("pt-BR");
};

// ===== Busca do Supabase e cálculo em um único passo (opcional) =====
export async function getDashboardData(userId: string, dataInicio?: string, dataFim?: string): Promise<DashboardData> {
  let vendas: Venda[] = [];
  let lojas: Loja[] = [];
  let vendedores: Vendedor[] = [];

  const { data: regs, error: regsError } = await supabase
    .from("registros")
    .select("*")
    .eq("user_id", userId);

  if (!regsError && Array.isArray(regs)) {
    vendas = regs.map((r: any) => ({ ...r, data: `${r.data}`.slice(0,10) }));
  }

  const { data: cad, error: cadErr } = await supabase
    .from("cadastros")
    .select("lojas, vendedores")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!cadErr && cad) {
    lojas = cad.lojas || [];
    vendedores = cad.vendedores || [];
  }

  return calculateDashboardData(userId, dataInicio, dataFim, vendas, lojas, vendedores);
}

// ===== Reimplementação pedida por 'Cadastros': backupLocalData =====
// Persiste no Supabase o estado local (lojas, vendedores e vendas) —
// usando as tabelas existentes: 'cadastros' e 'vendas_backup'.
export async function backupLocalData(userId: string | null) {
  if (!userId) return;
  try {
    const lojas = carregarLocais<Loja>("lojas", userId);
    const vendedores = carregarLocais<Vendedor>("vendedores", userId);
    const vendas = carregarLocais<Venda>("vendas", userId);
    const updatedAt = new Date().toISOString();

    const cadastrosPromise = supabase
      .from("cadastros")
      .upsert([{ user_id: userId, lojas, vendedores, updated_at: updatedAt }], { onConflict: "user_id" });

    const vendasPromise = supabase
      .from("vendas_backup")
      .upsert([{ user_id: userId, vendas, updated_at: updatedAt }], { onConflict: "user_id" });

    const [{ error: cadError }, { error: vendasError }] = await Promise.all([cadastrosPromise, vendasPromise]);

    if (cadError) throw cadError;
    if (vendasError) throw vendasError;
  } catch (err) {
    console.error("Erro ao realizar backup:", err);
  }
}
