import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MetricCard from '@/components/MetricCard';
import Header from '@/components/Header';
import TrialBanner from '@/components/TrialBanner';
import AuthGuard from '@/components/AuthGuard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Users, Store, Target, Calendar, Download } from 'lucide-react';
import { formatPercentage, formatDate } from '@/lib/dashboard-utils';
import { DashboardData } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { authService } from '@/lib/auth';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;
      setUserId(currentUser.id);

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const isoInicio = inicioMes.toISOString().split('T')[0];
      const isoFim = hoje.toISOString().split('T')[0];
      setDataInicio(isoInicio);
      setDataFim(isoFim);

      await loadDashboardData(isoInicio, isoFim, currentUser.id);
    };

    init();
    // eslint-disable-next-line
  }, []);

  const loadDashboardData = async (inicio?: string, fim?: string, uId?: string) => {
    if (!uId) return;
    setLoading(true);
    try {
      const { calculateDashboardData } = await import('@/lib/dashboard-utils');
      const data = await calculateDashboardData(uId, inicio, fim);
      setDashboardData(data);
    } catch (err) {
      console.error('Erro carregando dashboard:', err);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async () => {
    if (!userId) return;
    if (dataInicio > dataFim) {
      return; // poderia mostrar toast se quiser
    }
    await loadDashboardData(dataInicio, dataFim, userId);
  };

  const handleExportPDF = () => {
    if (!dashboardData) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(33, 150, 243);
    doc.text('Relatório de Conversão - Convertê', 14, 18);
    doc.setDrawColor(33, 150, 243);
    doc.line(14, 21, 196, 21);
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Exportado em: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 36,
      theme: 'striped',
      head: [['Métrica', 'Valor']],
      body: [
        ['Conversão Geral', formatPercentage(dashboardData.conversaoGeral)],
        ['Total de Atendimentos', dashboardData.totalAtendimentos.toLocaleString()],
        ['Total de Vendas', dashboardData.totalVendas.toLocaleString()],
        ['Melhor Vendedor', dashboardData.melhorVendedor],
        ['Melhor Loja', dashboardData.melhorLoja],
        ['Período', `${dataInicio} a ${dataFim}`],
      ],
      headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      styles: { fontSize: 12, textColor: [33, 37, 41] },
    });

    doc.setFontSize(10);
    doc.setTextColor(160, 160, 160);
    doc.text('Sistema Convertê - Relatório gerado automaticamente', 14, doc.internal.pageSize.getHeight() - 10);
    doc.save('relatorio-dashboard.pdf');
  };

  // se ainda não carregou userId, mostra carregando
  if (!userId || loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
          <Header />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-[#A0AEC0]">Carregando dashboard...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TrialBanner />
          <Card className="mb-8 bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-[#F3F4F6]">
                <Calendar className="w-5 h-5" />
                <span>Filtros de Período</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label htmlFor="dataInicio" className="text-gray-700 dark:text-[#A0AEC0]">
                    Data Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-white dark:bg-[#222C43] border border-gray-300 dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim" className="text-gray-700 dark:text-[#A0AEC0]">
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-white dark:bg-[#222C43] border border-gray-300 dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                  />
                </div>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={handleFilterChange}
                  disabled={loading}
                >
                  Aplicar Filtros
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 dark:border-[#27304A] text-gray-700 dark:text-[#A0AEC0]"
                  onClick={handleExportPDF}
                  disabled={!dashboardData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {!dashboardData && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-700">Sem dados para o período selecionado.</p>
            </div>
          )}

          {dashboardData && (
            <>
              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Conversão Geral"
                  value={formatPercentage(dashboardData.conversaoGeral)}
                  subtitle={`${dashboardData.totalVendas} vendas de ${dashboardData.totalAtendimentos} atendimentos`}
                  icon={TrendingUp}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                />
                <MetricCard
                  title="Total de Atendimentos"
                  value={dashboardData.totalAtendimentos.toLocaleString()}
                  subtitle="No período selecionado"
                  icon={Users}
                  className="bg-white dark:bg-[#1E2637] border dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                />
                <MetricCard
                  title="Total de Vendas"
                  value={dashboardData.totalVendas.toLocaleString()}
                  subtitle="Vendas efetivadas"
                  icon={Target}
                  className="bg-white dark:bg-[#1E2637] border dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                />
                <MetricCard
                  title="Melhor Vendedor"
                  value={dashboardData.melhorVendedor}
                  subtitle="Maior conversão do período"
                  icon={Store}
                  className="bg-white dark:bg-[#1E2637] border dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                />
              </div>

              {/* Gráficos */}
              {/* ... Aqui você pode reutilizar os gráficos do dashboard antigo com os dados de dashboardData ... */}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
