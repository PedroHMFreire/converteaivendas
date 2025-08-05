// src/types/index.ts
export interface Loja {
  // Identification
  id: string;
  nome: string;

  // Contact
  gerente: string;
  telefone: string;

  // Address
  endereco: string;

  // Metadata
  createdAt: string;
}

export interface Vendedor {
  // Identification
  id: string;
  nome: string;

  // Contact
  email: string;
  telefone: string;

  // Store & goals
  lojaId: string;
  meta: number;

  // Metadata
  createdAt: string;
}

export interface RegistroVenda {
  // Identification
  id: string;
  vendedorId: string;
  lojaId: string;

  // Dates
  data: string;
  createdAt: string;

  // Metrics
  atendimentos: number;
  vendas: number;
  conversao: number;
}

export interface DashboardData {
  // Totals
  totalAtendimentos: number;
  totalVendas: number;
  conversaoGeral: number;

  // Best performers
  melhorVendedor: string;
  melhorLoja: string;

  // Breakdown
  conversaoPorDia: Array<{
    data: string;
    conversao: number;
    atendimentos: number;
    vendas: number;
  }>;
  conversaoPorLoja: Array<{
    loja: string;
    conversao: number;
    atendimentos: number;
    vendas: number;
  }>;
  conversaoPorVendedor: Array<{
    vendedor: string;
    conversao: number;
    atendimentos: number;
    vendas: number;
  }>;
}
