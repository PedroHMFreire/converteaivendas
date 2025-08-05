import { supabase } from "@/lib/supabaseClient";

export async function fetchDashboardData() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuário não autenticado");
  }

  const userId = user.id;

  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 7);
  const fim = new Date();

  const { data, error } = await supabase.rpc("calculate_dashboard_data", {
    p_user_id: userId,
    inicio: inicio.toISOString().split("T")[0],
    fim: fim.toISOString().split("T")[0],
  });

  if (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    throw error;
  }

  return data;
}