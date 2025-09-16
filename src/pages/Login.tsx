import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { showSuccess, showError } from '@/utils/toast';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
await authService.login(formData.email, formData.senha);

// 🔸 marca que acabamos de logar (o Guard usa isso p/ não te expulsar)
localStorage.setItem('auth:justLoggedIn', String(Date.now()));

await new Promise((r) => setTimeout(r, 200));
showSuccess('Login realizado com sucesso!');
navigate('/app');

// fallback: se o router não trocar, força a troca
setTimeout(() => {
  if (window.location.pathname !== '/app') {
    window.location.replace('/app');
  }
}, 250);


    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError('Informe um e-mail válido.');
    }
    try {
      await authService.requestPasswordReset(email);
      showSuccess('Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.');
      setResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      showError(err?.message || 'Não foi possível enviar o e-mail de recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Marca */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Converte.Ai</h1>
          <p className="text-gray-700 text-base italic">Performance e resultados com inteligência</p>
        </div>

        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold text-gray-800">Acesse sua conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  required
                  className="bg-white text-gray-900"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="senha" className="text-gray-700">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Sua senha"
                    required
                    className="bg-white text-gray-900"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <div>
                <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                      Esqueci minha senha
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recuperar senha</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRequestReset} className="space-y-4">
                      <div>
                        <Label htmlFor="resetEmail">E-mail</Label>
                        <Input
                          id="resetEmail"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="bg-white text-gray-900"
                          required
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Enviar link</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Cadastre-se grátis
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Voltar para o site
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
