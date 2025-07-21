export interface User {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  plano: 'trial' | 'basic' | 'premium';
  dataInicio: string;
  dataExpiracao: string;
  ativo: boolean;
  lojasPermitidas: string[];
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginData {
  email: string;
  senha: string;
}

export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
  empresa: string;
  telefone: string;
}

export interface PlanoPreco {
  id: string;
  nome: string;
  preco: number;
  periodo: 'mensal' | 'anual';
  recursos: string[];
  maxLojas: number;
  maxVendedores: number;
  popular?: boolean;
}