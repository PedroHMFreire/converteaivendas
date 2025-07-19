export interface Loja {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  gerente: string;
  createdAt: string;
}

export interface Vendedor {
  id: string;
  nome: string;
  lojaId: string;
  email: string;
  telefone: string;
  meta: number;
  createdAt: string;
}

export interface RegistroVenda {
  id: string;
  vendedorId: string;
  lojaId: string;
  data: string;
  atendimentos: number;
  vendas: number;
  conversao: number;
  createdAt: string;
}

export interface DashboardData {
  totalAtendimentos: number;
  totalVendas: number;
  conversaoGeral: number;
  melhorVendedor: string;
  melhorLoja: string;
  conversaoPorDia: Array<{
    data: string;
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
  conversaoPorLoja: Array<{
    loja: string;
    conversao: number;
    atendimentos: number;
    vendas: number;
  }>;
}