import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, CheckCircle, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const [loginData, setLoginData] = useState({
    email: '',
    senha: ''
  });

  const [registerData, setRegisterData] = useState({
    nome: '',
    email: '',
    empresa: '',
    telefone: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(loginData.email, loginData.senha);
      showSuccess('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro no login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await register(registerData);
      showSuccess('Conta criada com sucesso! Teste grátis por 7 dias ativado.');
      navigate('/dashboard');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro no cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    'Dashboard profissional estilo Power BI',
    'Gestão completa de múltiplas lojas',
    'Rankings e relatórios detalhados',
    'Controle de metas por vendedor',
    'Análise de conversão em tempo real'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Lado esquerdo - Informações */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start space-x-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Convertê</span>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Maximize suas conversões de vendas
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            O sistema mais completo para acompanhar e otimizar a performance 
            de vendas da sua rede de lojas.
          </p>

          <div className="space-y-4 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-center space-x-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-gray-600 italic mb-2">
              "Aumentamos nossa conversão em 40% em apenas 2 meses!"
            </p>
            <p className="text-sm text-gray-500">
              - Carlos Silva, Gerente Regional
            </p>
          </div>
        </div>

        {/* Lado direito - Formulários */}
        <div className="w-full max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Comece seu teste grátis
              </CardTitle>
              <p className="text-center text-gray-600">
                7 dias grátis • Sem cartão de crédito
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="register" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="register">Criar Conta</TabsTrigger>
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                </TabsList>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={registerData.nome}
                        onChange={(e) => setRegisterData({...registerData, nome: e.target.value})}
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="empresa">Nome da Empresa *</Label>
                      <Input
                        id="empresa"
                        value={registerData.empresa}
                        onChange={(e) => setRegisterData({...registerData, empresa: e.target.value})}
                        placeholder="Nome da sua empresa"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={registerData.telefone}
                        onChange={(e) => setRegisterData({...registerData, telefone: e.target.value})}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Criando conta...' : 'Começar teste grátis'}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="loginEmail">E-mail</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="senha">Senha</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={loginData.senha}
                        onChange={(e) => setLoginData({...loginData, senha: e.target.value})}
                        placeholder="Sua senha"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Demo:</strong> Use qualquer email cadastrado com qualquer senha
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;