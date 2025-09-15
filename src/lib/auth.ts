// src/lib/auth.ts
import { supabase } from '@/lib/supabaseClient';

export type AppPlan = 'trial' | 'basic' | 'premium' | 'unknown';

export type AppProfile = {
  user_id: string;
  email: string | null;
  plano: AppPlan;
  ativo: boolean | null;
  data_expiracao: string | null; // DATE no banco (string no client)
  mp_preapproval_id?: string | null;
  plano_recorrencia?: 'mensal' | 'trimestral' | 'anual' | null;
};

export type AppUser = {
  id: string;
  email: string | null;
  nome?: string | null;
  empresa?: string | null;
  plano?: AppPlan;
  dataExpiracao?: string | null;
};

/* -----------------------------------------------------------
   Helpers para aceitar 2 assinaturas:
   - login(email, password)
   - login({ email, password })
----------------------------------------------------------- */
type Creds = { email: string; password: string };

function normalizeCreds(a: string | Creds, b?: string): Creds {
  if (typeof a === 'object' && a !== null) {
    return {
      email: String((a as Creds).email ?? ''),
      password: String((a as Creds).password ?? ''),
    };
  }
  return { email: String(a ?? ''), password: String(b ?? '') };
}

/* -----------------------------------------------------------
   Autenticação
----------------------------------------------------------- */
async function login(a: string | Creds, b?: string) {
  const { email, password } = normalizeCreds(a, b);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data; // { user, session }
}

async function register(a: string | Creds, b?: string) {
  const { email, password } = normalizeCreds(a, b);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data; // { user, session }
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

/* -----------------------------------------------------------
   Sessão (usado pelo AuthGuard)
----------------------------------------------------------- */
async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

/* -----------------------------------------------------------
   Usuário atual + perfil (fonte da verdade no DB)
----------------------------------------------------------- */
async function getCurrentUser(): Promise<AppUser | null> {
  const { data: uData, error: uErr } = await supabase.auth.getUser();
  if (uErr || !uData?.user) return null;

  const uid = uData.user.id;
  const email = uData.user.email ?? null;

  // 🔥 FORÇAR refresh do cache do Supabase para garantir dados atualizados
  await supabase.from('profiles').select('*').eq('user_id', uid).single();

  const { data: pData } = await supabase
    .from('profiles')
    .select('user_id, email, plano, ativo, data_expiracao')
    .eq('user_id', uid)
    .single();

  const profile = (pData ?? null) as AppProfile | null;

  console.log("🔍 getCurrentUser: Dados do perfil", {
    userId: uid,
    plano: profile?.plano,
    dataExpiracao: profile?.data_expiracao,
    ativo: profile?.ativo
  });

  return {
    id: uid,
    email,
    plano: (profile?.plano ?? 'unknown') as AppPlan,
    dataExpiracao: profile?.data_expiracao ?? null,
    nome: (uData.user.user_metadata as any)?.nome ?? null,
    empresa: (uData.user.user_metadata as any)?.empresa ?? null,
  };
}

/* -----------------------------------------------------------
   Plano atual (profiles.plano)
----------------------------------------------------------- */
async function getCurrentPlan(): Promise<AppPlan> {
  const { data: uData } = await supabase.auth.getUser();
  if (!uData?.user) return 'unknown';

  const { data, error } = await supabase
    .from('profiles')
    .select('plano')
    .eq('user_id', uData.user.id)
    .single();

  if (error) return 'unknown';
  return (data?.plano ?? 'unknown') as AppPlan;
}

/* -----------------------------------------------------------
   Dias restantes de trial (RPC SQL: public.trial_days_left)
----------------------------------------------------------- */
async function getTrialDaysLeft(): Promise<number> {
  const { data: uData } = await supabase.auth.getUser();
  if (!uData?.user) return 0;

  const { data, error } = await supabase.rpc('trial_days_left', { p_user: uData.user.id });
  if (error) return 0;

  return typeof data === 'number' ? data : 0;
}

/* -----------------------------------------------------------
   (Opcional) Revalidar sessão (quando mexe no DB e quer estado fresco)
----------------------------------------------------------- */
async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) return;
  await supabase.auth.refreshSession();
}

/* -----------------------------------------------------------
   Forçar refresh dos dados do usuário (após mudanças no DB)
----------------------------------------------------------- */
async function refreshUserData(): Promise<AppUser | null> {
  console.log("🔄 Forçando refresh dos dados do usuário...");

  // Primeiro, tenta refresh da sessão
  await refreshSession();

  // Depois busca os dados atualizados
  const user = await getCurrentUser();

  // Emite evento para notificar componentes
  if (user) {
    console.log("✅ Dados do usuário atualizados:", {
      plano: user.plano,
      dataExpiracao: user.dataExpiracao
    });

    // Import dinâmico para evitar dependências circulares
    import('./events').then(({ userEvents, USER_EVENTS }) => {
      userEvents.emit(USER_EVENTS.PROFILE_UPDATED, user);
      userEvents.emit(USER_EVENTS.STATUS_CHANGED, user);
    });
  }

  return user;
}

/* -----------------------------------------------------------
   Export
----------------------------------------------------------- */
export const authService = {
  login,
  register,
  logout,
  getSession,
  getCurrentUser,
  getCurrentPlan,
  getTrialDaysLeft,
  refreshSession,
  refreshUserData,
};

export default authService;
