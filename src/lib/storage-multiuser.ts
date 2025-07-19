import { Loja, Vendedor, RegistroVenda } from '@/types';
import { authService } from './auth';

const getUserStorageKey = (key: string): string => {
  const user = authService.getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');
  return `${key}_${user.id}`;
};

export const userStorage = {
  // Lojas
  getLojas: (): Loja[] => {
    try {
      const data = localStorage.getItem(getUserStorageKey('converte_lojas'));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setLojas: (lojas: Loja[]) => {
    localStorage.setItem(getUserStorageKey('converte_lojas'), JSON.stringify(lojas));
  },

  addLoja: (loja: Loja) => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const lojas = userStorage.getLojas();
    
    // Verificar limite
    if (!authService.checkLimits(user, 'lojas', lojas.length)) {
      throw new Error(`Limite de ${user.limites.lojas} lojas atingido. Faça upgrade do seu plano.`);
    }
    
    lojas.push(loja);
    userStorage.setLojas(lojas);
  },

  // Vendedores
  getVendedores: (): Vendedor[] => {
    try {
      const data = localStorage.getItem(getUserStorageKey('converte_vendedores'));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setVendedores: (vendedores: Vendedor[]) => {
    localStorage.setItem(getUserStorageKey('converte_vendedores'), JSON.stringify(vendedores));
  },

  addVendedor: (vendedor: Vendedor) => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const vendedores = userStorage.getVendedores();
    
    // Verificar limite
    if (!authService.checkLimits(user, 'vendedores', vendedores.length)) {
      throw new Error(`Limite de ${user.limites.vendedores} vendedores atingido. Faça upgrade do seu plano.`);
    }
    
    vendedores.push(vendedor);
    userStorage.setVendedores(vendedores);
  },

  getVendedoresByLoja: (lojaId: string): Vendedor[] => {
    return userStorage.getVendedores().filter(v => v.lojaId === lojaId);
  },

  // Registros
  getRegistros: (): RegistroVenda[] => {
    try {
      const data = localStorage.getItem(getUserStorageKey('converte_registros'));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setRegistros: (registros: RegistroVenda[]) => {
    localStorage.setItem(getUserStorageKey('converte_registros'), JSON.stringify(registros));
  },

  addRegistro: (registro: RegistroVenda) => {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const registros = userStorage.getRegistros();
    
    // Verificar limite mensal
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    const registrosMes = registros.filter(r => r.data.startsWith(mesAtual));
    
    if (!authService.checkLimits(user, 'registros', registrosMes.length)) {
      throw new Error(`Limite de ${user.limites.registrosPorMes} registros por mês atingido. Faça upgrade do seu plano.`);
    }
    
    registros.push(registro);
    userStorage.setRegistros(registros);
  },

  getRegistrosByPeriodo: (dataInicio: string, dataFim: string): RegistroVenda[] => {
    return userStorage.getRegistros().filter(r => 
      r.data >= dataInicio && r.data <= dataFim
    );
  },

  getRegistrosByVendedor: (vendedorId: string): RegistroVenda[] => {
    return userStorage.getRegistros().filter(r => r.vendedorId === vendedorId);
  },

  getRegistrosByLoja: (lojaId: string): RegistroVenda[] => {
    return userStorage.getRegistros().filter(r => r.lojaId === lojaId);
  }
};