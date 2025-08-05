"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import { authService } from "@/lib/auth";
import { calculateDashboardData } from "@/lib/dashboard-utils";
import { BarChart3, Users, Gift, Trophy, TrendingUp, Smile } from "lucide-react";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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

      // Buscar vendas do localStorage
  const dashboard = calculateDashboardData(user.id);
setDashboardData(dashboard);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!userId || !dashboardData) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      // ...sincronizar dados se necessário...
    }, 30 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [userId, dashboardData]);

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <span className="text-blue-700 dark:text-blue-300 text-lg font-bold">Carregando...</span>
      </div>
    );
  }

  const {
    melhorVendedor,
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    atendimentosVendasPorDia,
    conversaoPorLoja,
    atendimentosPorVendedor,
    rankingConversao,
  } = dashboardData;

  const indicadores = [
    {
      label: "Atendimentos",
      value: totalAtendimentos,
      icon: <Smile className="w-5 h-5 text-blue-500" />,
    },
    {
      label: "Vendas",
      value: totalVendas,
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
    },
    {
  label: "Conversão Geral",
  value: typeof conversaoGeral === "number" ? `${conversaoGeral.toFixed(1)}%` : "0.0%",
  icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
},
    {
      label: "Melhor Vendedor",
      value: melhorVendedor ?? "-",
      icon: <Trophy className="w-5 h-5 text-yellow-500" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        {/* Indicadores rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {indicadores.map((card) => (
            <div
              key={card.label}
              className="rounded-xl shadow p-2 sm:p-4 flex flex-col items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 min-h-[90px]"
            >
              <span className="mb-1">{card.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{card.label}</span>
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</span>
            </div>
          ))}
        </div>

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="w-full overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Atendimentos x Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-w-[220px] sm:min-w-0 min-h-[180px] w-full">
                <Chart
                  data={atendimentosVendasPorDia}
                  type="bar"
                  keys={["atendimentos", "vendas"]}
                  config={{
                    atendimentos: { color: "#6366f1" },
                    vendas: { color: "#10b981" },
                  }}
                  xKey="data"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="w-full overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Conversão por Lojas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-w-[220px] sm:min-w-0 min-h-[180px] w-full">
                <Chart
                  data={conversaoPorLoja}
                  type="bar"
                  keys={["conversao"]}
                  config={{
                    conversao: { color: "#22c55e" },
                  }}
                  xKey="nome"
                  yLabel="%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outros cards e gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="w-full overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Atendimentos por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-w-[220px] sm:min-w-0 min-h-[180px] w-full">
                <Chart
                  data={atendimentosPorVendedor}
                  type="bar"
                  keys={["atendimentos"]}
                  config={{
                    atendimentos: { color: "#6366f1" },
                  }}
                  xKey="nome"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="w-full overflow-x-auto">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Ranking de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto min-h-[180px] w-full">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
                      <th className="px-1 sm:px-2 py-1 text-left">#</th>
                      <th className="px-1 sm:px-2 py-1 text-left">Vendedor</th>
                      <th className="px-1 sm:px-2 py-1 text-left">Loja</th>
                      <th className="px-1 sm:px-2 py-1 text-center">Atend.</th>
                      <th className="px-1 sm:px-2 py-1 text-center">Vendas</th>
                      <th className="px-1 sm:px-2 py-1 text-center">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingConversao?.map((v: any, idx: number) => (
                      <tr key={v.id}>
                        <td className="px-1 sm:px-2 py-1">{idx + 1}</td>
                        <td className="px-1 sm:px-2 py-1 font-medium">{v.nome}</td>
                        <td className="px-1 sm:px-2 py-1">{v.lojaNome}</td>
                        <td className="px-1 sm:px-2 py-1 text-center">{v.atendimentos}</td>
                        <td className="px-1 sm:px-2 py-1 text-center">{v.vendas}</td>
                        <td className="px-1 sm:px-2 py-1 text-center">{v.conversao?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="mt-8 sm:mt-12 py-6 border-t text-center text-xs text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
        <div className="mb-2 sm:mb-0">
          Convertê &copy; {new Date().getFullYear()} &mdash; Performance e resultados com inteligência.
        </div>
        <div className="flex gap-4">
          <a
            href="https://github.com/converte"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 012.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.08.79 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.67.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z"/></svg>
          </a>
          <a
            href="https://www.linkedin.com/company/converte"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            aria-label="LinkedIn"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11.75 20h-3v-10h3v10zm-1.5-11.25c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm15.25 11.25h-3v-5.5c0-1.32-.03-3.01-1.84-3.01-1.84 0-2.12 1.43-2.12 2.91v5.6h-3v-10h2.88v1.36h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v5.59z"/></svg>
          </a>
        </div>
      </footer>
    </div>
  );
}