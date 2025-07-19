export interface User {
  id: string;
  email: string;
  nome: string;
  empresa: string;
  telefone: string;
  plano: 'trial' | 'basico' | 'profissional' | 'enterprise';
  dataRegistro: string;
  dataVencimento: string;
  status: 'ativo' | 'vencido' | 'cancelado';
  limites: {
    lojas: number;
    vendedores: number;
    registrosPorMes: number;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  periodo: 'mensal' | 'anual';
  descricao: string;
  recursos: string[];
  limites: {
    lojas: number;
    vendedores: number;
    registrosPorMes: number;
  };
  popular?: boolean;
}