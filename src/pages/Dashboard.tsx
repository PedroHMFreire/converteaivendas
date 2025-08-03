// src/pages/Dashboard.tsx

"use client";

import { useEffect, useState, Suspense, useTransition } from "react";
import { getDashboardData } from "@/lib/supabase/queries";
import { formatarPeriodo, getRangeFromFiltro } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltrosPeriodo } from "@/components/dashboard/filtros-periodo";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";

export default function DashboardPage() {
  const [filtro, setFiltro] = useState("hoje");
  const [loading, startTransition] = useTransition();
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    const range = getRangeFromFiltro(filtro);
    const response = await getDashboardData(range);
    if (!response.success) {
      toast({
        title: "Erro ao carregar dados",
        description: response.error.message,
        variant: "destructive",
      });
    } else {
      setData(response.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filtro]);

  const charts = [
    {
      title: "Atendimentos vs Vendas",
      dataKey: "atendimentosVendasPorDia",
      type: "bar",
      keys: ["atendimentos", "vendas"],
    },
    {
      title: "Vendas por Vendedor",
      dataKey: "vendasPorVendedor",
      type: "bar",
      keys: ["vendas"],
    },
    {
      title: "Atendimentos por Vendedor",
      dataKey: "atendimentosPorVendedor",
      type: "bar",
      keys: ["atendimentos"],
    },
    {
      title: "Melhor Dia da Semana",
      dataKey: "diasDaSemana",
      type: "bar",
      keys: ["vendas"],
    },
    {
      title: "Conversão por Loja",
      dataKey: "conversaoPorLoja",
      type: "bar",
      keys: ["conversao"],
    },
    {
      title: "Ranking de Conversão por Vendedor",
      dataKey: "rankingConversao",
      type: "bar",
      keys: ["conversao"],
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-muted-foreground">
          {formatarPeriodo(filtro)}
        </span>
      </div>

      <FiltrosPeriodo
        filtro={filtro}
        setFiltro={(value) => startTransition(() => setFiltro(value))}
      />

      <Button
        onClick={() => startTransition(fetchData)}
        disabled={loading}
        variant="outline"
      >
        Atualizar Dados
      </Button>

      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Total de Atendimentos:{" "}
                <strong>{data.totalAtendimentos}</strong>
              </p>
              <p>
                Total de Vendas: <strong>{data.totalVendas}</strong>
              </p>
              <p>
                Conversão Geral: <strong>{data.conversaoGeral}%</strong>
              </p>
              <p>
                Ticket Médio: <strong>R$ {data.ticketMedio.toFixed(2)}</strong>
              </p>
            </CardContent>
          </Card>

          {charts.map((chart) => (
            <Card key={chart.title}>
              <CardHeader>
                <CardTitle>{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Carregando gráfico...</div>}>
                  <Chart
                    data={data[chart.dataKey]}
                    type={chart.type}
                    keys={chart.keys}
                  />
                </Suspense>
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <p>Carregando dados...</p>
      )}
    </div>
  );
}
