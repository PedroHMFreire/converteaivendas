// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// ⚠️ FRONT-END: use somente ANON KEY aqui
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Configurações para evitar perda de sessão no SPA (dev e prod)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // mantém sessão no localStorage
    autoRefreshToken: true,      // renova token automaticamente
    detectSessionInUrl: true,    // trata ?access_token no callback (se houver)
    storageKey: 'converteai.auth', // nomes únicos evitam conflito em multi-apps
  },
});
