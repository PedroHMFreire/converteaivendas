// src/lib/auth.ts
import { supabase } from '@/lib/supabaseClient';

export type AppPlan = 'trial' | 'basic' | 'premium' | 'unknown';

export type AppProfile = {
  user_id: string;
  email: string | null;
  plano: AppPlan;
  ativo: boolean | null;
  expires_at: string | null; // DATE no banco (string no client)
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
   Recuperação de senha (envio de e-mail)
----------------------------------------------------------- */
async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return data;
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
  // Primeiro, fazer uma consulta dummy para invalidar cache
  try {
    await supabase.from('v_profiles_access').select('user_id').eq('user_id', uid).limit(1);
  } catch (e) {
    console.warn("⚠️ Erro ao invalidar cache:", e);
  }

  const { data: pData, error: profileError } = await supabase
    .from('v_profiles_access')
  .select('user_id, email, plan_type, ativo, expires_at, plano, plano_recorrencia, data_expiracao')
    .eq('user_id', uid)
    .single();

  if (profileError) {
    console.error("❌ Erro ao buscar perfil:", profileError);
    return null;
  }

  const profile = (pData ?? null) as any; // View retorna estrutura diferente

  console.log("🔍 getCurrentUser: Dados do perfil", {
    userId: uid,
    plan_type: profile?.plan_type,
    expires_at: profile?.expires_at,
    ativo: profile?.ativo,
    timestamp: new Date().toISOString()
  });

  // Normalizar expiracao e mapeamentos com fallback
  const planTypeRaw: string | null = (profile?.plan_type ?? null) as string | null;
  const planoDbRaw: string | null = (profile?.plano ?? null) as string | null; // 'basic' | 'premium' | null
  const recRaw: string | null = (profile?.plano_recorrencia ?? null) as string | null; // 'mensal' | 'trimestral' | 'anual' | null
  const expiresRaw: string | null = (profile?.expires_at ?? profile?.data_expiracao ?? null) as string | null;
  const expiresDate = expiresRaw ? new Date(expiresRaw) : null;
  const isActive = !!(expiresDate && expiresDate.getTime() > Date.now());

  const mapFromPlanType = (t?: string | null): AppPlan =>
    t === 'anual' ? 'premium' : t === 'mensal' || t === 'trimestral' ? 'basic' : 'trial';
  const mapFromPlanoDb = (p?: string | null): AppPlan =>
    p === 'premium' ? 'premium' : p === 'basic' ? 'basic' : 'trial';

  let planoMapeado: AppPlan = 'trial';
  if (planTypeRaw && isActive) {
    planoMapeado = mapFromPlanType(planTypeRaw);
  } else if (isActive && (planoDbRaw === 'basic' || planoDbRaw === 'premium')) {
    // Fallback quando a view ainda não refletiu plan_type/expires_at, mas profiles já tem plano/data_expiracao
    planoMapeado = mapFromPlanoDb(planoDbRaw);
  } else {
    planoMapeado = 'trial';
  }

  return {
    id: uid,
    email,
    plano: planoMapeado,
  dataExpiracao: expiresRaw,
    nome: (uData.user.user_metadata as any)?.nome ?? null,
    empresa: (uData.user.user_metadata as any)?.empresa ?? null,
  };
}

/* -----------------------------------------------------------
   Plano atual (profiles.plano)
----------------------------------------------------------- */
async function getCurrentPlan(): Promise<AppPlan> {
  const { data: uData } = await supabase.auth.getUser();
  if (!uData?.user) {
    console.log("🔍 getCurrentPlan: Usuário não autenticado");
    return 'unknown';
  }

  console.log("🔍 getCurrentPlan: Buscando plano para user", uData.user.id);

  const { data, error } = await supabase
    .from('v_profiles_access')
  .select('plan_type, plano, plano_recorrencia, expires_at, data_expiracao')
    .eq('user_id', uData.user.id)
    .single();

  if (error) {
    console.error("❌ getCurrentPlan: Erro ao buscar plano", error);
    return 'unknown';
  }

  // Mapear com fallback (usar plan_type/expires_at; se ausentes, usar plano/data_expiracao)
  const p = (data as any) || {};
  const planType: string | null = (p.plan_type ?? null) as string | null;
  const planoDb: string | null = (p.plano ?? null) as string | null;
  const expiresRaw: string | null = (p.expires_at ?? p.data_expiracao ?? null) as string | null;
  const expiresDate = expiresRaw ? new Date(expiresRaw) : null;
  const isActive = !!(expiresDate && expiresDate.getTime() > Date.now());

  const mapFromPlanType = (t?: string | null): AppPlan =>
    t === 'anual' ? 'premium' : t === 'mensal' || t === 'trimestral' ? 'basic' : 'trial';

  let plan: AppPlan = 'trial';
  if (planType && isActive) {
    plan = mapFromPlanType(planType);
  } else if (isActive && (planoDb === 'basic' || planoDb === 'premium')) {
    plan = (planoDb as 'basic' | 'premium');
  } else {
    plan = 'trial';
  }

  console.log("✅ getCurrentPlan: Resultado", {
    userId: uData.user.id,
    plan,
    planType: planType,
    rawData: data,
    timestamp: new Date().toISOString()
  });

  return plan;
}

/* -----------------------------------------------------------
   Dias restantes de trial (RPC SQL: public.trial_days_left)
----------------------------------------------------------- */
async function getTrialDaysLeft(): Promise<number> {
  const { data: uData } = await supabase.auth.getUser();
  if (!uData?.user) {
    console.log("🔍 getTrialDaysLeft: Usuário não autenticado");
    return 0;
  }

  console.log("🔍 getTrialDaysLeft: Chamando RPC para user", uData.user.id);

  const { data, error } = await supabase.rpc('trial_days_left', { p_user: uData.user.id });

  if (error) {
    console.error("❌ getTrialDaysLeft: Erro na RPC", error);
    return 0;
  }

  const days = typeof data === 'number' ? data : 0;
  console.log("✅ getTrialDaysLeft: Resultado", {
    userId: uData.user.id,
    days,
    rawData: data,
    dataType: typeof data,
    timestamp: new Date().toISOString()
  });

  return days;
}

/* -----------------------------------------------------------
   Limpeza completa do cache (usar em casos extremos)
----------------------------------------------------------- */
async function clearCache(): Promise<void> {
  console.log("🧹 Limpando cache do Supabase...");

  try {
    // Limpar cache de autenticação
    await supabase.auth.signOut({ scope: 'local' });
    await supabase.auth.signInAnonymously();

    // Forçar reload da página para limpar todos os caches
    console.log("✅ Cache limpo, recarregando página...");
    window.location.reload();
  } catch (error) {
    console.error("❌ Erro ao limpar cache:", error);
  }
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
  console.log("🔄 Iniciando refreshUserData...");

  try {
    // Primeiro, tenta refresh da sessão
    await refreshSession();
    console.log("✅ Sessão refreshada");

    // Depois busca os dados atualizados
    const user = await getCurrentUser();

    if (!user) {
      console.warn("⚠️ refreshUserData: Usuário não encontrado após refresh");
      return null;
    }

    console.log("✅ Dados do usuário atualizados:", {
      plano: user.plano,
      dataExpiracao: user.dataExpiracao,
      timestamp: new Date().toISOString()
    });

    // Import dinâmico para evitar dependências circulares
    const { userEvents, USER_EVENTS } = await import('./events');
    userEvents.emit(USER_EVENTS.PROFILE_UPDATED, user);
    userEvents.emit(USER_EVENTS.STATUS_CHANGED, user);
    console.log("📡 Eventos emitidos para componentes");

    return user;
  } catch (error) {
    console.error("❌ Erro em refreshUserData:", error);
    return null;
  }
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
  clearCache,
  requestPasswordReset,
};

export default authService;
