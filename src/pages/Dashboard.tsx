"use client";

import { useEffect, useState, useTransition, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Chart } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import { subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [range, setRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [loading, startTransition] = useTransition();
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    const { from, to } = range;

    const { data: dashboardData, error } = await supabase.rpc("dashboard", {
      start_date: from.toISOString(),
      end_date: to.toISOString(),
    });

    console.log("DASHBOARD DATA:", dashboardData, "ERROR:", error);

    if (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(dashboardData);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

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
          {range.from.toLocaleDateString("pt-BR")} - {range.to.toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div className="flex justify-center py-4">
        <Calendar
          initialFocus
          mode="range"
          selected={range}
          onSelect={(value) => {
            if (value?.from && value?.to) {
              setRange({ from: value.from, to: value.to });
            }
          }}
          locale={ptBR}
        />
      </div>

      <Button
        onClick={() => startTransition(() => fetchData())}
        disabled={loading}
        variant="outline"
      >
        Atualizar Dados
      </Button>

      {data && typeof data === "object" ? (
        <Fragment>
          <Card>
            <CardHeader>
              <CardTitle>Resumo Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Total de Atendimentos: <strong>{data.totalAtendimentos ?? 0}</strong>
              </p>
              <p>
                Total de Vendas: <strong>{data.totalVendas ?? 0}</strong>
              </p>
              <p>
                Conversão Geral: <strong>{data.conversaoGeral ?? 0}%</strong>
              </p>
              <p>
                Ticket Médio: <strong>R$ {(data.ticketMedio ?? 0).toFixed(2)}</strong>
              </p>
            </CardContent>
          </Card>

          {charts.map((chart) => (
            <Card key={chart.dataKey}>
              <CardHeader>
                <CardTitle>{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  data={Array.isArray(data[chart.dataKey]) ? data[chart.dataKey] : []}
                  type={chart.type}
                  keys={chart.keys}
                />
              </CardContent>
            </Card>
          ))}
        </Fragment>
      ) : (
        <p>Carregando dados...</p>
      )}
    </div>
  );
}