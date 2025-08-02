import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header';
import { Plus, Users, Edit, Trash2, Mail, Phone, Target, Store } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Vendedor, Loja } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

const Vendedores = () => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [filtroLoja, setFiltroLoja] = useState<string>('all');
  const [formData, setFormData] = useState({
    nome: '',
    lojaId: '',
    email: '',
    telefone: '',
    meta: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const vendedoresData = storage.getVendedores();
    const lojasData = storage.getLojas();
    setVendedores(vendedoresData);
    setLojas(lojasData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.lojaId) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingVendedor) {
      // Editar vendedor existente
      const vendedoresAtualizados = vendedores.map(vendedor => 
        vendedor.id === editingVendedor.id 
          ? { ...vendedor, ...formData }
          : vendedor
      );
      storage.setVendedores(vendedoresAtualizados);
      showSuccess('Vendedor atualizado com sucesso!');
    } else {
      // Criar novo vendedor
      const novoVendedor: Vendedor = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      storage.addVendedor(novoVendedor);
      showSuccess('Vendedor cadastrado com sucesso!');
    }

    resetForm();
    loadData();
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      lojaId: vendedor.lojaId,
      email: vendedor.email,
      telefone: vendedor.telefone,
      meta: vendedor.meta
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (vendedorId: string) => {
    if (confirm('Tem certeza que deseja excluir este vendedor?')) {
      const vendedoresAtualizados = vendedores.filter(vendedor => vendedor.id !== vendedorId);
      storage.setVendedores(vendedoresAtualizados);
      loadData();
      showSuccess('Vendedor excluído com sucesso!');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      lojaId: '',
      email: '',
      telefone: '',
      meta: 0
    });
    setEditingVendedor(null);
    setIsDialogOpen(false);
  };

  const getLojaNome = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome || 'Loja não encontrada';
  };

  const vendedoresFiltrados = filtroLoja === 'all'
    ? vendedores
    : vendedores.filter(v => v.lojaId === filtroLoja);

  const getVendasDoVendedor = (vendedorId: string) => {
    const registros = storage.getRegistrosByVendedor(vendedorId);
    const totalVendas = registros.reduce((sum, r) => sum + r.vendas, 0);
    const totalAtendimentos = registros.reduce((sum, r) => sum + r.atendimentos, 0);
    const conversao = totalAtendimentos > 0 ? (totalVendas / totalAtendimentos) * 100 : 0;
    
    return { totalVendas, totalAtendimentos, conversao };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Vendedores</h1>
            <p className="text-gray-600 mt-2">Cadastre e gerencie seus vendedores</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Vendedor
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
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Maria Silva"
                  />
                
                </div>
                <div>
                  <Label htmlFor="lojaId">Loja *</Label>
                  <Select value={formData.lojaId} onValueChange={(value) => setFormData({...formData, lojaId: value})}>
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
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Ex: maria@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="meta">Meta de Conversão (%)</Label>
                  <Input
                    id="meta"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.meta}
                    onChange={(e) => setFormData({...formData, meta: Number(e.target.value)})}
                    placeholder="Ex: 25"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingVendedor ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
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
            </div>
          </CardContent>
        </Card>

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
                  ? (vendedoresFiltrados.reduce((sum, v) => sum + v.meta, 0) / vendedoresFiltrados.length).toFixed(1)
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
                {vendedoresFiltrados.filter(v => v.meta > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Vendedores */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {vendedoresFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filtroLoja !== 'all' ? 'Nenhum vendedor nesta loja' : 'Nenhum vendedor cadastrado'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {filtroLoja !== 'all' ? 'Tente selecionar outra loja' : 'Comece cadastrando seu primeiro vendedor'}
                </p>
                {filtroLoja === 'all' && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeiro Vendedor
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedoresFiltrados.map((vendedor) => {
                    const performance = getVendasDoVendedor(vendedor.id);
                    return (
                      <TableRow key={vendedor.id}>
                        <TableCell className="font-medium">{vendedor.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Store className="w-4 h-4 text-gray-400" />
                            <span>{getLojaNome(vendedor.lojaId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{vendedor.email || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{vendedor.telefone || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                            {vendedor.meta}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className={`font-medium ${
                              performance.conversao >= vendedor.meta ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {performance.conversao.toFixed(1)}%
                            </div>
                            <div className="text-gray-500">
                              {performance.totalVendas}/{performance.totalAtendimentos}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(vendedor)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(vendedor.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Vendedores;
