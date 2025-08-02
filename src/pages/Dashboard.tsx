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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(inicioMes.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
    if (user) loadDashboardData(inicioMes.toISOString().split('T')[0], hoje.toISOString().split('T')[0]);
  }, [user]);

  const loadDashboardData = async (inicio?: string, fim?: string) => {
    if (!user) return;
    // Aqui você deve adaptar o fetch para buscar dados por user_id e período
    // Exemplo: let data = await fetchDashboardDataFromSupabase(user.id, inicio, fim);
    // Por ora, vamos usar um placeholder (você deve adaptar conforme seu backend):
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
                  <Label htmlFor="dataInicio" className="text-gray-700 dark:text-[#A0AEC0]">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-white dark:bg-[#222C43] border border-gray-300 dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim" className="text-gray-700 dark:text-[#A0AEC0]">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-white dark:bg-[#222C43] border border-gray-300 dark:border-[#27304A] text-gray-900 dark:text-[#F3F4F6]"
                  />
                </div>
                <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" onClick={handleFilterChange}>
                  Aplicar Filtros
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-300 dark:border-[#27304A] text-gray-700 dark:text-[#A0AEC0]"
                  onClick={handleExportPDF}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Conversão por Dia */}
            <Card className="bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-[#F3F4F6]">Conversão por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.conversaoPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => formatDate(value)}
                      stroke="#64748B"
                      tick={{ fill: "#A0AEC0" }}
                    />
                    <YAxis stroke="#64748B" tick={{ fill: "#A0AEC0" }} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value)}
                      formatter={(value: number) => [formatPercentage(value), 'Conversão']}
                      contentStyle={{ backgroundColor: "#222C43", borderColor: "#27304A", color: "#F3F4F6" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversao" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversão por Loja */}
            <Card className="bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-[#F3F4F6]">Conversão por Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.conversaoPorLoja}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="loja" stroke="#64748B" tick={{ fill: "#A0AEC0" }} />
                    <YAxis stroke="#64748B" tick={{ fill: "#A0AEC0" }} />
                    <Tooltip formatter={(value: number) => [formatPercentage(value), 'Conversão']}
                      contentStyle={{ backgroundColor: "#222C43", borderColor: "#27304A", color: "#F3F4F6" }}
                    />
                    <Bar dataKey="conversao" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Vendedores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-[#F3F4F6]">Ranking de Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.conversaoPorVendedor.slice(0, 10).map((vendedor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#222C43] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-[#F3F4F6]">{vendedor.vendedor}</div>
                          <div className="text-sm text-gray-500 dark:text-[#A0AEC0]">
                            {vendedor.vendas} vendas / {vendedor.atendimentos} atendimentos
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatPercentage(vendedor.conversao)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-[#F3F4F6]">Distribuição por Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.conversaoPorLoja}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ loja, conversao }) => `${loja}: ${formatPercentage(conversao)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="conversao"
                    >
                      {dashboardData.conversaoPorLoja.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatPercentage(value), 'Conversão']}
                      contentStyle={{ backgroundColor: "#222C43", borderColor: "#27304A", color: "#F3F4F6" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
