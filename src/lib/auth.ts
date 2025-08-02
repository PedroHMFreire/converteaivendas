import { supabase } from './supabaseClient';
import { User, LoginData, RegisterData } from '@/types/auth';

// Função para transformar Supabase User em User do sistema
const mapSupabaseUser = (supabaseUser: any, extraData: any = {}): User => ({
  id: supabaseUser.id,
  nome: extraData.nome || '',
  email: supabaseUser.email,
  empresa: extraData.empresa || '',
  telefone: extraData.telefone || '',
  plano: extraData.plano || 'trial',
  dataInicio: extraData.dataInicio || new Date().toISOString(),
  dataExpiracao: extraData.dataExpiracao || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  ativo: extraData.ativo !== undefined ? extraData.ativo : true,
  lojasPermitidas: extraData.lojasPermitidas || [],
  createdAt: extraData.createdAt || new Date().toISOString(),
});

export const authService = {
  // Registrar novo usuário no Supabase Auth
  register: async (registerData: RegisterData): Promise<User> => {
    const { email, senha, nome, empresa, telefone } = registerData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          empresa,
          telefone,
          plano: 'trial',
          dataInicio: new Date().toISOString(),
          dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ativo: true,
          lojasPermitidas: [],
          createdAt: new Date().toISOString(),
        },
      },
    });

    if (error) throw new Error(error.message);

    // Retornar usuário logado do supabase
    const user = mapSupabaseUser(data.user, data.user.user_metadata);
    return user;
  },

  // Login via Supabase Auth
  login: async (loginData: LoginData): Promise<User> => {
    const { email, senha } = loginData;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error || !data.user) throw new Error(error?.message || 'Email ou senha inválidos');

    // Buscar dados do usuário autenticado
    const user = mapSupabaseUser(data.user, data.user.user_metadata);
    return user;
  },

  // Logout
  logout: async () => {
    await supabase.auth.signOut();
  },

  // Usuário atual (do Supabase, não do localStorage)
  getCurrentUser: async (): Promise<User | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    // Pega também os metadados
    return mapSupabaseUser(data.user, data.user.user_metadata);
  },

  // Atualizar perfil
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const { data, error } = await supabase.auth.updateUser({
      data: userData,
    });
    if (error || !data.user) throw new Error('Erro ao atualizar perfil');
    return mapSupabaseUser(data.user, data.user.user_metadata);
  },

  // Verificar se tem acesso à loja
  hasAccessToLoja: async (lojaId: string): Promise<boolean> => {
    const user = await authService.getCurrentUser();
    if (!user || !user.ativo) return false;
    if (user.lojasPermitidas.length === 0) return true;
    return user.lojasPermitidas.includes(lojaId);
  },

  // Verificar se período de teste expirou
  isTrialExpired: async (): Promise<boolean> => {
    const user = await authService.getCurrentUser();
    if (!user) return true;
    if (user.plano === 'trial') {
      return new Date() > new Date(user.dataExpiracao);
    }
    return false;
  },

  // Dias restantes do trial
  getTrialDaysLeft: async (): Promise<number> => {
    const user = await authService.getCurrentUser();
    if (!user || user.plano !== 'trial') return 0;
    const now = new Date();
    const expiration = new Date(user.dataExpiracao);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
};
