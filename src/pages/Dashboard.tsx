import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart } from "@/components/ui/chart";
import { getDashboardData } from "@/lib/supabase/dashboard";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData(range);
      setDashboard(data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast.error("Erro ao carregar os dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (json.success) toast.success("Cache atualizado com sucesso");
      else toast.error("Erro ao atualizar cache");
      fetchData();
    } catch (err) {
      toast.error("Erro ao atualizar cache");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  if (loading) return <div className="p-4">Carregando dashboard...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <DateRangePicker initialDateFrom={range?.from} initialDateTo={range?.to} onUpdate={setRange} />
        <Button onClick={refreshCache} disabled={refreshing} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Atualizar Cache
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total de Atendimentos: {dashboard.totalAtendimentos}</p>
            <p>Total de Vendas: {dashboard.totalVendas}</p>
            <p>Conversão Geral: {dashboard.conversaoGeral}%</p>
            <p>Ticket Médio: R$ {dashboard.ticketMedio.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Chart title="Atendimentos vs Vendas" data={dashboard.atendimentosVsVendas} type="bar" />
        <Chart title="Vendas por Vendedor" data={dashboard.vendasPorVendedor} type="bar" />
        <Chart title="Atendimentos por Vendedor" data={dashboard.atendimentosPorVendedor} type="bar" />
        <Chart title="Melhor Dia da Semana" data={dashboard.melhorDiaSemana} type="bar" />
        <Chart title="Conversão por Loja" data={dashboard.conversaoPorLoja} type="bar" />
        <Chart title="Ranking de Vendedores por Conversão" data={dashboard.rankingConversao} type="bar" />
      </div>
    </div>
  );
}
