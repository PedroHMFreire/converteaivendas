import { Loja, Vendedor, RegistroVenda } from '@/types';

const STORAGE_KEYS = {
  LOJAS: 'converte_lojas',
  VENDEDORES: 'converte_vendedores',
  REGISTROS: 'converte_registros',
  USER: 'converte_user' // (opcional, para facilitar leitura do usuário)
};

// Função para obter o ID único do usuário logado
function getCurrentUserId(): string {
  // Adapte para o seu sistema!
  // Se salva usuário no localStorage ao logar:
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
  // Tente usar id, se não tiver, use email (NÃO use nome)
  return user?.id || user?.email || '';
}

export const storage = {
  // Lojas
  getLojas: (): Loja[] => {
    const userId = getCurrentUserId();
    const data = localStorage.getItem(`${STORAGE_KEYS.LOJAS}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  setLojas: (lojas: Loja[]) => {
    const userId = getCurrentUserId();
    localStorage.setItem(`${STORAGE_KEYS.LOJAS}_${userId}`, JSON.stringify(lojas));
  },

  addLoja: (loja: Loja) => {
    const lojas = storage.getLojas();
    lojas.push(loja);
    storage.setLojas(lojas);
  },

  // Vendedores
  getVendedores: (): Vendedor[] => {
    const userId = getCurrentUserId();
    const data = localStorage.getItem(`${STORAGE_KEYS.VENDEDORES}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  setVendedores: (vendedores: Vendedor[]) => {
    const userId = getCurrentUserId();
    localStorage.setItem(`${STORAGE_KEYS.VENDEDORES}_${userId}`, JSON.stringify(vendedores));
  },

  addVendedor: (vendedor: Vendedor) => {
    const vendedores = storage.getVendedores();
    vendedores.push(vendedor);
    storage.setVendedores(vendedores);
  },

  getVendedoresByLoja: (lojaId: string): Vendedor[] => {
    return storage.getVendedores().filter(v => v.lojaId === lojaId);
  },

  // Registros
  getRegistros: (): RegistroVenda[] => {
    const userId = getCurrentUserId();
    const data = localStorage.getItem(`${STORAGE_KEYS.REGISTROS}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  setRegistros: (registros: RegistroVenda[]) => {
    const userId = getCurrentUserId();
    localStorage.setItem(`${STORAGE_KEYS.REGISTROS}_${userId}`, JSON.stringify(registros));
  },

  addRegistro: (registro: RegistroVenda) => {
    const registros = storage.getRegistros();
    registros.push(registro);
    storage.setRegistros(registros);
  },

  getRegistrosByPeriodo: (dataInicio: string, dataFim: string): RegistroVenda[] => {
    return storage.getRegistros().filter(r => 
      r.data >= dataInicio && r.data <= dataFim
    );
  },

  getRegistrosByVendedor: (vendedorId: string): RegistroVenda[] => {
    return storage.getRegistros().filter(r => r.vendedorId === vendedorId);
  },

  getRegistrosByLoja: (lojaId: string): RegistroVenda[] => {
    return storage.getRegistros().filter(r => r.lojaId === lojaId);
  }
};

// **Dica extra:**  
// Certifique-se que, ao fazer login, salve o objeto do usuário em localStorage:
// Exemplo: localStorage.setItem('converte_user', JSON.stringify({ id, email, ... }))
// E, ao deslogar, limpe com localStorage.removeItem('converte_user');
