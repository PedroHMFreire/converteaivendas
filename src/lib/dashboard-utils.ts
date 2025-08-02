// src/lib/dashboard-utils.ts

import { supabase } from './supabaseClient';
import { DashboardData, Loja, Vendedor, RegistroVenda } from '@/types';

export const calculateDashboardData = async (
  userId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<DashboardData> => {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const inicio = dataInicio || inicioMes;
  const fim = dataFim || hoje;

  // Buscando registros do período e do usuário
  const { data: registros = [] } = await supabase
    .from('registro_vendas')
    .select('*')
    .eq('user_id', userId)
    .gte('data', inicio)
    .lte('data', fim);

  const { data: lojas = [] } = await supabase
    .from('lojas')
    .select('*')
    .eq('user_id', userId);

  const { data: vendedores = [] } = await supabase
    .from('vendedores')
    .select('*')
    .eq('user_id', userId);

  const totalAtendimentos = registros.reduce((sum: number, r: RegistroVenda) => sum + (r.atendimentos || 0), 0);
  const totalVendas = registros.reduce((sum: number, r: RegistroVenda) => sum + (r.vendas || 0), 0);
  const conversaoGeral = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

  // Conversão por vendedor
  const vendedorStats = vendedores.map((vendedor: Vendedor) => {
    const registrosVendedor = registros.filter((r: RegistroVenda) => r.vendedorId === vendedor.id);
    const atendimentos = registrosVendedor.reduce((sum: number, r: RegistroVenda) => sum + (r.atendimentos || 0), 0);
    const vendas = registrosVendedor.reduce((sum: number, r: RegistroVenda) => sum + (r.vendas || 0), 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      vendedor: vendedor.nome,
      conversao,
      atendimentos,
      vendas
    };
  });

  // Conversão por loja
  const lojaStats = lojas.map((loja: Loja) => {
    const registrosLoja = registros.filter((r: RegistroVenda) => r.lojaId === loja.id);
    const atendimentos = registrosLoja.reduce((sum: number, r: RegistroVenda) => sum + (r.atendimentos || 0), 0);
    const vendas = registrosLoja.reduce((sum: number, r: RegistroVenda) => sum + (r.vendas || 0), 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      loja: loja.nome,
      conversao,
      atendimentos,
      vendas
    };
  });

  // Conversão por dia
  const diasUnicos = [...new Set(registros.map((r: RegistroVenda) => r.data))].sort();
  const conversaoPorDia = diasUnicos.map(data => {
    const registrosDia = registros.filter((r: RegistroVenda) => r.data === data);
    const atendimentos = registrosDia.reduce((sum: number, r: RegistroVenda) => sum + (r.atendimentos || 0), 0);
    const vendas = registrosDia.reduce((sum: number, r: RegistroVenda) => sum + (r.vendas || 0), 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      data,
      conversao,
      atendimentos,
      vendas
    };
  });

  // Corrigir o erro de reduce em arrays vazios
  const melhorVendedor = vendedorStats.length > 0 
    ? vendedorStats.reduce((prev, current) => 
        prev.conversao > current.conversao ? prev : current
      ).vendedor 
    : 'N/A';

  const melhorLoja = lojaStats.length > 0 
    ? lojaStats.reduce((prev, current) => 
        prev.conversao > current.conversao ? prev : current
      ).loja 
    : 'N/A';

  return {
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    melhorVendedor,
    melhorLoja,
    conversaoPorDia,
    conversaoPorVendedor: vendedorStats.sort((a, b) => b.conversao - a.conversao),
    conversaoPorLoja: lojaStats.sort((a, b) => b.conversao - a.conversao)
  };
};

// Mesmas funções utilitárias (podem manter)
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};
