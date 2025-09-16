// src/pages/LandingPage.tsx
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
  Shield,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  // ✅ Features atualizadas (inclui IA e Vendas Perdidas)
  const features = [
    {
      icon: Lightbulb,
      title: 'Insights de IA',
      description:
        'Recomendações diárias do que fazer para vender mais: oportunidades, gargalos e próximos passos.',
    },
    {
      icon: BarChart3,
      title: 'Dashboard Profissional',
      description: 'Visualize conversão, funil e evolução com gráficos de alto impacto.',
    },
    {
      icon: AlertTriangle,
      title: 'Vendas Perdidas',
      description:
        'Entenda quanto está deixando na mesa. Motivos da perda e plano de recuperação sugerido.',
    },
    {
      icon: TrendingUp,
      title: 'Performance em Tempo Real',
      description: 'Acompanhe resultados por dia, loja e vendedor — tudo atualizado.',
    },
    {
      icon: Users,
      title: 'Gestão de Vendedores',
      description: 'Cadastre times, defina metas e compare desempenhos com rankings.',
    },
    {
      icon: Store,
      title: 'Multi-Lojas',
      description: 'Gerencie várias unidades em um só lugar, com visão macro e por loja.',
    },
  ];

  const benefits = [
    'Aumente a conversão em poucas semanas',
    'Descubra rapidamente o que está travando as vendas',
    'Treine o time com base em dados reais',
    'Pare de perder dinheiro por falta de acompanhamento',
    'Padronize o atendimento que mais converte',
    'Tenha previsibilidade na operação',
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      role: 'Gerente Regional',
      company: 'Rede Fashion Plus',
      content:
        'O Convertê revolucionou nossa gestão. A conversão subiu 35% em 2 meses!',
    },
    {
      name: 'Ana Santos',
      role: 'Diretora Comercial',
      company: 'Mega Store',
      content:
        'Finalmente conseguimos identificar nossos melhores vendedores e replicar suas estratégias.',
    },
    {
      name: 'Roberto Lima',
      role: 'Proprietário',
      company: 'Lima Calçados',
      content:
        'Sistema simples e poderoso. Os gerentes adoraram a facilidade de uso.',
    },
  ];

  // Teaser de preços (exibição /mês). O checkout continua cobrando o ciclo cheio.
  const pricing = [
    { label: 'Mensal', perMonth: 'R$ 49,90/mês' },
    { label: 'Trimestral', perMonth: 'R$ 44,90/mês', tag: 'Economize ~10%' },
    { label: 'Anual', perMonth: 'R$ 39,90/mês', tag: 'Mais econômico' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="flex justify-between items-center h-14 md:h-16 w-full">
            <button
              className="flex items-center space-x-2"
              onClick={() => navigate('/')}
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold text-gray-900">Converte.AI</span>
            </button>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="md:flex hidden">
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm md:px-6 md:py-2 md:text-base"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm md:px-6 md:py-2 md:text-base"
                >
                  Teste Grátis
                </Button>
              </div>
              <button
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200"
                aria-label="Abrir menu"
                style={{ minWidth: 0, padding: 0 }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700"><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="15" x2="17" y2="15"/></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Conversão de vendas
            <span className="text-blue-600"> no controle</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Uma gestão adequada da taxa de conversão do seu time de vendas é fundamental para sua loja performar bem. Com o Converte.AI você controla o sucesso do seu vendedor, calcula as vendas perdidas e recebe insights para melhorar a equipe. 
          </p>

          {/* Badge: 3 dias grátis */}
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full mb-8">
            <Shield className="w-4 h-4 mr-2" />
            3 dias grátis — sem cartão
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
              onClick={() => navigate('/upgrade')}
              className="text-lg px-8 py-3"
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades que geram resultado
            </h2>
            <p className="text-lg text-gray-600">
              Conversão de vendas é a métrica que vai revolucionar seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={idx}
                  className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-white text-gray-900 dark:text-gray-900"
                >
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

      {/* Como funciona (3 passos) */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Como funciona
            </h2>
            <p className="text-gray-600">
              Em minutos você já está acompanhando resultados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center bg-white dark:bg-white text-gray-900 dark:text-gray-900">
              <CardHeader>
                <div className="text-2xl font-bold text-blue-600">1</div>
                <CardTitle>Crie sua conta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Teste grátis por 3 dias — sem cartão.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white dark:bg-white text-gray-900 dark:text-gray-900">
              <CardHeader>
                <div className="text-2xl font-bold text-blue-600">2</div>
                <CardTitle>Registre as vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Dashboards e rankings aparecem automaticamente.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white dark:bg-white text-gray-900 dark:text-gray-900">
              <CardHeader>
                <div className="text-2xl font-bold text-blue-600">3</div>
                <CardTitle>Receba insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  A IA mostra onde você perde vendas e como corrigir.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Prova + Benefícios */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Resultados que importam
              </h2>
              <div className="space-y-4">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Crescimento consistente
                </h3>
                <p className="text-gray-600 mb-6">
                  Times que usam o Convertê veem evolução de conversão já no
                  primeiro mês.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">+40%</div>
                    <div className="text-sm text-gray-500">Conversão</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">50+</div>
                    <div className="text-sm text-gray-500">Lojas</div>
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

      {/* Teaser de Preços (exibe /mês, CTA vai para upgrade) */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Planos simples e transparentes
          </h2>
          <p className="text-gray-600 mb-8">
            Assinatura por cartão de crédito • Cancele quando quiser
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <Card key={p.label} className="hover:shadow-lg transition-shadow bg-white dark:bg-white text-gray-900 dark:text-gray-900">
                <CardHeader>
                  <CardTitle className="text-xl">{p.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-extrabold text-blue-600">
                    {p.perMonth}
                  </div>
                  {p.tag && (
                    <div className="text-xs inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {p.tag}
                    </div>
                  )}
                  <div className="pt-3">
                    <Button
                      className="w-full"
                      onClick={() => navigate('/upgrade')}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para aumentar suas conversões?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Comece seu teste gratuito de <b>3 dias</b> agora mesmo.
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
                <span className="text-xl font-bold">Converte.AI</span>
              </div>
              <p className="text-gray-400">
                Inteligência e simplicidade para sua operação de vendas.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/#features')}>Funcionalidades</button></li>
                <li><button onClick={() => navigate('/upgrade')}>Preços</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Central de Ajuda</li>
                <li>Contato: 98-991839898</li>
                <li>Treinamento</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Sobre</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Converte.AI. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
