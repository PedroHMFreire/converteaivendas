"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import { calculateDashboardData, dateOnly } from "@/lib/dashboard-utils";
import { supabase } from "@/lib/supabaseClient";
import { BarChart3, Gift, Trophy, TrendingUp, Smile, Bug } from "lucide-react";

type Venda = {
  id: string;
  vendedorId: string;
  lojaId: string;
  valor?: number;
  data: string;
  user_id: string;
  vendas: number;
  atendimentos: number;
};

function normalizeRegistro(r: any): Venda {
  return {
    id: r.id ?? r.uuid ?? crypto.randomUUID(),
    vendedorId: r.vendedorId ?? r.vendedor_id ?? r.sellerId ?? r.seller_id ?? "",
    lojaId: r.lojaId ?? r.loja_id ?? r.storeId ?? r.store_id ?? "",
    valor: Number(r.valor ?? r.value ?? r.amount ?? 0) || 0,
    data: dateOnly(r.data ?? r.date ?? r.created_at ?? new Date().toISOString()),
    user_id: r.user_id ?? r.userId ?? "",
    vendas: Number(r.vendas ?? r.venda ?? r.sales ?? 0) || 0,
    atendimentos: Number(r.atendimentos ?? r.atend ?? r.contacts ?? r.atendimentos_count ?? 0) || 0,
  };
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userResp, error: authErr } = await supabase.auth.getUser();
        if (authErr || !userResp?.user) {
          toast({ title: "Você precisa estar logado." });
          return;
        }
        const userId = userResp.user.id;

        // 1) registros
        let vendas: Venda[] = [];
        let regsErrorMsg: string | null = null;
        try {
          const { data: regs, error: regsError } = await supabase
            .from("registros")
            .select("*")
            .eq("user_id", userId);
          if (regsError) regsErrorMsg = regsError.message;
          if (Array.isArray(regs) && regs.length) vendas = regs.map(normalizeRegistro);
        } catch (e: any) { regsErrorMsg = String(e); }

        // 2) fallback vendas_backup
        let vendasFromBackup = 0;
        if (!vendas.length) {
          try {
            const { data, error } = await supabase
              .from("vendas_backup")
              .select("vendas")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .single();
            if (!error && data?.vendas?.length) {
              vendas = (data.vendas as any[]).map(normalizeRegistro);
              vendasFromBackup = vendas.length;
            }
          } catch {}
        }

        // 3) fallback localStorage
        let vendasFromLocal = 0;
        if (!vendas.length) {
          try {
            const raw = localStorage.getItem(`converte:vendas:${userId}`);
            if (raw) {
              const arr = JSON.parse(raw) as any[];
              vendas = arr.map(normalizeRegistro);
              vendasFromLocal = vendas.length;
            }
          } catch {}
        }

        // 4) cadastros
        let lojas: any[] = [];
        let vendedores: any[] = [];
        let cadMsg: string | null = null;
        try {
          const { data: cad, error: cadErr } = await supabase
            .from("cadastros")
            .select("lojas, vendedores")
            .eq("user_id", userId)
            .limit(1)
            .single();
          if (cad) {
            lojas = cad.lojas || [];
            vendedores = cad.vendedores || [];
          }
          if (cadErr) cadMsg = cadErr.message;
        } catch (e) {
          cadMsg = String(e);
        }

        // 5) montar debug
        const dbg = {
          userId,
          totalRegistros: vendas.length,
          vendedoresCount: vendedores.length,
          lojasCount: lojas.length,
          sample: vendas.slice(0, 3),
          regsErrorMsg,
          cadMsg,
          vendasFromBackup,
          vendasFromLocal,
        };
        setDebugInfo(dbg);
        console.log("[Dashboard] debug", dbg);

        // 6) calcular com data ampla
        const data = calculateDashboardData(
          userId,
          "1970-01-01",
          dateOnly(new Date().toISOString()),
          vendas,
          lojas,
          vendedores
        );
        setDashboardData(data);

        if (!vendas.length) {
          toast({
            title: "Sem dados para exibir",
            description: "Não encontrei registros em 'registros', nem em 'vendas_backup' e nem no localStorage. Verifique se o Registro de Vendas está salvando (tabela 'registros') e se o user_id bate com o usuário logado.",
          });
        }
      } catch (e: any) {
        toast({ title: "Erro ao carregar dashboard", description: String(e), variant: "destructive" });
      }
    };
    fetchData();

    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(fetchData, 60_000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, []);

  if (!dashboardData) {
    return <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Carregando...</div>;
  }

  const {
    totalAtendimentos,
    totalVendas,
    conversaoGeral,
    atendimentosVendasPorDia,
    conversaoPorLoja,
    rankingConversao,
    melhorVendedor,
    melhorLoja,
  } = dashboardData;

  const indicadores = [
    { label: "Atendimentos", value: totalAtendimentos, icon: <Smile className="w-5 h-5 text-blue-500" /> },
    { label: "Vendas", value: totalVendas, icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
    { label: "Conversão Geral", value: `${(conversaoGeral ?? 0).toFixed(1)}%`, icon: <BarChart3 className="w-5 h-5 text-purple-500" /> },
    { label: "Melhor Vendedor", value: melhorVendedor ?? "-", icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
    { label: "Melhor Loja", value: melhorLoja ?? "-", icon: <Gift className="w-5 h-5 text-pink-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        {/* Toggle Debug */}
        <button
          onClick={() => setDebugOpen(v => !v)}
          className="mb-3 inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          title="Abrir/fechar painel de diagnóstico"
        >
          <Bug className="w-4 h-4" /> Debug
        </button>

        {debugOpen && debugInfo && (
          <pre className="mb-4 text-xs whitespace-pre-wrap bg-zinc-900 text-zinc-100 p-3 rounded">
{JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {indicadores.map((c) => (
            <div key={c.label} className="rounded-xl shadow p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 min-h-[90px]">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">{c.icon} {c.label}</div>
              <div className="text-xl font-bold mt-1">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="w-full overflow-x-auto">
            <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Atendimentos x Vendas</CardTitle></CardHeader>
            <CardContent>
              <div className="min-w-[220px] sm:min-w-0 min-h-[220px] w-full">
                <Chart
                  data={atendimentosVendasPorDia}
                  type="bar"
                  keys={["atendimentos", "vendas"]}
                  config={{ atendimentos: { color: "#6366f1" }, vendas: { color: "#10b981" } }}
                  xKey="data"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full overflow-x-auto">
            <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Conversão por Lojas</CardTitle></CardHeader>
            <CardContent>
              <div className="min-w-[220px] sm:min-w-0 min-h-[220px] w-full">
                <Chart
                  data={conversaoPorLoja}
                  type="bar"
                  keys={["conversao"]}
                  config={{ conversao: { color: "#22c55e" } }}
                  xKey="nome"
                  yLabel="%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full overflow-x-auto">
          <CardHeader><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Trophy className="w-5 h-5" /> Ranking de Conversão</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100">
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Vendedor</th>
                    <th className="px-2 py-1 text-left">Loja</th>
                    <th className="px-2 py-1 text-center">Atend.</th>
                    <th className="px-2 py-1 text-center">Vendas</th>
                    <th className="px-2 py-1 text-center">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingConversao.map((r: any, idx: number) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-zinc-800">
                      <td className="px-2 py-1">{idx + 1}</td>
                      <td className="px-2 py-1">{r.nome}</td>
                      <td className="px-2 py-1">{r.lojaNome}</td>
                      <td className="px-2 py-1 text-center">{r.atendimentos}</td>
                      <td className="px-2 py-1 text-center">{r.vendas}</td>
                      <td className="px-2 py-1 text-center">{r.conversao.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
