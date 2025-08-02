// src/lib/dashboard-utils.ts

import { supabase } from './supabaseClient';
import { DashboardData, Loja, Vendedor, RegistroVenda } from '@/types';

/**
 * Calcula os dados do dashboard: conversão geral, por vendedor, por loja, etc.
 */
export const calculateDashboardData = async (
  userId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<DashboardData> => {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const inicio = dataInicio || inicioMes;
  const fim = dataFim || hoje;

  // Buscar registros do período
  const { data: registrosRaw = [] } = await supabase
    .from('registro_vendas')
    .select('*')
    .eq('user_id', userId)
    .gte('data', inicio)
    .lte('data', fim);

  // Garantir que registros seja array válido
  const registros: RegistroVenda[] = Array.isArray(registrosRaw) ? (registrosRaw as any[]) : [];

  // Buscar lojas e vendedores
  const { data: lojasRaw = [] } = await supabase
    .from('lojas')
    .select('*')
    .eq('user_id', userId);

  const { data: vendedoresRaw = [] } = await supabase
    .from('vendedores')
    .select('*')
    .eq('user_id', userId);

  const lojas: Loja[] = Array.isArray(lojasRaw) ? (lojasRaw as any[]) : [];
  const vendedores: Vendedor[] = Array.isArray(vendedoresRaw) ? (vendedoresRaw as any[]) : [];

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
      vendas,
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
      vendas,
    };
  });

  // Conversão por dia
  const diasUnicos = [...new Set(registros.map((r: RegistroVenda) => r.data))].sort();
  const conversaoPorDia = diasUnicos.map((data) => {
    const registrosDia = registros.filter((r: RegistroVenda) => r.data === data);
    const atendimentos = registrosDia.reduce((sum: number, r: RegistroVenda) => sum + (r.atendimentos || 0), 0);
    const vendas = registrosDia.reduce((sum: number, r: RegistroVenda) => sum + (r.vendas || 0), 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      data,
      conversao,
      atendimentos,
      vendas,
    };
  });

  const melhorVendedor =
    vendedorStats.length > 0
      ? vendedorStats.reduce((prev, current) => (prev.conversao > current.conversao ? prev : current)).vendedor
      : 'N/A';

  const melhorLoja =
    lojaStats.length > 0
      ? lojaStats.reduce((prev, current) => (prev.conversao > current.conversao ? prev : current)).loja
      : 'N/A';

  return {
    conversaoGeral,
    totalAtendimentos,
    totalVendas,
    melhorVendedor,
    melhorLoja,
    conversaoPorDia,
    conversaoPorVendedor: vendedorStats.sort((a, b) => b.conversao - a.conversao),
    conversaoPorLoja: lojaStats.sort((a, b) => b.conversao - a.conversao),
  };
};

// Mesmas funções utilitárias (corrigidas)
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
