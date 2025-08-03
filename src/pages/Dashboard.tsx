import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchDashboardData, refreshDashboardCache } from "@/lib/api";
import { useUser } from "@/lib/auth-context";
import ConversaoPorDiaChart from "@/ui/charts/conversao-por-dia";
import ConversaoPorCanalChart from "@/ui/charts/conversao-por-canal";
import ConversaoPorLojaChart from "@/ui/charts/conversao-por-loja";

export default function DashboardPage() {
  const { user } = useUser();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardData(startDate, endDate);
      setDashboard(data);
    } catch (err) {
      console.error("Erro na RPC, caindo no fallback local:", err);
      setError("Erro ao carregar os dados. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleRefresh = async () => {
    await refreshDashboardCache(startDate, endDate);
    await loadData();
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2">
          <label>
            Início: <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1 rounded" />
          </label>
          <label>
            Fim: <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1 rounded" />
          </label>
        </div>
        <Button onClick={handleRefresh}>Atualizar Indicadores</Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Evolução Semanal da Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Carregando gráfico...</div>}>
            <ConversaoPorDiaChart data={dashboard.conversaoPorDia} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversão por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Carregando gráfico...</div>}>
            <ConversaoPorCanalChart data={dashboard.conversoesPorCanal} />
          </Suspense>
        </CardContent>
      </Card>

      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Conversão por Loja</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Carregando gráfico...</div>}>
            <ConversaoPorLojaChart data={dashboard.conversaoPorLoja} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
