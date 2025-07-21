import { User, LoginData, RegisterData } from '@/types/auth';

const AUTH_STORAGE_KEY = 'converte_auth';

export const authService = {
  // Verificar se usuário está logado
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return null;
    
    const user = JSON.parse(data);
    
    // Verificar se o período de teste expirou
    if (user.plano === 'trial' && new Date() > new Date(user.dataExpiracao)) {
      user.ativo = false;
    }
    
    return user;
  },

  // Login
  login: async (loginData: LoginData): Promise<User> => {
    // Simulação de login - em produção seria uma API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Usuário demo para teste
    if (loginData.email === 'demo@converte.com' && loginData.senha === '123456') {
      const user: User = {
        id: '1',
        nome: 'Usuário Demo',
        email: 'demo@converte.com',
        empresa: 'Empresa Demo',
        telefone: '(11) 99999-9999',
        plano: 'trial',
        dataInicio: new Date().toISOString(),
        dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        ativo: true,
        lojasPermitidas: [], // Vazio = acesso a todas
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return user;
    }
    
    throw new Error('Email ou senha inválidos');
  },

  // Registro
  register: async (registerData: RegisterData): Promise<User> => {
    // Simulação de registro - em produção seria uma API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user: User = {
      id: Date.now().toString(),
      nome: registerData.nome,
      email: registerData.email,
      empresa: registerData.empresa,
      telefone: registerData.telefone,
      plano: 'trial',
      dataInicio: new Date().toISOString(),
      dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      ativo: true,
      lojasPermitidas: [],
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  // Logout
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  // Atualizar perfil
  updateProfile: (userData: Partial<User>): User => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Usuário não encontrado');
    
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  // Verificar se tem acesso à loja
  hasAccessToLoja: (lojaId: string): boolean => {
    const user = authService.getCurrentUser();
    if (!user || !user.ativo) return false;
    
    // Se lojasPermitidas está vazio, tem acesso a todas
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