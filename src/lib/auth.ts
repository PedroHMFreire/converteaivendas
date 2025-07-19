import { User, AuthState } from '@/types/auth';

const AUTH_STORAGE_KEY = 'converte_auth';
const USERS_STORAGE_KEY = 'converte_users';

export const authService = {
  // Obter usuário atual
  getCurrentUser: (): User | null => {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) return null;
    
    const { userId } = JSON.parse(authData);
    const users = authService.getAllUsers();
    return users.find(u => u.id === userId) || null;
  },

  // Obter todos os usuários
  getAllUsers: (): User[] => {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Salvar usuários
  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  },

  // Registrar novo usuário
  register: (userData: Omit<User, 'id' | 'dataRegistro' | 'dataVencimento' | 'status' | 'plano' | 'limites'>): User => {
    const users = authService.getAllUsers();
    
    // Verificar se email já existe
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email já cadastrado');
    }

    const dataRegistro = new Date().toISOString();
    const dataVencimento = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    const newUser: User = {
      id: Date.now().toString(),
      ...userData,
      plano: 'trial',
      dataRegistro,
      dataVencimento,
      status: 'ativo',
      limites: {
        lojas: 3,
        vendedores: 15,
        registrosPorMes: 500
      }
    };

    users.push(newUser);
    authService.saveUsers(users);
    
    // Fazer login automático
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: newUser.id }));
    
    return newUser;
  },

  // Login
  login: (email: string, senha: string): User => {
    const users = authService.getAllUsers();
    
    // Para demo, aceitar qualquer senha para emails cadastrados
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Email não encontrado');
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: user.id }));
    return user;
  },

  // Logout
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  // Atualizar usuário
  updateUser: (userId: string, updates: Partial<User>): User => {
    const users = authService.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado');
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    authService.saveUsers(users);
    
    return users[userIndex];
  },

  // Verificar se está no período de teste
  isTrialExpired: (user: User): boolean => {
    return new Date() > new Date(user.dataVencimento);
  },

  // Verificar limites
  checkLimits: (user: User, type: 'lojas' | 'vendedores' | 'registros', current: number): boolean => {
    return current < user.limites[type === 'registros' ? 'registrosPorMes' : type];
  }
};

// Planos disponíveis
export const PLANOS = [
  {
    id: 'basico',
    nome: 'Básico',
    preco: 97,
    periodo: 'mensal' as const,
    descricao: 'Ideal para pequenas empresas',
    recursos: [
      'Até 5 lojas',
      'Até 25 vendedores',
      'Dashboard completo',
      'Relatórios básicos',
      'Suporte por email'
    ],
    limites: {
      lojas: 5,
      vendedores: 25,
      registrosPorMes: 1000
    }
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 197,
    periodo: 'mensal' as const,
    descricao: 'Para empresas em crescimento',
    recursos: [
      'Até 20 lojas',
      'Até 100 vendedores',
      'Dashboard avançado',
      'Relatórios completos',
      'Exportação de dados',
      'Suporte prioritário'
    ],
    limites: {
      lojas: 20,
      vendedores: 100,
      registrosPorMes: 5000
    },
    popular: true
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 397,
    periodo: 'mensal' as const,
    descricao: 'Para grandes redes',
    recursos: [
      'Lojas ilimitadas',
      'Vendedores ilimitados',
      'Dashboard personalizado',
      'Relatórios avançados',
      'API completa',
      'Suporte 24/7',
      'Gerente de conta'
    ],
    limites: {
      lojas: 999,
      vendedores: 9999,
      registrosPorMes: 50000
    }
  }
];