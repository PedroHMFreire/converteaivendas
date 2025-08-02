import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { authService } from '@/lib/auth';
import { showError, showSuccess } from '@/utils/toast';

type Vendedor = {
  id: string;
  nome: string;
  lojaId: string;
  email?: string | null;
  telefone?: string | null;
  meta?: number | null;
  user_id: string;
};

const Vendedores = () => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    lojaId: '',
    email: '',
    telefone: '',
    meta: '',
  });
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.id) {
        showError('Usuário não autenticado');
        return;
      }
      setUserId(currentUser.id);
      await loadVendedores(currentUser.id);
    };
    init();
    // eslint-disable-next-line
  }, []);

  const loadVendedores = async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar vendedores:', error);
        showError(error.message || 'Erro ao carregar vendedores');
        return;
      }
      setVendedores(data || []);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      lojaId: '',
      email: '',
      telefone: '',
      meta: '',
    });
    setEditingVendedor(null);
    setIsDialogOpen(false);
    setSubmitting(false);
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      lojaId: vendedor.lojaId,
      email: vendedor.email || '',
      telefone: vendedor.telefone || '',
      meta: vendedor.meta != null ? String(vendedor.meta) : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm('Tem certeza que deseja excluir este vendedor?')) return;
    try {
      const { error } = await supabase
        .from('vendedores')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) {
        console.error('Erro ao excluir vendedor:', error);
        showError(error.message || 'Erro ao excluir vendedor');
      } else {
        showSuccess('Vendedor excluído com sucesso!');
        await loadVendedores(userId);
      }
    } catch (err) {
      console.error('Erro inesperado ao excluir vendedor:', err);
      showError('Erro ao excluir vendedor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!userId) {
      showError('Usuário não identificado');
      return;
    }
    if (!formData.nome || !formData.lojaId) {
      showError('Nome e Loja são obrigatórios');
      return;
    }

    // Normalizar e validar meta
    const rawMeta = String(formData.meta || '').trim();
    const metaValue = rawMeta !== '' ? Number(rawMeta) : 0;
    if (isNaN(metaValue)) {
      showError('Meta inválida');
      return;
    }

    setSubmitting(true);

    const payload = {
      nome: formData.nome,
      lojaId: formData.lojaId,
      email: formData.email || null,
      telefone: formData.telefone || null,
      meta: metaValue,
      user_id: userId,
    };

    try {
      if (editingVendedor) {
        const { data, error, status } = await supabase
          .from('vendedores')
          .update(payload)
          .eq('id', editingVendedor.id)
          .eq('user_id', userId);
        console.log('[DEBUG] update vendedor:', { status, data, error });
        if (error) {
          console.error('Erro ao atualizar vendedor:', error);
          showError(error.message || 'Erro ao atualizar vendedor');
        } else {
          showSuccess('Vendedor atualizado com sucesso!');
          resetForm();
          await loadVendedores(userId);
        }
      } else {
        const { data, error, status } = await supabase
          .from('vendedores')
          .insert([payload]);
        console.log('[DEBUG] insert vendedor:', { status, data, error, payload });
        if (error) {
          console.error('Erro ao cadastrar vendedor:', error);
          showError(error.message || 'Erro ao cadastrar vendedor');
        } else {
          showSuccess('Vendedor cadastrado com sucesso!');
          resetForm();
          await loadVendedores(userId);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101624]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Vendedores
            </h1>
            <p className="text-gray-600 mt-2">Cadastre e edite seus vendedores</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do vendedor"
                  />
                </div>
                <div>
                  <Label htmlFor="lojaId">Loja ID *</Label>
                  <Input
                    id="lojaId"
                    value={formData.lojaId}
                    onChange={(e) => setFormData({ ...formData, lojaId: e.target.value })}
                    placeholder="ID da loja"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="meta">Meta</Label>
                  <Input
                    id="meta"
                    value={formData.meta}
                    onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {editingVendedor
                      ? submitting
                        ? 'Atualizando...'
                        : 'Atualizar'
                      : submitting
                      ? 'Cadastrando...'
                      : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {vendedores.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum vendedor cadastrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece cadastrando seu primeiro vendedor
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Loja ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.nome}</TableCell>
                      <TableCell>{v.lojaId}</TableCell>
                      <TableCell>{v.email || '-'}</TableCell>
                      <TableCell>{v.telefone || '-'}</TableCell>
                      <TableCell>{v.meta != null ? v.meta : '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(v)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(v.id)}
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

export default Vendedores;
