import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, Calendar, Users, Target } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabaseClient';
import { authService } from '@/lib/auth';
import { Vendedor, Loja, RegistroVenda } from '@/types';

const dateOnly = (d: string) => new Date(d).toISOString().split('T')[0];

const RegistroVendas = () => {
  const navigate = useNavigate();

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [registros, setRegistros] = useState<RegistroVenda[]>([]);
  const [filtroLoja, setFiltroLoja] = useState<string>('all');
  const [formData, setFormData] = useState({
    vendedorId: '',
    data: new Date().toISOString().split('T')[0],
    atendimentos: 0,
    vendas: 0
  });
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const estatisticasHoje = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const registrosHoje = registros.filter(r => dateOnly(r.data) === hoje);

    const totalAtendimentos = registrosHoje.reduce((sum, r) => sum + (r.atendimentos || 0), 0);
    const totalVendas = registrosHoje.reduce((sum, r) => sum + (r.vendas || 0), 0);
    const conversaoMedia = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

    return {
      totalAtendimentos,
      totalVendas,
      conversaoMedia,
      registros: registrosHoje.length
    };
  };

  const stats = estatisticasHoje();

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.id) {
        showError('Usuário não autenticado');
        return;
      }
      setUserId(currentUser.id);
      await loadData(currentUser.id);
    };
    init();
    // eslint-disable-next-line
  }, []);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      // Lojas
      const { data: lojasData, error: errLojas } = await supabase
        .from('lojas')
        .select('*')
        .eq('user_id', uid)
        .order('nome', { ascending: true });
      if (errLojas) {
        console.error('Erro carregando lojas:', errLojas);
        showError(errLojas.message || 'Erro ao carregar lojas');
      } else {
        setLojas(lojasData || []);
      }

      // Vendedores
      const { data: vendedoresData, error: errVendedores } = await supabase
        .from('vendedores')
        .select('*')
        .eq('user_id', uid);
      if (errVendedores) {
        console.error('Erro carregando vendedores:', errVendedores);
        showError(errVendedores.message || 'Erro ao carregar vendedores');
      } else {
        setVendedores(vendedoresData || []);
      }

      // Registros de vendas (com alias para createdAt)
      const { data: registrosData, error: errRegistros } = await supabase
        .from('registro_vendas')
        .select('*, created_at as createdAt')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (errRegistros) {
        console.error('Erro carregando registros:', errRegistros);
        showError(errRegistros.message || 'Erro ao carregar registros');
      } else {
        const normalized = (registrosData || []).map((r: any) => ({
          ...r,
          createdAt: r.createdAt || r.created_at,
          data: r.data,
          atendimentos: r.atendimentos ?? 0,
          vendas: r.vendas ?? 0,
          conversao: r.conversao ?? 0,
        }));
        setRegistros(normalized);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendedorId: '',
      data: new Date().toISOString().split('T')[0],
      atendimentos: 0,
      vendas: 0
    });
  };

  const getVendedorNome = (vendedorId: string) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    return vendedor?.nome || 'Vendedor não encontrado';
  };

  const getLojaNome = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome || 'Loja não encontrada';
  };

  const vendedoresFiltrados = filtroLoja === 'all'
    ? vendedores
    : vendedores.filter(v => v.lojaId === filtroLoja);

  const registrosRecentes = [...registros]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!userId) {
      showError('Usuário não identificado');
      return;
    }
    if (!formData.vendedorId || !formData.data || formData.atendimentos < 0 || formData.vendas < 0) {
      showError('Preencha todos os campos corretamente');
      return;
    }
    if (formData.vendas > formData.atendimentos) {
      showError('O número de vendas não pode ser maior que o número de atendimentos');
      return;
    }

    const vendedor = vendedores.find(v => v.id === formData.vendedorId);
    if (!vendedor) {
      showError('Vendedor não encontrado');
      return;
    }

    const conversao = formData.atendimentos > 0 ? (formData.vendas / formData.atendimentos) * 100 : 0;

    setSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        vendedorId: formData.vendedorId,
        lojaId: vendedor.lojaId,
        data: formData.data,
        atendimentos: formData.atendimentos,
        vendas: formData.vendas,
        conversao,
      };

      const { data: inserted, error } = await supabase
        .from('registro_vendas')
        .insert([payload]);

      console.log('[DEBUG] insert registro_vendas:', { inserted, error, payload });

      if (error) {
        console.error('Erro ao salvar registro:', error);
        showError(error.message || 'Erro ao salvar registro.');
        return;
      }

      showSuccess('Registro de vendas salvo com sucesso!');
      resetForm();
      await loadData(userId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registrar Vendas</h1>
          <p className="text-gray-600 mt-2">Registre os atendimentos e vendas dos vendedores</p>
        </div>

        {/* Estatísticas do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registros Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.registros}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendimentos Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAtendimentos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVendas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão Hoje</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversaoMedia.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Registro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Novo Registro</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div>
                  <Label htmlFor="vendedorId">Vendedor *</Label>
                  <Select
                    value={formData.vendedorId}
                    onValueChange={(value) => setFormData({ ...formData, vendedorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedoresFiltrados.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome} - {getLojaNome(vendedor.lojaId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="atendimentos">Número de Atendimentos *</Label>
                  <Input
                    id="atendimentos"
                    type="number"
                    min="0"
                    value={formData.atendimentos}
                    onChange={(e) => setFormData({ ...formData, atendimentos: Number(e.target.value) })}
                    placeholder="Ex: 10"
                  />
                </div>

                <div>
                  <Label htmlFor="vendas">Número de Vendas *</Label>
                  <Input
                    id="vendas"
                    type="number"
                    min="0"
                    max={formData.atendimentos}
                    value={formData.vendas}
                    onChange={(e) => setFormData({ ...formData, vendas: Number(e.target.value) })}
                    placeholder="Ex: 3"
                  />
                </div>

                {formData.atendimentos > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">
                      Conversão Calculada: {((formData.vendas / formData.atendimentos) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Limpar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Registrando...' : 'Registrar Vendas'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Registros Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Registros Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {registrosRecentes.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum registro encontrado
                  </h3>
                  <p className="text-gray-600">
                    Comece registrando as vendas dos seus vendedores
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {registrosRecentes.map((registro) => (
                    <div key={registro.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{getVendedorNome(registro.vendedorId)}</div>
                          <div className="text-sm text-gray-500">{getLojaNome(registro.lojaId)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {registro.conversao?.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(registro.data).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Atendimentos: {registro.atendimentos}</span>
                        <span>Vendas: {registro.vendas}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico Completo */}
        {registros.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Histórico Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Atendimentos</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...registros]
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .slice(0, 20)
                    .map((registro) => (
                      <TableRow key={registro.id}>
                        <TableCell>
                          {new Date(registro.data).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getVendedorNome(registro.vendedorId)}
                        </TableCell>
                        <TableCell>{getLojaNome(registro.lojaId)}</TableCell>
                        <TableCell>{registro.atendimentos}</TableCell>
                        <TableCell>{registro.vendas}</TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              registro.conversao >= 25
                                ? 'text-green-600'
                                : registro.conversao >= 15
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {registro.conversao?.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RegistroVendas;
