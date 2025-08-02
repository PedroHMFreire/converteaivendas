import { supabase } from './supabaseClient';
import { User, LoginData, RegisterData } from '@/types/auth';

const AUTH_STORAGE_KEY = 'converte_auth';

// Função auxiliar para transformar Supabase User em User do sistema
const mapSupabaseUser = (supabaseUser: any, extraData: any = {}): User => {
  return {
    id: supabaseUser.id,
    nome: extraData.nome || '',
    email: supabaseUser.email,
    empresa: extraData.empresa || '',
    telefone: extraData.telefone || '',
    plano: extraData.plano || 'trial',
    dataInicio: extraData.dataInicio || new Date().toISOString(),
    dataExpiracao: extraData.dataExpiracao || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
    ativo: extraData.ativo !== undefined ? extraData.ativo : true,
    lojasPermitidas: extraData.lojasPermitidas || [],
    createdAt: extraData.createdAt || new Date().toISOString()
  };
};

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
          dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
          ativo: true,
          lojasPermitidas: [],
          createdAt: new Date().toISOString()
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    // Salvar dados locais para consulta rápida (opcional)
    const user = mapSupabaseUser(data.user, data.user.user_metadata);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  // Login via Supabase Auth
  login: async (loginData: LoginData): Promise<User> => {
    const { email, senha } = loginData;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Email ou senha inválidos');
    }

    // Salvar dados locais para consulta rápida (opcional)
    const user = mapSupabaseUser(data.user, data.user.user_metadata);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  // Logout
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  // Usuário atual
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;
    const user = JSON.parse(data);

    // Checa expiração do trial
    if (user.plano === 'trial' && new Date() > new Date(user.dataExpiracao)) {
      user.ativo = false;
    }
    return user;
  },

  // Atualizar perfil (opcional)
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Usuário não encontrado');

    // Atualiza no Supabase (opcional: ajuste a tabela, se usar table extra)
    await supabase.auth.updateUser({
      data: userData
    });

    const updatedUser = { ...user, ...userData };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  // Verificar se tem acesso à loja
  hasAccessToLoja: (lojaId: string): boolean => {
    const user = authService.getCurrentUser();
    if (!user || !user.ativo) return false;
    if (user.lojasPermitidas.length === 0) return true;
    return user.lojasPermitidas.includes(lojaId);
  },

  // Verificar se período de teste expirou
  isTrialExpired: (): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return true;
    if (user.plano === 'trial') {
      return new Date() > new Date(user.dataExpiracao);
    }
    return false;
  },

  // Dias restantes do trial
  getTrialDaysLeft: (): number => {
    const user = authService.getCurrentUser();
    if (!user || user.plano !== 'trial') return 0;
    const now = new Date();
    const expiration = new Date(user.dataExpiracao);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
};
