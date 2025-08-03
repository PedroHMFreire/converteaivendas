import { supabase } from "@/lib/supabase";

export async function fetchDashboardData() {
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  if (!userId) {
    throw new Error("Usuário não autenticado");
  }

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
