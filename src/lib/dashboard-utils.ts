import { storage } from './storage';
import { DashboardData, Loja, Vendedor, RegistroVenda } from '@/types';

export const calculateDashboardData = (
  dataInicio?: string,
  dataFim?: string
): DashboardData => {
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const inicio = dataInicio || inicioMes;
  const fim = dataFim || hoje;

  const registros = storage.getRegistrosByPeriodo(inicio, fim);
  const lojas = storage.getLojas();
  const vendedores = storage.getVendedores();

  const totalAtendimentos = registros.reduce((sum, r) => sum + r.atendimentos, 0);
  const totalVendas = registros.reduce((sum, r) => sum + r.vendas, 0);
  const conversaoGeral = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

  // Conversão por vendedor
  const vendedorStats = vendedores.map(vendedor => {
    const registrosVendedor = registros.filter(r => r.vendedorId === vendedor.id);
    const atendimentos = registrosVendedor.reduce((sum, r) => sum + r.atendimentos, 0);
    const vendas = registrosVendedor.reduce((sum, r) => sum + r.vendas, 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      vendedor: vendedor.nome,
      conversao,
      atendimentos,
      vendas
    };
  });

  // Conversão por loja
  const lojaStats = lojas.map(loja => {
    const registrosLoja = registros.filter(r => r.lojaId === loja.id);
    const atendimentos = registrosLoja.reduce((sum, r) => sum + r.atendimentos, 0);
    const vendas = registrosLoja.reduce((sum, r) => sum + r.vendas, 0);
    const conversao = atendimentos > 0 ? (vendas / atendimentos) * 100 : 0;

    return {
      loja: loja.nome,
      conversao,
      atendimentos,
      vendas
    };
  });

  // Conversão por dia
  const diasUnicos = [...new Set(registros.map(r => r.data))].sort();
  const conversaoPorDia = diasUnicos.map(data => {
    const registrosDia = registros.filter(r => r.data === data);
    const atendimentos = registrosDia.reduce((sum, r) => sum + r.atendimentos, 0);
    const vendas = registrosDia.reduce((sum, r) => sum + r.vendas, 0);
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

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};