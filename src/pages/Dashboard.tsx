// Dashboard.tsx (versão mesclada e endurecida)
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { supabase } from '@/lib/supabaseClient';
import { calculateDashboardData } from '@/lib/dashboard-utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const defaultDateRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    inicio: firstDay.toISOString().slice(0, 10),
    fim: lastDay.toISOString().slice(0, 10),
  };
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataInicio, setDataInicio] = useState<string>(() => defaultDateRange().inicio);
  const [dataFim, setDataFim] = useState<string>(() => defaultDateRange().fim);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const fetchRef = useRef<number | null>(null);
  const debounceTimer = useRef<any>(null);

  // obtém sessão / user
  const loadUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadUser]);

  const loadDashboardData = useCallback(
    async (inicio: string, fim: string, uid: string) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // primeira tentativa: RPC Supabase
        const { data, error } = await supabase
          .rpc('calculate_dashboard_data', {
            user_id: uid,
            inicio,
            fim,
          })
          .throwOnError();

        if (error || !data) {
          throw error ?? new Error('Resposta vazia da RPC');
        }

        // validar estrutura mínima
        const parsed: Partial<DashboardData> = data as any;
        if (
          typeof parsed.conversaoGeral === 'undefined' ||
          typeof parsed.totalVendas === 'undefined'
        ) {
          throw new Error('Formato inesperado da RPC');
        }

        setDashboardData(parsed as DashboardData);
        setLastUpdated(new Date().toLocaleString('pt-BR'));
      } catch (rpcErr) {
        console.warn('Erro na RPC, caindo no fallback local:', rpcErr);
        // fallback local: calcula no cliente
        try {
          const local = await calculateDashboardData(inicio, fim);
          setDashboardData(local);
          setLastUpdated(new Date().toLocaleString('pt-BR') + ' (modo local)');
          setErrorMsg('Dados exibidos em fallback local; pode não estar 100% sincronizado.');
        } catch (localErr) {
          console.error('Erro no fallback local também:', localErr);
          setErrorMsg('Falha ao carregar dados. Tente novamente mais tarde.');
          setDashboardData(null);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // debounce e evitar fetchs paralelos
  useEffect(() => {
    if (!userId) return;
    // limpar anterior
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadDashboardData(dataInicio, dataFim, userId);
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [dataInicio, dataFim, userId, loadDashboardData]);

  const handleExportPDF = () => {
    if (!dashboardData) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório do Dashboard', 14, 22);
    doc.setFontSize(11);
    doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 36);

    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: [
        ['Conversão Geral', formatPercentage(dashboardData.conversaoGeral)],
        ['Total de Vendas', dashboardData.totalVendas],
        ['Total de Atendimentos', dashboardData.totalAtendimentos],
        ['Ticket Médio', dashboardData.ticketMedio],
        ['Melhor Loja', dashboardData.melhorLoja],
        ['Período', `${dataInicio} a ${dataFim}`],
      ],
      headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      styles: { fontSize: 12, textColor: [33, 37, 41] },
    });

    doc.setFontSize(10);
    doc.setTextColor(160, 160, 160);
    doc.text(
      'Sistema Convertê - Relatório gerado automaticamente',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.save('relatorio-dashboard.pdf');
  };

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <TrialBanner />
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label htmlFor="inicio">Início</Label>
                <Input
                  id="inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>
              <div>
                <Label htmlFor="fim">Fim</Label>
                <Input
                  id="fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>
              <div className="ml-auto flex gap-2 items-center">
                {lastUpdated && (
                  <div className="text-sm text-gray-500 dark:text-gray-300">
                    Última atualização: {lastUpdated}
                  </div>
                )}
                <Button onClick={() => userId && loadDashboardData(dataInicio, dataFim, userId)}>
                  <Download className="w-4 h-4 mr-1" />
                  Atualizar
                </Button>
                <Button onClick={handleExportPDF}>
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded mb-2">
                {errorMsg}
              </div>
            )}

            {!dashboardData && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-700">Sem dados para o período selecionado.</p>
              </div>
            )}

            {dashboardData && (
              <>
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
                    value={dashboardData.totalAtendimentos}
                    icon={Users}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                  />
                  <MetricCard
                    title="Ticket Médio"
                    value={dashboardData.ticketMedio}
                    icon={Target}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white"
                  />
                  <MetricCard
                    title="Melhor Loja"
                    value={dashboardData.melhorLoja}
                    icon={Store}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                  />
                </div>

                {/* Gráficos adicionais como no original */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição de Conversão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={dashboardData.conversoesPorCanal}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            label
                          >
                            {dashboardData.conversoesPorCanal.map((entry, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  {/* outros cards de linha / barra se existirem no dashboardData */}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
