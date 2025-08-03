// src/pages/Dashboard.tsx

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import dynamic from "next/dynamic"
import { fetchDashboardData, refreshDashboardCache } from "@/lib/dashboard-utils"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const PieChart = dynamic(() => import("@/components/charts/PieChart"), { ssr: false })
const BarChart = dynamic(() => import("@/components/charts/BarChart"), { ssr: false })
const LineChart = dynamic(() => import("@/components/charts/LineChart"), { ssr: false })
const DualLineChart = dynamic(() => import("@/components/charts/DualLineChart"), { ssr: false })
const RadarChart = dynamic(() => import("@/components/charts/RadarChart"), { ssr: false })

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any | null>(null)
  const [inicio, setInicio] = useState<string>(() => format(new Date(), "yyyy-MM-01"))
  const [fim, setFim] = useState<string>(() => format(new Date(), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(true)
  const [loadingFallback, setLoadingFallback] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchDashboardData(inicio, fim)
      setDashboard(data)
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard", error)
    }
    setLoading(false)
  }

  const atualizarDashboard = async () => {
    setLoadingFallback(true)
    await refreshDashboardCache(inicio, fim)
    await fetchData()
    setLoadingFallback(false)
  }

  useEffect(() => {
    fetchData()
  }, [inicio, fim])

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin mr-2 h-6 w-6 text-muted-foreground" /> Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <Button onClick={atualizarDashboard} disabled={loadingFallback}>
          {loadingFallback ? "Atualizando..." : "Atualizar Dados"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader><CardTitle>Conversão Geral</CardTitle></CardHeader><CardContent>{dashboard.conversaoGeral}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Atendimentos</CardTitle></CardHeader><CardContent>{dashboard.totalAtendimentos}</CardContent></Card>
        <Card><CardHeader><CardTitle>Vendas</CardTitle></CardHeader><CardContent>{dashboard.totalVendas}</CardContent></Card>
        <Card><CardHeader><CardTitle>Ticket Médio</CardTitle></CardHeader><CardContent>R$ {dashboard.ticketMedio.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Melhor Loja</CardTitle></CardHeader><CardContent>{dashboard.melhorLoja || "-"}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader><CardTitle>Evolução Semanal da Conversão</CardTitle></CardHeader>
          <CardContent><LineChart data={dashboard.conversaoPorDia} /></CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader><CardTitle>Atendimentos vs Vendas por Dia</CardTitle></CardHeader>
          <CardContent><DualLineChart data={dashboard.atendimentosVsVendas} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vendas por Vendedor</CardTitle></CardHeader>
          <CardContent><BarChart data={dashboard.vendasPorVendedor} horizontal /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Atendimentos por Vendedor</CardTitle></CardHeader>
          <CardContent><BarChart data={dashboard.atendimentosPorVendedor} horizontal /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Melhor Dia da Semana</CardTitle></CardHeader>
          <CardContent><RadarChart data={dashboard.diaMaisVendas} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Conversão por Loja</CardTitle></CardHeader>
          <CardContent><PieChart data={dashboard.conversoesPorCanal} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
