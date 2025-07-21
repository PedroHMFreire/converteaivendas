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
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Store, 
  Target,
  Calendar,
  Download
} from 'lucide-react';
import { calculateDashboardData, formatPercentage, formatDate } from '@/lib/dashboard-utils';
import { DashboardData } from '@/types';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    // Definir período padrão (mês atual)
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    setDataInicio(inicioMes.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
    
    loadDashboardData();
  }, []);

  const loadDashboardData = (inicio?: string, fim?: string) => {
    const data = calculateDashboardData(inicio, fim);
    setDashboardData(data);
  };

  const handleFilterChange = () => {
    loadDashboardData(dataInicio, dataFim);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (!dashboardData) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dashboard...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Banner de Trial */}
          <TrialBanner />

          {/* Filtros */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Filtros de Período</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
                <Button onClick={handleFilterChange}>
                  Aplicar Filtros
                </Button>
                <Button variant="outline">
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
            />
            <MetricCard
              title="Total de Vendas"
              value={dashboardData.totalVendas.toLocaleString()}
              subtitle="Vendas efetivadas"
              icon={Target}
            />
            <MetricCard
              title="Melhor Vendedor"
              value={dashboardData.melhorVendedor}
              subtitle="Maior conversão do período"
              icon={Store}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Conversão por Dia */}
            <Card>
              <CardHeader>
                <CardTitle>Conversão por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.conversaoPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => formatDate(value)}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value)}
                      formatter={(value: number) => [formatPercentage(value), 'Conversão']}
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
            <Card>
              <CardHeader>
                <CardTitle>Conversão por Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.conversaoPorLoja}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="loja" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatPercentage(value), 'Conversão']} />
                    <Bar dataKey="conversao" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Vendedores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.conversaoPorVendedor.slice(0, 10).map((vendedor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{vendedor.vendedor}</div>
                          <div className="text-sm text-gray-500">
                            {vendedor.vendas} vendas / {vendedor.atendimentos} atendimentos
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatPercentage(vendedor.conversao)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Distribuição de Conversão */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Loja</CardTitle>
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
                    <Tooltip formatter={(value: number) => [formatPercentage(value), 'Conversão']} />
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