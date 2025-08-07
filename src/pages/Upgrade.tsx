import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { showSuccess } from '@/utils/toast';

import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, BarChart3 } from 'lucide-react';

const recurrenceOptions = [
  {
    id: 'mensal',
    label: 'Mensal',
    valor: 49.90,
    economia: null,
    destaque: null
  },
  {
    id: 'trimestral',
    label: 'Trimestral',
    valor: 134.70,
    economia: '10%',
    destaque: 'Mais vendido'
  },
  {
    id: 'anual',
    label: 'Anual',
    valor: 478.80,
    economia: '20%',
    destaque: 'Mais econômico'
  }
];

const Upgrade = () => {
  const [selectedRecurrence, setSelectedRecurrence] = useState('mensal');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const daysLeft = authService.getTrialDaysLeft();

  const selectedPlan = recurrenceOptions.find(r => r.id === selectedRecurrence);

  const handleUpgrade = async () => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (user) {
      authService.updateProfile({
        plano: selectedRecurrence,
        ativo: true,
        dataExpiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      showSuccess(`Plano ${selectedPlan?.label} ativado com sucesso!`);
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Converte.Ai</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Plano com toggle */}
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-xl text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Planos de Pagamento</h1>
          <p className="text-gray-600 mb-6">Escolha o tipo de pagamento</p>

          {/* Toggle de recorrência */}
          <div className="flex justify-center space-x-4 mb-6">
            {recurrenceOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedRecurrence(option.id)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
                  ${selectedRecurrence === option.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Preço e destaque */}
          <div className="text-4xl font-bold text-blue-600 mb-2">
            R$ {selectedPlan?.valor.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {selectedRecurrence === 'mensal'
              ? 'por mês'
              : `equivalente a R$ ${(selectedPlan!.valor / (selectedRecurrence === 'anual' ? 12 : 3)).toFixed(2).replace('.', ',')}/mês`}
          </p>

          {selectedPlan?.destaque && (
            <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full mb-4">
              {selectedPlan.destaque}
            </span>
          )}

          {/* Benefícios */}
          <ul className="text-left space-y-3 mb-8 mt-6">
            {[
              'Até 5 lojas',
              'Até 25 vendedores',
              'Dashboard completo',
              'Relatórios básicos',
              'Suporte por email e WhatsApp',
            ].map((item, idx) => (
              <li key={idx} className="flex items-center text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                {item}
              </li>
            ))}
          </ul>

          {/* Botão */}
          <Button
            className="w-full"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Assinar plano {selectedPlan?.label}
              </>
            )}
          </Button>

          {/* Info de teste grátis */}
          {user?.plano === 'trial' && (
            <p className="mt-4 text-sm text-orange-700 bg-orange-100 px-4 py-2 rounded-full inline-flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              {daysLeft > 0
                ? `${daysLeft} dias restantes no seu teste gratuito`
                : 'Seu teste gratuito expirou'}
            </p>
          )}
        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center py-6 text-sm text-gray-500">
        Garantia de 30 dias — Cancele quando quiser
      </footer>
    </div>
  );
};

export default Upgrade;