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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, Store, Target, Calendar, Download } from 'lucide-react';
import { formatPercentage, formatDate } from '@/lib/dashboard-utils';
import { DashboardData } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabaseClient';
import { authService } from '@/lib/auth';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [user, setUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    // Atualiza o usuário logado, caso altere durante o uso (opcional)
    setUser(authService.getCurrentUser());
  }, []);

  useEffect(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(inicioMes.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
    if (user) loadDashboardData(inicioMes.toISOString().split('T')[0], hoje.toISOString().split('T')[0]);
  }, [user]);

  const loadDashboardData = async (inicio?: string, fim?: string) => {
    if (!user) return;
    // Aqui você pode trocar pelo seu fetch customizado se não estiver usando uma função RPC no Supabase
    // O importante é filtrar pelo user_id do usuário logado!
    const { data, error } = await supabase.rpc('calculate_dashboard_data', { user_id: user.id, inicio, fim });
    if (!error && data) setDashboardData(data);
  };

  const handleFilterChange = () => {
    loadDashboardData(dataInicio, dataFim);
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
        [`Período`, `${dataInicio} a ${dataFim}`]
      ],
      headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      styles: { fontSize: 12, textColor: [33, 37, 41] }
    });

    doc.setFontSize(10);
    doc.setTextColor(160, 160, 160);
    doc.text('Sistema Convertê - Relatório gerado automaticamente', 14, doc.internal.pageSize.getHeight() - 10);
    doc.save('relatorio-dashboard.pdf');
  };

  if (!dashboardData) {
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex flex-row gap-4 items-end">
              <div>
                <Label htmlFor="dataInicio">Data Inicial</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Final</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <Button className="ml-4 h-10 mt-5" onClick={handleFilterChange}>
                Filtrar
              </Button>
            </div>
            <Button variant="outline" className="border-gray-300 dark:border-[#27304A] text-gray-700 dark:text-[#A0AEC0]" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório PDF
            </Button>
          </div>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <MetricCard icon={<TrendingUp />} title="Conversão Geral" value={formatPercentage(dashboardData.conversaoGeral)} />
            <MetricCard icon={<Users />} title="Total de Atendimentos" value={dashboardData.totalAtendimentos.toLocaleString()} />
            <MetricCard icon={<Store />} title="Total de Vendas" value={dashboardData.totalVendas.toLocaleString()} />
            <MetricCard icon={<Target />} title="Melhor Vendedor" value={dashboardData.melhorVendedor} />
            <MetricCard icon={<Calendar />} title="Melhor Loja" value={dashboardData.melhorLoja} />
          </div>
          {/* Exemplo de gráfico de conversão por vendedor */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Conversão por Vendedor</h3>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={dashboardData.conversaoPorVendedor}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#A0AEC0" }} />
                <YAxis type="category" dataKey="vendedor" tick={{ fill: "#A0AEC0" }} width={150} />
                <Tooltip formatter={(value: number) => value.toFixed(1) + "%"} cursor={{ fill: "#dbeafe" }} />
                <Bar dataKey="conversao" fill="#3B82F6" radius={[4, 4, 4, 4]}>
                  {dashboardData.conversaoPorVendedor.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Mais gráficos conforme necessidade */}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
