"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import { calculateDashboardData } from "@/lib/dashboard-utils";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, ClipboardList, Menu, X, Gift, Trophy, TrendingUp, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

function Header() {
  const navigate = useNavigate();
  const menu = [
    {
      label: "Dashboard",
      icon: <BarChart3 className="w-5 h-5" />,
      path: "/dashboard",
    },
    {
      label: "Cadastros",
      icon: <Users className="w-5 h-5" />,
      path: "/cadastros",
       },
    {
      label: "Vendas",
      icon: <ClipboardList className="w-5 h-5" />,
      path: "/vendas",
    },
  ];

  return (
    <header className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="w-full flex justify-between items-center h-16 px-2 sm:px-4">
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            Convertê
          </span>
        </div>
        <nav className="flex gap-1 sm:gap-2">
          {menu.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="flex items-center gap-1 px-2 py-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              {item.icon}
              <span className="text-sm sm:text-base">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }
      setUserId(user.id);

      const dashboardData = calculateDashboardData(user.id);
      setDashboardData(dashboardData);
    };
    init();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!userId || !dashboardData) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      // Aqui você pode sincronizar com o banco se quiser
    }, 30 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, dashboardData]);

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Carregando dados do dashboard...
      </div>
    );
  }

  const melhorVendedor = dashboardData?.melhorVendedor ?? "-";

  const indicadores = [
    {
      label: "Atendimentos",
      value: dashboardData?.totalAtendimentos ?? 0,
      color: "indigo",
      icon: (
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m9-5.13a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
        </svg>
      ),
    },
    {
      label: "Vendas",
      value: dashboardData?.totalVendas ?? 0,
      color: "green",
      icon: (
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M3 3v18h18M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      label: "Conversão",
      value: (dashboardData?.conversaoGeral ?? 0).toFixed(1) + "%",
      color: "pink",
      icon: (
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-pink-500 dark:text-pink-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Melhor Vendedor",
      value: melhorVendedor,
      color: "yellow",
      icon: (
        <svg
          className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M12 17.75L18.2 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.44 4.73L5.8 21z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <Header />

      <main className="flex-1 w-full">
        <div className="w-full px-2 sm:px-4 py-6 sm:py-8 pt-6">
          {/* Indicadores */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {indicadores.map((ind) => (
              <Card
                key={ind.label}
                className={`
                  shadow-lg border-0 rounded-xl
                  bg-gradient-to-br from-white via-gray-50 to-gray-100
                  dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800
                  flex flex-row items-center
                  transition
                `}
                style={{
                  borderLeft: `6px solid var(--tw-color-${ind.color}-500, #6366f1)`,
                  minHeight: 90,
                }}
              >
                <div className="p-3 sm:p-5 flex items-center">{ind.icon}</div>
                <div className="flex-1">
                  <CardHeader className="pb-1">
                    <CardTitle
                      className={`text-${ind.color}-700 dark:text-${ind.color}-300 text-sm sm:text-base md:text-lg font-semibold`}
                    >
                      {ind.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {ind.value}
                    </span>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {/* Gráficos */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Atendimentos vs Vendas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.atendimentosVendasPorDia.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.atendimentosVendasPorDia}
                        type="bar"
                        keys={["atendimentos", "vendas"]}
                        config={{
                          atendimentos: { color: "#6366f1" },
                          vendas: { color: "#10b981" },
                        }}
                        xKey="data"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.vendasPorVendedor.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.vendasPorVendedor}
                        type="bar"
                        keys={["vendas"]}
                        config={{
                          vendas: { color: "#10b981" },
                        }}
                        xKey="vendedor"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Atendimentos por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.atendimentosPorVendedor.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.atendimentosPorVendedor}
                        type="bar"
                        keys={["atendimentos"]}
                        config={{
                          atendimentos: { color: "#f59e42" },
                        }}
                        xKey="vendedor"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Melhor Dia da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.diasDaSemana.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.diasDaSemana.map((d: any) => ({
                          ...d,
                          diaSemana: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.dia],
                        }))}
                        type="bar"
                        keys={["conversao"]}
                        config={{
                          conversao: { color: "#f43f5e" },
                        }}
                        xKey="diaSemana"
                        yLabel="%"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Conversão por Loja
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.conversaoPorLoja.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.conversaoPorLoja}
                        type="bar"
                        keys={["conversao"]}
                        config={{
                          conversao: { color: "#3b82f6" },
                        }}
                        xKey="loja"
                        yLabel="%"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-50 dark:bg-zinc-800 shadow-md border-0 rounded-xl p-0 transition"
              style={{
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-semibold">
                  Ranking de Conversão por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="overflow-x-auto">
                  <div
                    className="rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700 p-4 min-h-[200px] sm:min-h-[280px] flex items-center transition"
                    style={{ minWidth: 320, width: "100%" }}
                  >
                    {dashboardData.rankingConversao.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                        Sem dados para exibir
                      </div>
                    ) : (
                      <Chart
                        data={dashboardData.rankingConversao}
                        type="bar"
                        keys={["conversao"]}
                        config={{
                          conversao: { color: "#a21caf" },
                        }}
                        xKey="vendedor"
                        yLabel="%"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-6 mt-10">
        <div className="w-full px-2 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="font-bold text-base sm:text-lg text-indigo-700 dark:text-indigo-300 mb-1">
              Dashboard Converte
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              v1.0
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
              Endereço: Rua Exemplo, 123 - Cidade/UF
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-0">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-500 hover:bg-green-600 text-white p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="WhatsApp"
              aria-label="WhatsApp"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.52 3.48A12.07 12.07 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.61 5.97L0 24l6.18-1.62A12.07 12.07 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.23-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.67.96.98-3.58-.24-.37A9.93 9.93 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.8c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.25-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.34-.26.27-1 1-1 2.43 0 1.43 1.03 2.81 1.18 3.01.15.2 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.65-.67 1.89-1.32.23-.65.23-1.21.16-1.32-.07-.11-.25-.18-.53-.32z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/seuinstagram"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 text-white p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              title="Instagram"
              aria-label="Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5zm6 1.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
            </a>
            <a
              href="mailto:suporte@seudominio.com"
              className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white p-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="E-mail"
              aria-label="E-mail"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M4 4h16v16H4z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </a>
          </div>

          <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm sm:text-base">
              Dashboard Converte
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              TODOS OS DIREITOS RESERVADOS PARA RAKAI MIDIA
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}