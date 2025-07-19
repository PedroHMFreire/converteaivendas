import { Loja, Vendedor, RegistroVenda } from '@/types';

const STORAGE_KEYS = {
  LOJAS: 'converte_lojas',
  VENDEDORES: 'converte_vendedores',
  REGISTROS: 'converte_registros'
};

export const storage = {
  // Lojas
  getLojas: (): Loja[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOJAS);
    return data ? JSON.parse(data) : [];
  },

  setLojas: (lojas: Loja[]) => {
    localStorage.setItem(STORAGE_KEYS.LOJAS, JSON.stringify(lojas));
  },

  addLoja: (loja: Loja) => {
    const lojas = storage.getLojas();
    lojas.push(loja);
    storage.setLojas(lojas);
  },

  // Vendedores
  getVendedores: (): Vendedor[] => {
    const data = localStorage.getItem(STORAGE_KEYS.VENDEDORES);
    return data ? JSON.parse(data) : [];
  },

  setVendedores: (vendedores: Vendedor[]) => {
    localStorage.setItem(STORAGE_KEYS.VENDEDORES, JSON.stringify(vendedores));
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
    const data = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    return data ? JSON.parse(data) : [];
  },

  setRegistros: (registros: RegistroVenda[]) => {
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(registros));
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