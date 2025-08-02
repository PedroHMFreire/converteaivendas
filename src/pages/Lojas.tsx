import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header';
import { Plus, Store, Edit, Trash2, MapPin, Phone, User } from 'lucide-react';
import { Loja } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabaseClient';

const Lojas = () => {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    telefone: '',
    gerente: ''
  });
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setUserId(data.user.id);
        loadLojas(data.user.id);
      }
    };
    fetchUser();
  }, []);

  const loadLojas = async (uid = userId) => {
    if (!uid) return;
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (error) {
      showError('Erro ao carregar lojas');
      return;
    }
    setLojas(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.endereco || !formData.gerente) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }
    if (!userId) return;

    if (editingLoja) {
      // Editar loja existente
      const { error } = await supabase
        .from('lojas')
        .update({ ...formData })
        .eq('id', editingLoja.id)
        .eq('user_id', userId);
      if (error) {
        showError('Erro ao atualizar loja');
      } else {
        showSuccess('Loja atualizada com sucesso!');
        resetForm();
        loadLojas();
      }
    } else {
      // Criar nova loja
      const { error } = await supabase
        .from('lojas')
        .insert([{
          ...formData,
          user_id: userId
        }]);
      if (error) {
        showError('Erro ao cadastrar loja');
      } else {
        showSuccess('Loja cadastrada com sucesso!');
        resetForm();
        loadLojas();
      }
    }
  };

  const handleEdit = (loja: Loja) => {
    setEditingLoja(loja);
    setFormData({
      nome: loja.nome,
      endereco: loja.endereco,
      telefone: loja.telefone,
      gerente: loja.gerente
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (lojaId: string) => {
    if (confirm('Tem certeza que deseja excluir esta loja?')) {
      const { error } = await supabase
        .from('lojas')
        .delete()
        .eq('id', lojaId)
        .eq('user_id', userId);
      if (error) {
        showError('Erro ao excluir loja');
      } else {
        showSuccess('Loja excluída com sucesso!');
        loadLojas();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      telefone: '',
      gerente: ''
    });
    setEditingLoja(null);
    setIsDialogOpen(false);
  };

  // Busca quantos vendedores há para cada loja
  const getVendedoresCount = async (lojaId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('vendedores')
      .select('*', { count: 'exact', head: true })
      .eq('lojaId', lojaId)
      .eq('user_id', userId);
    return data?.length ?? 0;
  };

  // Usando um hook para calcular os vendedores por loja e exibir
  const [vendedoresPorLoja, setVendedoresPorLoja] = useState<{[lojaId: string]: number}>({});

  useEffect(() => {
    const fetchVendedoresCount = async () => {
      let map: {[lojaId: string]: number} = {};
      for (const loja of lojas) {
        const { count } = await supabase
          .from('vendedores')
          .select('id', { count: 'exact', head: true })
          .eq('lojaId', loja.id)
          .eq('user_id', userId);
        map[loja.id] = count || 0;
      }
      setVendedoresPorLoja(map);
    };
    if (lojas.length > 0 && userId) {
      fetchVendedoresCount();
    }
  }, [lojas, userId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Lojas</h1>
            <p className="text-gray-600 mt-2">Cadastre e gerencie suas lojas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Loja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLoja ? 'Editar Loja' : 'Nova Loja'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Loja *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Loja Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço *</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    placeholder="Ex: Rua das Flores, 123"
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
                  <Label htmlFor="gerente">Gerente *</Label>
                  <Input
                    id="gerente"
                    value={formData.gerente}
                    onChange={(e) => setFormData({...formData, gerente: e.target.value})}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingLoja ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lojas.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(vendedoresPorLoja).reduce((total, n) => total + n, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Vendedores/Loja</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lojas.length > 0 
                  ? (Object.values(vendedoresPorLoja).reduce((total, n) => total + n, 0) / lojas.length).toFixed(1)
                  : '0'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Lojas */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Lojas</CardTitle>
          </CardHeader>
          <CardContent>
            {lojas.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma loja cadastrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece cadastrando sua primeira loja
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeira Loja
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Gerente</TableHead>
                    <TableHead>Vendedores</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lojas.map((loja) => (
                    <TableRow key={loja.id}>
                      <TableCell className="font-medium">{loja.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{loja.endereco}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{loja.telefone || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{loja.gerente}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                          {vendedoresPorLoja[loja.id] ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(loja)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(loja.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Lojas;
