import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header';
import { Plus, TrendingUp, Calendar, Users, Target } from 'lucide-react';
import { Vendedor, Loja, RegistroVenda } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabaseClient';
import { authService } from '@/lib/auth'; // <-- ADICIONADO FORA DO COMPONENTE

const user = authService.getCurrentUser(); // <-- BUSCA O USUÁRIO FORA DO COMPONENTE

const RegistroVendas = () => {
  const userId = user?.id;

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

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    // Lojas
    const { data: lojasData } = await supabase
      .from('lojas')
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    // Vendedores
    const { data: vendedoresData } = await supabase
      .from('vendedores')
      .select('*')
      .eq('user_id', userId);

    // Registros de vendas
    const { data: registrosData } = await supabase
      .from('registro_vendas')
      .select('*')
      .eq('user_id', userId);

    setLojas(lojasData || []);
    setVendedores(vendedoresData || []);
    setRegistros(registrosData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const { error } = await supabase.from('registro_vendas').insert([{
      user_id: userId,
      vendedorId: formData.vendedorId,
      lojaId: vendedor.lojaId,
      data: formData.data,
      atendimentos: formData.atendimentos,
      vendas: formData.vendas,
      conversao,
      createdAt: new Date().toISOString(),
    }]);

    if (error) {
      showError('Erro ao salvar registro.');
      return;
    }

    showSuccess('Registro de vendas salvo com sucesso!');
    resetForm();
    loadData();
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

  const estatisticasHoje = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const registrosHoje = registros.filter(r => r.data === hoje);

    const totalAtendimentos = registrosHoje.reduce((sum, r) => sum + r.atendimentos, 0);
    const totalVendas = registrosHoje.reduce((sum, r) => sum + r.vendas, 0);
    const conversaoMedia = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;

    return {
      totalAtendimentos,
      totalVendas,
      conversaoMedia,
      registros: registrosHoje.length
    };
  };

  const stats = estatisticasHoje();

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
                  <Select value={formData.vendedorId} onValueChange={(value) => setFormData({...formData, vendedorId: value})}>
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
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="atendimentos">Número de Atendimentos *</Label>
                  <Input
                    id="atendimentos"
                    type="number"
                    min="0"
                    value={formData.atendimentos}
                    onChange={(e) => setFormData({...formData, atendimentos: Number(e.target.value)})}
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
                    onChange={(e) => setFormData({...formData, vendas: Number(e.target.value)})}
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
                  <Button type="submit">
                    Registrar Vendas
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
        {/* Tabela de Todos os Registros */}
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
                        <span className={`font-medium ${
                          registro.conversao >= 25 ? 'text-green-600' : 
                          registro.conversao >= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
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
