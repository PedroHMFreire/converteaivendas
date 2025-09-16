import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { showSuccess, showError } from '@/utils/toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Quando o link do email abre, Supabase envia code/type=recovery na URL.
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.warn('Nenhuma sessão trocada (pode já estar ativa):', error.message);
        }
        if (!alive) return;
        setSessionReady(true);
      } catch (e) {
        console.warn('exchangeCodeForSession falhou (pode não ser necessário):', e);
        setSessionReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) return showError('A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirm) return showError('As senhas não conferem.');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      showSuccess('Senha atualizada com sucesso! Faça login.');
      navigate('/login');
    } catch (err: any) {
      showError(err?.message || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Converte.Ai</h1>
          <p className="text-gray-700 text-base italic">Redefinir senha</p>
        </div>

        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold text-gray-800">Definir nova senha</CardTitle>
          </CardHeader>
          <CardContent>
            {!sessionReady ? (
              <div className="text-center text-gray-600">Preparando sessão...</div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-gray-700">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirm" className="text-gray-700">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirme a nova senha"
                    className="bg-white text-gray-900"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
