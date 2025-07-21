import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Check, 
  Star, 
  CreditCard,
  Shield,
  Zap,
  Users,
  Store,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { PlanoPreco } from '@/types/auth';
import { showSuccess } from '@/utils/toast';

const Upgrade = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const planos: PlanoPreco[] = [
    {
      id: 'basic',
      nome: 'Básico',
      preco: 97,
      periodo: 'mensal',
      maxLojas: 5,
      maxVendedores: 25,
      recursos: [
        'Até 5 lojas',
        'Até 25 vendedores',
        'Dashboard completo',
        'Relatórios básicos',
        'Suporte por email'
      ]
    },
    {
      id: 'premium',
      nome: 'Premium',
      preco: 197,
      periodo: 'mensal',
      maxLojas: 50,
      maxVendedores: 250,
      popular: true,
      recursos: [
        'Até 50 lojas',
        'Até 250 vendedores',
        'Dashboard avançado',
        'Relatórios completos',
        'Exportação de dados',
        'Suporte prioritário',
        'Treinamento incluído'
      ]
    },
    {
      id: 'enterprise',
      nome: 'Enterprise',
      preco: 397,
      periodo: 'mensal',
      maxLojas: 999,
      maxVendedores: 9999,
      recursos: [
        'Lojas ilimitadas',
        'Vendedores ilimitados',
        'Dashboard personalizado',
        'Relatórios avançados',
        'API personalizada',
        'Suporte 24/7',
        'Gerente de conta dedicado',
        'Integração personalizada'
      ]
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);

    // Simulação de processamento de pagamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Atualizar usuário com novo plano
    if (user) {
      const updatedUser = authService.updateProfile({
        plano: planId as any,
        ativo: true,
        dataExpiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
      });
      
      showSuccess('Plano atualizado com sucesso! Bem-vindo ao Convertê Premium!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const daysLeft = authService.getTrialDaysLeft();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Convertê</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Continue aproveitando todos os recursos do Convertê
          </p>
          
          {user?.plano === 'trial' && (
            <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full">
              <Shield className="w-4 h-4 mr-2" />
              {daysLeft > 0 ? `${daysLeft} dias restantes no seu teste` : 'Seu teste expirou'}
            </div>
          )}
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {planos.map((plano) => (
            <Card 
              key={plano.id} 
              className={`relative ${plano.popular ? 'ring-2 ring-blue-500 scale-105' : ''}`}
            >
              {plano.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plano.nome}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ {plano.preco}</span>
                  <span className="text-gray-600">/{plano.periodo}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plano.recursos.map((recurso, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{recurso}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={plano.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plano.id)}
                  disabled={isLoading && selectedPlan === plano.id}
                >
                  {isLoading && selectedPlan === plano.id ? (
                    'Processando...'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Escolher Plano
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recursos Inclusos */}
        <div className="bg-white rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Todos os planos incluem:
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Dashboard Profissional</h3>
              <p className="text-gray-600 text-sm">
                Visualizações estilo Power BI com gráficos interativos
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Gestão Completa</h3>
              <p className="text-gray-600 text-sm">
                Gerencie vendedores, lojas e registros de vendas
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Relatórios Instantâneos</h3>
              <p className="text-gray-600 text-sm">
                Rankings, métricas e análises em tempo real
              </p>
            </div>
          </div>
        </div>

        {/* Garantia */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center px-6 py-3 bg-green-50 text-green-800 rounded-full">
            <Shield className="w-5 h-5 mr-2" />
            Garantia de 30 dias - Cancele quando quiser
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;