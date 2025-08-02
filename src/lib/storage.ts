// src/lib/storage.ts

import { supabase } from "@/lib/supabaseClient";
import { Loja, Vendedor, RegistroVenda } from "@/types";

/*
  Todas as funções agora exigem o userId do usuário autenticado.
  Exemplo de uso:
    const user = supabase.auth.getUser();
    const userId = user?.id;
    await storage.getLojas(userId);
*/

export const storage = {
  // Lojas
  getLojas: async (userId: string): Promise<Loja[]> => {
    const { data, error } = await supabase
      .from("lojas")
      .select("*")
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar lojas:", error);
      return [];
    }
    return data || [];
  },

  addLoja: async (loja: Loja, userId: string) => {
    const { error } = await supabase
      .from("lojas")
      .insert([{ ...loja, user_id: userId }]);
    if (error) console.error("Erro ao adicionar loja:", error);
  },

  setLojas: async (lojas: Loja[], userId: string) => {
    // (não recomendado sobrescrever todas, mas para compatibilidade)
    await supabase.from("lojas").delete().eq("user_id", userId);
    if (lojas.length > 0) {
      const data = lojas.map((loja) => ({ ...loja, user_id: userId }));
      await supabase.from("lojas").insert(data);
    }
  },

  // Vendedores
  getVendedores: async (userId: string): Promise<Vendedor[]> => {
    const { data, error } = await supabase
      .from("vendedores")
      .select("*")
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar vendedores:", error);
      return [];
    }
    return data || [];
  },

  addVendedor: async (vendedor: Vendedor, userId: string) => {
    const { error } = await supabase
      .from("vendedores")
      .insert([{ ...vendedor, user_id: userId }]);
    if (error) console.error("Erro ao adicionar vendedor:", error);
  },

  setVendedores: async (vendedores: Vendedor[], userId: string) => {
    await supabase.from("vendedores").delete().eq("user_id", userId);
    if (vendedores.length > 0) {
      const data = vendedores.map((v) => ({ ...v, user_id: userId }));
      await supabase.from("vendedores").insert(data);
    }
  },

  getVendedoresByLoja: async (lojaId: string, userId: string): Promise<Vendedor[]> => {
    const { data, error } = await supabase
      .from("vendedores")
      .select("*")
      .eq("lojaId", lojaId)
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar vendedores por loja:", error);
      return [];
    }
    return data || [];
  },

  // Registros
  getRegistros: async (userId: string): Promise<RegistroVenda[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar registros:", error);
      return [];
    }
    return data || [];
  },

  addRegistro: async (registro: RegistroVenda, userId: string) => {
    const { error } = await supabase
      .from("registros")
      .insert([{ ...registro, user_id: userId }]);
    if (error) console.error("Erro ao adicionar registro:", error);
  },

  setRegistros: async (registros: RegistroVenda[], userId: string) => {
    await supabase.from("registros").delete().eq("user_id", userId);
    if (registros.length > 0) {
      const data = registros.map((r) => ({ ...r, user_id: userId }));
      await supabase.from("registros").insert(data);
    }
  },

  getRegistrosByPeriodo: async (dataInicio: string, dataFim: string, userId: string): Promise<RegistroVenda[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar registros por período:", error);
      return [];
    }
    return data || [];
  },

  getRegistrosByVendedor: async (vendedorId: string, userId: string): Promise<RegistroVenda[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .eq("vendedorId", vendedorId)
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar registros por vendedor:", error);
      return [];
    }
    return data || [];
  },

  getRegistrosByLoja: async (lojaId: string, userId: string): Promise<RegistroVenda[]> => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .eq("lojaId", lojaId)
      .eq("user_id", userId);
    if (error) {
      console.error("Erro ao buscar registros por loja:", error);
      return [];
    }
    return data || [];
  },
};
