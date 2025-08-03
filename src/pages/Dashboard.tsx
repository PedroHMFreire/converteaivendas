"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { authService } from "@/lib/auth";
import Header from "@/components/Header";
import { calculateDashboardData } from "@/lib/dashboard-utils";

const LOCAL_KEY = "converte:dashboard:";

function getLocalKey(userId: string) {
  return `${LOCAL_KEY}${userId}`;
}

function salvarDadosLocais(userId: string, dados: any) {
  localStorage.setItem(getLocalKey(userId), JSON.stringify(dados));
}

function carregarDadosLocais(userId: string) {
  const raw = localStorage.getItem(getLocalKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function sincronizarComBanco(userId: string, dados: any) {
  try {
    await supabase
      .from("dashboard_cache")
      .upsert([{ user_id: userId, dados, updated_at: new Date().toISOString() }]);
  } catch (err) {
    console.error("Erro ao sincronizar com banco:", err);
  }
}

export default function DashboardPage() {
  const [dadosLocais, setDadosLocais] = useState<any>({});
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

      let dados = carregarDadosLocais(user.id);

      if (!dados) {
        try {
          const { data } = await supabase
            .from("dashboard_cache")
            .select("dados")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1);
          if (data?.[0]?.dados) {
            dados = data[0].dados;
            salvarDadosLocais(user.id, dados);
          }
        } catch (error: any) {
          toast({
            title: "Erro ao buscar dados do Supabase",
            description: error?.message || "Erro desconhecido",
            variant: "destructive",
          });
        }
      }

      if (user.id) {
        const dashboardData = calculateDashboardData(
          user.id,
          undefined,
          undefined
        );
        setDadosLocais(dashboardData);
      }
    };
    init();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!userId || !dadosLocais) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      sincronizarComBanco(userId, dadosLocais);
    }, 30 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, dadosLocais]);

  const melhorVendedor = dadosLocais?.melhorVendedor ?? "-";

  const indicadores = [
    {
      label: "Atendimentos",
      value: dadosLocais?.totalAtendimentos ?? 0,
      color: "indigo",
      icon: (
        <svg className="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m9-5.13a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
        </svg>
      ),
    },
    {
      label: "Vendas",
      value: dadosLocais?.totalVendas ?? 0,
      color: "green",
      icon: (
        <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M3 3v18h18M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      label: "Conversão",
      value: (dadosLocais?.conversaoGeral ?? 0) + "%",
      color: "pink",
      icon: (
        <svg className="w-8 h-8 text-pink-500 dark:text-pink-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
        <svg className="w-8 h-8 text-yellow-500 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 17.75L18.2 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.44 4.73L5.8 21z" />
        </svg>
      ),
    },
  ];

  const charts = [
    {
      title: "Atendimentos vs Vendas",
      dataKey: "atendimentosVendasPorDia",
      type: "bar",
      keys: ["atendimentos", "vendas"],
      color: "#6366f1",
    },
    {
      title: "Vendas por Vendedor",
      dataKey: "vendasPorVendedor",
      type: "bar",
      keys: ["vendas"],
      color: "#10b981",
    },
    {
      title: "Atendimentos por Vendedor",
      dataKey: "atendimentosPorVendedor",
      type: "bar",
      keys: ["atendimentos"],
      color: "#f59e42",
    },
    {
      title: "Melhor Dia da Semana",
      dataKey: "diasDaSemana",
      type: "bar",
      keys: ["vendas"],
      color: "#f43f5e",
    },
    {
      title: "Conversão por Loja",
      dataKey: "conversaoPorLoja",
      type: "bar",
      keys: ["conversao"],
      color: "#3b82f6",
    },
    {
      title: "Ranking de Conversão por Vendedor",
      dataKey: "rankingConversao",
      type: "bar",
      keys: ["conversao"],
      color: "#a21caf",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <Header />

      <main className="flex-1 w-full">
        <div className="w-full px-2 md:px-4 py-8 pt-6">
          {/* Linha única de boxes de indicadores */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
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
                  minHeight: 100,
                }}
              >
                <div className="p-5 flex items-center">{ind.icon}</div>
                <div className="flex-1">
                  <CardHeader className="pb-1">
                    <CardTitle className={`text-${ind.color}-700 dark:text-${ind.color}-300 text-lg font-semibold`}>
                      {ind.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-3xl font-extrabold tracking-tight">{ind.value}</span>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {/* Gráficos em grid responsivo */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            {charts.map((chart) => {
              if (
                !chart ||
                typeof chart.type !== "string" ||
                !Array.isArray(chart.keys) ||
                !chart.keys.length
              ) {
                console.warn("Gráfico inválido:", chart);
                return null;
              }
              const chartData = Array.isArray(dadosLocais?.[chart.dataKey])
                ? dadosLocais[chart.dataKey]
                : [];
              if (!Array.isArray(chartData)) {
                console.warn("Dados inválidos para gráfico:", chart.title, chartData);
                return null;
              }
              return (
                <Card
                  key={chart.dataKey}
                  className={`
                    bg-gray-50 dark:bg-zinc-800
                    shadow-md border-0 rounded-xl
                    p-0
                    transition
                  `}
                  style={{
                    border: "1.5px solid #e5e7eb",
                    boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gray-700 dark:text-gray-200 text-lg font-semibold">
                      {chart.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div
                      className={`
                        rounded-lg
                        bg-white/80 dark:bg-zinc-900/80
                        border border-gray-200 dark:border-zinc-700
                        p-4
                        min-h-[280px]
                        flex items-center
                        transition
                      `}
                    >
                      {chartData.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 dark:text-gray-500 w-full">
                          Sem dados para exibir
                        </div>
                      ) : (
                        <Chart
                          data={chartData}
                          type={chart.type}
                          keys={chart.keys}
                          config={{
                            [chart.keys[0]]: { color: chart.color },
                            ...(chart.keys[1]
                              ? { [chart.keys[1]]: { color: "#eab308" } }
                              : {}),
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-6 mt-10">
        <div className="w-full px-2 md:px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-bold text-lg text-indigo-700 dark:text-indigo-300 mb-1">Dashboard Converte</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">v1.0</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">Endereço: Rua Exemplo, 123 - Cidade/UF</span>
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-500 hover:bg-green-600 text-white p-2 transition"
              title="WhatsApp"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.52 3.48A12.07 12.07 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.61 5.97L0 24l6.18-1.62A12.07 12.07 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.23-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.67.96.98-3.58-.24-.37A9.93 9.93 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.8c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.25-1.37-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.34-.26.27-1 1-1 2.43 0 1.43 1.03 2.81 1.18 3.01.15.2 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.65-.67 1.89-1.32.23-.65.23-1.21.16-1.32-.07-.11-.25-.18-.53-.32z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/seuinstagram"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 text-white p-2 transition"
              title="Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5zm6 1.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
            </a>
            <a
              href="mailto:suporte@seudominio.com"
              className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white p-2 transition"
              title="E-mail"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </a>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-base">Dashboard Converte</span>
            <span className="text-xs text-gray-500 dark:text-gray-500">TODOS OS DIREITOS RESERVADOS PARA RAKAI MIDIA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}