import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header';
import { Plus, Users, Edit, Trash2, Mail, Phone, Target, Store, Download, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccess, showError } from '@/utils/toast';

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#F472B6", "#FCD34D", "#6EE7B7", "#A78BFA", "#F87171"
];

const Vendedores = () => {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<any | null>(null);
  const [filtroLoja, setFiltroLoja] = useState<string>('all');
  const [formData, setFormData] = useState({
    nome: '',
    lojaId: '',
    email: '',
    telefone: '',
    meta: ''
  });

  // PRÊMIO DA SEMANA
  const [premioSemana, setPremioSemana] = useState("3 FOLGAS. 300 REAIS. VIAGEM PARA ATINS");
  const [editandoPremio, setEditandoPremio] = useState(false);
  const [novoPremio, setNovoPremio] = useState(premioSemana);

  // Carregar user e dados ao montar
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setUserId(data.user.id);
        loadData(data.user.id);
      }
    })();
    // eslint-disable-next-line
  }, []);

  // Buscar vendedores/lojas do usuário
  const loadData = async (uid: string) => {
    // Vendedores
    const { data: vendedoresData } = await supabase
      .from('vendedores')
      .select('*')
      .eq('user_id', uid);
    setVendedores(vendedoresData || []);
    // Lojas
    const { data: lojasData } = await supabase
      .from('lojas')
      .select('*')
      .eq('user_id', uid);
    setLojas(lojasData || []);
  };

  // CADASTRAR OU EDITAR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.lojaId) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }
    if (!userId) return;

    if (editingVendedor) {
      // Editar
      const { error } = await supabase
        .from('vendedores')
        .update({
          nome: formData.nome,
          lojaId: formData.lojaId,
          email: formData.email,
          telefone: formData.telefone,
          meta: Number(formData.meta),
          user_id: userId
        })
        .eq('id', editingVendedor.id)
        .eq('user_id', userId);
      if (!error) showSuccess('Vendedor atualizado com sucesso!');
      else showError('Erro ao atualizar vendedor');
    } else {
      // Novo
      const { error } = await supabase
        .from('vendedores')
        .insert([{
          nome: formData.nome,
          lojaId: formData.lojaId,
          email: formData.email,
          telefone: formData.telefone,
          meta: Number(formData.meta),
          user_id: userId
        }]);
      if (!error) showSuccess('Vendedor cadastrado com sucesso!');
      else showError('Erro ao cadastrar vendedor');
    }
    resetForm();
    loadData(userId);
  };

  const handleEdit = (vendedor: any) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      lojaId: vendedor.lojaId,
      email: vendedor.email,
      telefone: vendedor.telefone,
      meta: vendedor.meta?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (vendedorId: string) => {
    if (!userId) return;
    if (confirm('Tem certeza que deseja excluir este vendedor?')) {
      await supabase
        .from('vendedores')
        .delete()
        .eq('id', vendedorId)
        .eq('user_id', userId);
      loadData(userId);
      showSuccess('Vendedor excluído com sucesso!');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      lojaId: '',
      email: '',
      telefone: '',
      meta: ''
    });
    setEditingVendedor(null);
    setIsDialogOpen(false);
  };

  const getLojaNome = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome || 'Loja não identificada';
  };

  // Carregar registros de vendas
  const getVendasDoVendedor = (vendedorId: string) => {
    // Aqui você pode fazer uma query no Supabase para buscar registros desse vendedor
    // Exemplo: SELECT * FROM registros WHERE vendedorId = ? AND user_id = ?
    // Para o exemplo, retorna valores mockados:
    // FAÇA: buscar esses dados do supabase se já tiver a tabela de registros
    return { totalVendas: 0, totalAtendimentos: 0, conversao: 0 }; // MOCK! Substitua depois
  };

  // RANKING PARA O GRÁFICO E PDF
  const rankingVendedores = vendedores
    .map(v => ({
      nome: v.nome,
      lojaId: v.lojaId,
      conversao: getVendasDoVendedor(v.id).conversao,
      totalVendas: getVendasDoVendedor(v.id).totalVendas,
      totalAtendimentos: getVendasDoVendedor(v.id).totalAtendimentos
    }))
    .sort((a, b) => b.conversao - a.conversao);

  // Exportação PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Vendedores", 14, 22);

    autoTable(doc, {
      startY: 40,
      head: [['Nome', 'Loja', 'Conversão (%)', 'Vendas', 'Atendimentos']],
      body: rankingVendedores.map((v) => [
        v.nome,
        getLojaNome(v.lojaId) || '-',
        v.conversao?.toFixed(1) || '0',
        v.totalVendas,
        v.totalAtendimentos
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 60 },
      alternateRowStyles: { fillColor: [237, 242, 247] },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    doc.save('relatorio_vendedores.pdf');
  };

  const vendedoresFiltrados = filtroLoja === 'all'
    ? vendedores
    : vendedores.filter(v => v.lojaId === filtroLoja);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Prêmio da Semana */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Card className="flex-1 bg-gradient-to-r from-yellow-100 to-yellow-300 dark:from-[#FFD600]/20 dark:to-[#FFB300]/20 border-0 shadow-lg">
            <CardContent className="flex items-center gap-4 py-5">
              <Award className="w-12 h-12 text-yellow-500 drop-shadow-lg" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-400 mb-2">
                  PRÊMIO DA SEMANA
                </h3>
                {editandoPremio ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={novoPremio}
                      onChange={e => setNovoPremio(e.target.value)}
                      className="flex-1"
                      maxLength={60}
                    />
                    <Button size="sm" onClick={() => { setPremioSemana(novoPremio); setEditandoPremio(false); }}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditandoPremio(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-md font-semibold">{premioSemana}</span>
                    <Button size="sm" variant="outline" onClick={() => { setNovoPremio(premioSemana); setEditandoPremio(true); }}>
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Gráfico */}
        {rankingVendedores.length > 0 && (
          <Card className="mb-8 bg-white dark:bg-[#1E2637] border border-gray-200 dark:border-[#27304A] shadow">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-[#F3F4F6]">
                Ranking dos Vendedores (Conversão)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    layout="vertical"
                    data={rankingVendedores}
                    margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "#A0AEC0" }} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: "#A0AEC0" }} width={150} />
                    <Tooltip
                      formatter={(value: number) => value.toFixed(1) + "%"}
                      cursor={{ fill: "#dbeafe" }}
                      contentStyle={{ backgroundColor: "#222C43", borderColor: "#27304A", color: "#F3F4F6" }}
                    />
                    <Bar dataKey="conversao" fill="#3B82F6" radius={[4, 4, 4, 4]}>
                      {rankingVendedores.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros + Exportação */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filtroLoja">Filtrar por Loja</Label>
                  <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as lojas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as lojas</SelectItem>
                      {lojas.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Botão Exportar PDF */}
                <div className="flex items-end md:col-span-2 justify-end">
                  <Button
                    variant="outline"
                    className="border-gray-300 dark:border-[#27304A] text-gray-700 dark:text-[#A0AEC0]"
                    onClick={exportarPDF}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Relatório PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendedoresFiltrados.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta Média</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vendedoresFiltrados.length > 0
                  ? (vendedoresFiltrados.reduce((sum, v) => sum + (Number(v.meta) || 0), 0) / vendedoresFiltrados.length).toFixed(1)
                  : '0'
                }%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(vendedoresFiltrados.map(v => v.lojaId)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Meta Definida</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vendedoresFiltrados.filter(v => Number(v.meta) > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Vendedores */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vendedores</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="ml-4"
                  onClick={() => resetForm()}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {editingVendedor ? 'Editar Vendedor' : 'Cadastrar Vendedor'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Vendedor *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Maria Silva"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lojaId">Loja *</Label>
                    <Select value={formData.lojaId} onValueChange={(value) => setFormData({ ...formData, lojaId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {lojas.map((loja) => (
                          <SelectItem key={loja.id} value={loja.id}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e
