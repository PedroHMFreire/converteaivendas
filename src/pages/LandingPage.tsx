import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Store, 
  CheckCircle,
  Star,
  ArrowRight,
  Target,
  Zap,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard Profissional',
      description: 'Visualize dados de conversão com gráficos estilo Power BI'
    },
    {
      icon: TrendingUp,
      title: 'Análise de Performance',
      description: 'Acompanhe a evolução de cada vendedor e loja em tempo real'
    },
    {
      icon: Users,
      title: 'Gestão de Vendedores',
      description: 'Cadastre e gerencie todos os vendedores de suas lojas'
    },
    {
      icon: Store,
      title: 'Multi-Lojas',
      description: 'Gerencie até 50 lojas diferentes em um só sistema'
    },
    {
      icon: Target,
      title: 'Metas e Rankings',
      description: 'Defina metas e acompanhe rankings de performance'
    },
    {
      icon: Zap,
      title: 'Relatórios Instantâneos',
      description: 'Gere relatórios detalhados por período, vendedor ou loja'
    }
  ];

  const benefits = [
    'Aumente a conversão de vendas em até 40%',
    'Identifique os melhores vendedores',
    'Otimize o treinamento da equipe',
    'Tome decisões baseadas em dados',
    'Melhore a gestão de lojas',
    'Reduza custos operacionais'
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      role: 'Gerente Regional',
      company: 'Rede Fashion Plus',
      content: 'O Convertê revolucionou nossa gestão. Aumentamos 35% na conversão em apenas 2 meses!'
    },
    {
      name: 'Ana Santos',
      role: 'Diretora Comercial',
      company: 'Mega Store',
      content: 'Finalmente conseguimos identificar nossos melhores vendedores e replicar suas estratégias.'
    },
    {
      name: 'Roberto Lima',
      role: 'Proprietário',
      company: 'Lima Calçados',
      content: 'Sistema simples e poderoso. Nossos gerentes adoraram a facilidade de uso.'
    }
  ];

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
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => navigate('/register')}>
                Teste Grátis
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Maximize Suas
            <span className="text-blue-600"> Conversões</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            O sistema mais completo para acompanhar e otimizar a performance de vendas 
            da sua rede de lojas. Dashboards profissionais, rankings e relatórios detalhados.
          </p>
          
          {/* Badge de teste gratuito */}
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full mb-8">
            <Shield className="w-4 h-4 mr-2" />
            7 dias grátis - Sem cartão de crédito
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="text-lg px-8 py-3"
            >
              Começar Teste Gratuito
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-3"
            >
              Já tenho conta
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Poderosas
            </h2>
            <p className="text-xl text-gray-600">
              Tudo que você precisa para gerenciar suas vendas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Por que escolher o Convertê?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Resultados Comprovados
                </h3>
                <p className="text-gray-600 mb-6">
                  Empresas que usam o Convertê veem resultados em até 30 dias
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">40%</div>
                    <div className="text-sm text-gray-500">Aumento médio</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">50+</div>
                    <div className="text-sm text-gray-500">Lojas atendidas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">98%</div>
                    <div className="text-sm text-gray-500">Satisfação</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              O que nossos clientes dizem
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 italic">"{testimonial.content}"</p>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                  <div className="text-sm text-blue-600">{testimonial.company}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para aumentar suas conversões?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Comece seu teste gratuito de 7 dias agora mesmo
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/register')}
            className="text-lg px-8 py-3"
          >
            Começar Teste Gratuito
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-blue-200 mt-4">
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Convertê</span>
              </div>
              <p className="text-gray-400">
                O sistema mais completo para gestão de conversões de vendas.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Funcionalidades</li>
                <li>Preços</li>
                <li>Demonstração</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Central de Ajuda</li>
                <li>Contato</li>
                <li>Treinamento</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Sobre</li>
                <li>Blog</li>
                <li>Carreiras</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Convertê. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;