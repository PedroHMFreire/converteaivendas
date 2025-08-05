// src/types/auth.ts
export interface User {
  // Identity & contact
  id: string;
  nome: string;
  email: string;
  telefone: string;

  // Company info
  empresa: string;
  lojasPermitidas: string[];

  // Plan details
  plano: 'trial' | 'basic' | 'premium';
  dataInicio: string;
  dataExpiracao: string;
  ativo: boolean;

  // Metadata
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
  telefone: string;
  empresa: string;
  senha: string;
}

export interface PlanoPreco {
  // Identification
  id: string;
  nome: string;

  // Pricing
  preco: number;
  periodo: 'mensal' | 'anual';
  popular?: boolean;

  // Limits and resources
  recursos: string[];
  maxLojas: number;
  maxVendedores: number;
}