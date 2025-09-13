// src/pages/Upgrade.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, BarChart3 } from 'lucide-react';

type Recurrence = 'mensal' | 'trimestral' | 'anual';

type RecurrenceOption = {
  id: Recurrence;
  label: string;
  /** Valor exibido (por mês) */
  valorMensal: number;
  /** Total faturado por ciclo (mês, 3 meses, ano) */
  totalCiclo: number;
  /** Texto do ciclo para legenda */
  cicloLabel: string;
  economia: string | null;
  destaque: string | null;
};

/** Agora os planos têm valor mensal + total do ciclo separado */
const recurrenceOptions: RecurrenceOption[] = [
  {
    id: 'mensal',
    label: 'Mensal',
    valorMensal: 49.90,
    totalCiclo: 49.90,
    cicloLabel: 'Cobrança mensal',
    economia: null,
    destaque: null,
  },
  {
    id: 'trimestral',
    label: 'Trimestral',
    valorMensal: 44.90,
    totalCiclo: 134.70, // 44,90 * 3
    cicloLabel: 'Cobramos a cada 3 meses',
    economia: '10%',
    destaque: 'Mais vendido',
  },
  {
    id: 'anual',
    label: 'Anual',
    valorMensal: 39.90,
    totalCiclo: 478.80, // 39,90 * 12
    cicloLabel: 'Cobrança anual',
    economia: '20%',
    destaque: 'Mais econômico',
  },
];

// Links dos planos (Mercado Pago) vindos do .env
const PLAN_URLS: Record<Recurrence, string | undefined> = {
  mensal:      import.meta.env.VITE_MP_PLAN_URL_MENSAL,
  trimestral:  import.meta.env.VITE_MP_PLAN_URL_TRIMESTRAL,
  anual:       import.meta.env.VITE_MP_PLAN_URL_ANUAL,
};

export default function Upgrade() {
  const [selectedRecurrence, setSelectedRecurrence] = useState<Recurrence>('mensal');
  const [isLoading, setIsLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const navigate = useNavigate();

  // Corrige o "pending": busca assíncrona dos dias restantes
  useEffect(() => {
    (async () => {
      try {
        const d = await authService.getTrialDaysLeft();
        setDaysLeft(d);
      } catch {
        setDaysLeft(0);
      }
    })();
  }, []);

  const selectedPlan = recurrenceOptions.find(r => r.id === selectedRecurrence)!;
  const planUrl = PLAN_URLS[selectedRecurrence];

  const perks = [
    'Dashboards de conversão prontos',
    'Ranking de vendedores por loja',
    'Insights diários (WhatsApp/Email)',
    'Multi-lojas e times',
    'Suporte humano quando precisar',
  ];

  function openPlan(url?: string) {
    if (!url) {
      alert('Link do plano não configurado. Verifique as variáveis .env (VITE_MP_PLAN_URL_*)');
      return;
    }
    // Redireciona para o checkout do Mercado Pago
    window.location.href = url;
  }

  async function handleUpgrade() {
    setIsLoading(true);
    try {
      openPlan(planUrl);
    } finally {
      setIsLoading(false);
    }
  }

  const fmtBRL = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar simples */}
      <header className="w-full bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Converte.Ai</span>
          </div>
          {/* 🔁 Voltar para /app (antes era /dashboard) */}
          <Button variant="outline" onClick={() => navigate('/app')}>Voltar ao App</Button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 text-center">Planos de Pagamento</h1>
          <p className="text-gray-600 text-center mt-2">Escolha a recorrência que faz sentido para sua loja</p>

          {/* Toggle de recorrência */}
          <div className="flex justify-center gap-2 mt-6">
            {recurrenceOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedRecurrence(opt.id)}
                className={[
                  'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                  selectedRecurrence === opt.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Preço e destaque */}
          <div className="text-center mt-6">
            {selectedPlan.destaque && (
              <div className="inline-block text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-2">
                {selectedPlan.destaque}
              </div>
            )}

            {/* 💡 Sempre mostrar o valor mensal */}
            <div className="text-4xl font-bold text-blue-600">
              {fmtBRL(selectedPlan.valorMensal)}
              <span className="text-base text-gray-500"> /mês</span>
            </div>

            {/* Legenda: total do ciclo (só informativo) */}
            <div className="text-sm text-gray-600 mt-1">
              {selectedPlan.cicloLabel} — {fmtBRL(selectedPlan.totalCiclo)}
            </div>

            {selectedPlan.economia && (
              <div className="text-sm text-emerald-700 font-medium mt-1">
                Economize {selectedPlan.economia} nessa recorrência
              </div>
            )}
          </div>

          {/* Benefícios */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 text-sm text-gray-700">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> {p}
              </li>
            ))}
          </ul>

          {/* Ações */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              className="w-full sm:w-auto"
              disabled={isLoading || !planUrl}
              onClick={handleUpgrade}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Assinar plano {selectedPlan.label}
            </Button>

            {!planUrl && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Configure as variáveis no .env: VITE_MP_PLAN_URL_MENSAL / TRIMESTRAL / ANUAL
              </p>
            )}

            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Garantia de 30 dias — cancele quando quiser
            </p>

            {daysLeft !== null && (
              <p className="text-sm text-gray-600">
                {daysLeft > 0
                  ? `${daysLeft} dia${daysLeft === 1 ? '' : 's'} restantes no seu teste gratuito`
                  : 'Seu teste gratuito expirou'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
