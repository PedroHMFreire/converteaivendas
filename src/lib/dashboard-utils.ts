import { supabase } from "@/lib/supabaseClient";

// Tipos auxiliares (ajuste conforme seu modelo real)
type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor?: number;
  data: string;
  user_id: string;
  vendas: number; // 1 para venda efetivada, 0 para só atendimento
};

type Loja = {
  id: string;
  nome: string;
};

type Vendedor = {
  id: string;
  nome: string;
  lojaId: string;
};

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

function getLocalKey(entity: string, userId: string) {
  return `converte:${entity}:${userId}`;
}

function carregarLocais<T>(entity: string, userId: string): T[] {
  const raw = localStorage.getItem(getLocalKey(entity, userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function backupLocalData(userId: string | null) {
  if (!userId) return;
  try {
    const lojas = carregarLocais<Loja>("lojas", userId);
    const vendedores = carregarLocais<Vendedor>("vendedores", userId);
    const vendas = carregarLocais<Venda>("vendas", userId);
    const updatedAt = new Date().toISOString();

    const cadastrosPromise = supabase
      .from("cadastros_backup")
      .upsert([{ user_id: userId, lojas, vendedores, updated_at: updatedAt }]);

    const vendasPromise = supabase
      .from("vendas_backup")
      .upsert([{ user_id: userId, vendas, updated_at: updatedAt }]);

    const [{ error: cadError }, { error: vendasError }] = await Promise.all([
      cadastrosPromise,
      vendasPromise,
    ]);

    if (cadError) throw cadError;
    if (vendasError) throw vendasError;
  } catch (err) {
    console.error("Erro ao realizar backup:", err);
  }
}

export const calculateDashboardData = (
  userId: string,
  dataInicio?: string,
  dataFim?: string
): DashboardData => {
  const hoje = new Date().toISOString().split("T")[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const inicio = dataInicio || inicioMes;
  const fim = dataFim || hoje;

  const vendasRaw: Venda[] = carregarLocais<Venda>("vendas", userId).filter(
    (v) => v.data >= inicio && v.data <= fim
  );
  const lojas: Loja[] = carregarLocais<Loja>("lojas", userId);
  const vendedores: Vendedor[] = carregarLocais<Vendedor>("vendedores", userId);

const totalAtendimentos = vendasRaw.reduce((acc, v) => acc + (v.atendimentos || 0), 0);
const totalVendas = vendasRaw.reduce((acc, v) => acc + (v.vendas || 0), 0);

  const conversaoGeral =
    totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

const dias: Record<string, { data: string; atendimentos: number; vendas: number }> = {};
for (const v of vendasRaw) {
  if (!dias[v.data]) dias[v.data] = { data: v.data, atendimentos: 0, vendas: 0 };
  dias[v.data].atendimentos += v.atendimentos || 0;
  dias[v.data].vendas += v.vendas || 0;
}

  const atendimentosVendasPorDia = Object.values(dias).sort((a, b) =>
    a.data.localeCompare(b.data)
  );

const vendasPorVendedor = vendedores
  .map((v) => ({
    nome: v.nome,
    vendas: vendasRaw
      .filter((vd) => vd.vendedorId === v.id)
      .reduce((acc, vd) => acc + (vd.vendas || 0), 0),
  }))
  .sort((a, b) => b.vendas - a.vendas)
  .slice(0, 6);

const atendimentosPorVendedor = vendedores
  .map((v) => ({
    nome: v.nome,
    atendimentos: vendasRaw
      .filter((vd) => vd.vendedorId === v.id)
      .reduce((acc, vd) => acc + (vd.atendimentos || 0), 0),
  }))
  .sort((a, b) => b.atendimentos - a.atendimentos)
  .slice(0, 6);

  const diasDaSemana = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const at = vendasRaw.filter((v) => new Date(v.data).getDay() === i)
    .reduce((acc, v) => acc + (v.atendimentos || 0), 0);
  const vd = vendasRaw.filter((v) => new Date(v.data).getDay() === i)
    .reduce((acc, v) => acc + (v.vendas || 0), 0);
  return {
    dia: i,
    conversao: at > 0 ? (vd / at) * 100 : 0,
    vendas: vd,
    atendimentos: at,
  };
});

const conversaoPorLoja = lojas.map((l) => {
  const at = vendasRaw.filter((v) => v.lojaId === l.id)
    .reduce((acc, v) => acc + (v.atendimentos || 0), 0);
  const vd = vendasRaw.filter((v) => v.lojaId === l.id)
    .reduce((acc, v) => acc + (v.vendas || 0), 0);
  return {
    nome: l.nome,
    conversao: at > 0 ? Number(((vd / at) * 100).toFixed(1)) : 0,
  };
});

const rankingConversao = vendedores
  .map((v) => {
    const at = vendasRaw.filter((vd) => vd.vendedorId === v.id)
      .reduce((acc, vd) => acc + (vd.atendimentos || 0), 0);
    const vd = vendasRaw.filter((vd) => vd.vendedorId === v.id)
      .reduce((acc, vd) => acc + (vd.vendas || 0), 0);
    const loja = lojas.find((l) => l.id === v.lojaId);
    return {
      id: v.id,
      nome: v.nome,
      lojaNome: loja?.nome ?? "-",
      atendimentos: at,
      vendas: vd,
      conversao: at > 0 ? (vd / at) * 100 : 0,
    };
  })
  .sort((a, b) => b.conversao - a.conversao)
  .slice(0, 6);

const melhorVendedor = rankingConversao.length > 0 ? rankingConversao[0].nome : "-";

const melhorLojaOrdenada = [...conversaoPorLoja].sort((a, b) => b.conversao - a.conversao);
const melhorLoja = melhorLojaOrdenada.length > 0 ? melhorLojaOrdenada[0].nome : "-";

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
};

export const formatPercentage = (value: number): string => {
  if (isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  return d.toLocaleDateString("pt-BR");
};
