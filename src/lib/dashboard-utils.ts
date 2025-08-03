import { supabase } from "@/lib/supabaseClient";

// Tipos auxiliares (ajuste conforme seu modelo real)
type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor: number;
  data: string;
  user_id: string;
};

type Atendimento = {
  id: string;
  vendedorId: string;
  lojaId: string;
  data: string;
  user_id: string;
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
  ticketMedio: number;
  atendimentosVendasPorDia: any[];
  vendasPorVendedor: any[];
  atendimentosPorVendedor: any[];
  diasDaSemana: any[];
  conversaoPorLoja: any[];
  rankingConversao: any[];
};

// Utilitário para obter a chave localStorage por usuário e entidade
function getLocalKey(entity: string, userId: string) {
  return `converte:${entity}:${userId}`;
}

// Função para carregar dados locais de uma entidade
function carregarLocais<T>(entity: string, userId: string): T[] {
  const raw = localStorage.getItem(getLocalKey(entity, userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Função para sincronizar dados locais com Supabase (backup)
export async function sincronizarDashboardBackup(userId: string, dashboardData: DashboardData) {
  try {
    await supabase
      .from("dashboard_backup")
      .upsert([{ user_id: userId, dados: dashboardData, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar dashboard com banco:", err);
  }
}

/**
 * Calcula os dados do dashboard: conversão geral, por vendedor, por loja, etc.
 * Agora usando dados locais (offline-first).
 */
export const calculateDashboardData = (
  userId: string,
  dataInicio?: string,
  dataFim?: string
): DashboardData => {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const inicio = dataInicio || inicioMes;
  const fim = dataFim || hoje;

  // Buscar registros locais do período
  const vendas: Venda[] = carregarLocais<Venda>("vendas", userId).filter(
    (v) => v.data >= inicio && v.data <= fim
  );
  const atendimentos: Atendimento[] = carregarLocais<Atendimento>("atendimentos", userId).filter(
    (a) => a.data >= inicio && a.data <= fim
  );
  const lojas: Loja[] = carregarLocais<Loja>("lojas", userId);
  const vendedores: Vendedor[] = carregarLocais<Vendedor>("vendedores", userId);

  // Cálculos principais
  const totalAtendimentos = atendimentos.length;
  const totalVendas = vendas.length;
  const conversaoGeral = totalAtendimentos > 0 ? ((totalVendas / totalAtendimentos) * 100) : 0;
  const ticketMedio =
    totalVendas > 0 ? vendas.reduce((acc, v) => acc + v.valor, 0) / totalVendas : 0;

  // Atendimentos e vendas por dia
  const dias = {};
  for (const a of atendimentos) {
    if (!dias[a.data]) dias[a.data] = { data: a.data, atendimentos: 0, vendas: 0 };
    dias[a.data].atendimentos++;
  }
  for (const v of vendas) {
    if (!dias[v.data]) dias[v.data] = { data: v.data, atendimentos: 0, vendas: 0 };
    dias[v.data].vendas++;
  }
  const atendimentosVendasPorDia = Object.values(dias).sort(
    (a: any, b: any) => a.data.localeCompare(b.data)
  );

  // Vendas por vendedor
  const vendasPorVendedor = vendedores.map((v) => ({
    vendedorId: v.id,
    vendedor: v.nome,
    vendas: vendas.filter((vd) => vd.vendedorId === v.id).length,
  }));

  // Atendimentos por vendedor
  const atendimentosPorVendedor = vendedores.map((v) => ({
    vendedorId: v.id,
    vendedor: v.nome,
    atendimentos: atendimentos.filter((a) => a.vendedorId === v.id).length,
  }));

  // Melhor dia da semana (vendas por dia da semana)
  const diasDaSemana = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    dia: i,
    vendas: vendas.filter((v) => new Date(v.data).getDay() === i).length,
  }));

  // Conversão por loja
  const conversaoPorLoja = lojas.map((l) => {
    const at = atendimentos.filter((a) => a.lojaId === l.id).length;
    const vd = vendas.filter((v) => v.lojaId === l.id).length;
    return {
      lojaId: l.id,
      loja: l.nome,
      conversao: at > 0 ? ((vd / at) * 100) : 0,
    };
  });

  // Ranking de conversão por vendedor
  const rankingConversao = vendedores.map((v) => {
    const at = atendimentos.filter((a) => a.vendedorId === v.id).length;
    const vd = vendas.filter((venda) => venda.vendedorId === v.id).length;
    return {
      vendedorId: v.id,
      vendedor: v.nome,
      conversao: at > 0 ? ((vd / at) * 100) : 0,
    };
  }).sort((a, b) => b.conversao - a.conversao);

  return {
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    ticketMedio,
    atendimentosVendasPorDia,
    vendasPorVendedor,
    atendimentosPorVendedor,
    diasDaSemana,
    conversaoPorLoja,
    rankingConversao,
  };
};

// Mesmas funções utilitárias (corrigidas)
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  return d.toLocaleDateString("pt-BR");
};