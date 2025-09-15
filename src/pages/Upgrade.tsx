// src/pages/Upgrade.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Shield, BarChart3 } from "lucide-react";

type Recurrence = "mensal" | "trimestral" | "anual";

type RecurrenceOption = {
  id: Recurrence;
  label: string;
  valorMensal: number;
  totalCiclo: number;
  cicloLabel: string;
  economia: string | null;
  destaque: string | null;
};

const recurrenceOptions: RecurrenceOption[] = [
  { id: "mensal", label: "Mensal", valorMensal: 49.9, totalCiclo: 49.9, cicloLabel: "Cobrança mensal", economia: null, destaque: null },
  { id: "trimestral", label: "Trimestral", valorMensal: 44.9, totalCiclo: 134.7, cicloLabel: "Cobramos a cada 3 meses", economia: "10%", destaque: "Mais vendido" },
  { id: "anual", label: "Anual", valorMensal: 39.9, totalCiclo: 478.8, cicloLabel: "Cobrança anual", economia: "20%", destaque: "Mais econômico" },
];

// Utilitário para diagnosticar problemas no desktop
function diagnoseDesktopIssues() {
  const issues = [];

  // Verificar se está em HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push("⚠️ Não está usando HTTPS - pode causar problemas com PayPal");
  }

  // Verificar CSP
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    issues.push("⚠️ CSP detectado - pode estar bloqueando scripts externos");
  }

  // Verificar se há extensões que podem interferir
  if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Mobile')) {
    issues.push("💡 Chrome Desktop detectado - verifique se há extensões bloqueando scripts");
  }

  // Verificar conectividade
  if (!navigator.onLine) {
    issues.push("❌ Sem conexão com a internet");
  }

  // Verificar cookies
  if (!navigator.cookieEnabled) {
    issues.push("⚠️ Cookies desabilitados - PayPal pode precisar de cookies");
  }

  if (issues.length > 0) {
    console.warn("🔍 Possíveis problemas detectados:", issues);
  } else {
    console.log("✅ Nenhum problema óbvio detectado no diagnóstico");
  }

  return issues;
}

function loadPaypalSdk(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    // Executar diagnóstico
    const issues = diagnoseDesktopIssues();

    console.log("🔍 Ambiente:", {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecureContext: window.isSecureContext,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      issuesDetected: issues.length
    });

    if ((window as any).paypal) {
      console.log("✅ PayPal SDK já carregado");
      return resolve();
    }

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=BRL&components=buttons`;
    s.async = true;
    s.crossOrigin = "anonymous";

    console.log("📡 Carregando PayPal SDK:", s.src);

    // Timeout para detectar se o script está travando
    const timeout = setTimeout(() => {
      console.error("⏰ Timeout ao carregar PayPal SDK - tentando abordagem alternativa");
      // Tentar abordagem alternativa: carregar sem async
      loadPaypalSdkAlternative(clientId).then(resolve).catch(reject);
    }, 8000); // 8 segundos

    s.onload = () => {
      clearTimeout(timeout);
      console.log("✅ PayPal SDK carregado com sucesso");
      resolve();
    };

    s.onerror = (e) => {
      clearTimeout(timeout);
      console.error("❌ Erro ao carregar PayPal SDK:", {
        error: e,
        scriptSrc: s.src,
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        onLine: navigator.onLine
      });

      // Tentar abordagem alternativa
      console.log("🔄 Tentando abordagem alternativa...");
      loadPaypalSdkAlternative(clientId).then(resolve).catch(reject);
    };

    // Tentar adicionar no head primeiro, depois no body se falhar
    try {
      document.head.appendChild(s);
      console.log("📍 Script adicionado ao <head>");
    } catch (error) {
      console.warn("⚠️ Falha ao adicionar ao <head>, tentando <body>");
      document.body.appendChild(s);
      console.log("📍 Script adicionado ao <body>");
    }
  });
}

// Abordagem alternativa para desktop
function loadPaypalSdkAlternative(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    console.log("🔄 Tentando carregamento alternativo do PayPal SDK");

    if ((window as any).paypal) {
      console.log("✅ PayPal SDK já carregado (alternativo)");
      return resolve();
    }

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=BRL&components=buttons`;
    s.async = false; // Carregar de forma síncrona
    s.defer = true; // Adiar execução até o DOM estar pronto

    const timeout = setTimeout(() => {
      reject(new Error("Timeout na abordagem alternativa"));
    }, 5000);

    s.onload = () => {
      clearTimeout(timeout);
      console.log("✅ PayPal SDK carregado com abordagem alternativa");
      resolve();
    };

    s.onerror = (e) => {
      clearTimeout(timeout);
      console.error("❌ Falha na abordagem alternativa");
      reject(new Error("Falha ao carregar PayPal SDK (alternativo)"));
    };

    document.head.appendChild(s);
  });
}

async function ensurePaypalSdk() {
  const clientId = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID;
  console.log("🔧 Verificando PayPal SDK", { clientId: clientId ? "presente" : "ausente" });

  if (!clientId) throw new Error("VITE_PAYPAL_CLIENT_ID ausente.");

  if (!(window as any).paypal) {
    console.log("⚠️ PayPal SDK não encontrado, carregando...");
    await loadPaypalSdk(clientId);
  } else {
    console.log("✅ PayPal SDK já disponível");
  }
}

export default function Upgrade() {
  const [selectedRecurrence, setSelectedRecurrence] = useState<Recurrence>("mensal");
  const [isLoading, setIsLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const navigate = useNavigate();
  const paypalButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const maybe = (await (authService as any).getUserId?.()) ||
                      (await (authService as any).getUser?.())?.id ||
                      (await (authService as any).getCurrentUser?.())?.id ||
                      null;
        setUserId(maybe);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

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

  async function renderPayPalButtons(orderID: string) {
    const paypal = (window as any).paypal;
    if (!paypal || !paypalButtonsRef.current) {
      alert("Não foi possível carregar o PayPal. Tente novamente.");
      return;
    }
    paypalButtonsRef.current.innerHTML = "";

    paypal.Buttons({
      createOrder: async () => orderID,
      onApprove: async (data: any) => {
        try {
          const resp = await fetch("/api/paypal/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data?.orderID }),
          });
          const json = await resp.json().catch(() => ({}));
          if (!resp.ok || json?.status !== "COMPLETED") {
            throw new Error(json?.error || "Falha ao confirmar pagamento.");
          }
          // após confirmar, mandamos para a tela de sucesso
          navigate("/billing/success");
        } catch (e: any) {
          alert(e?.message || "Erro ao confirmar o pagamento.");
        }
      },
      onError: (err: any) => {
        console.error("PayPal Buttons error:", err);
        alert("Pagamento não concluído. Tente novamente.");
      },
    }).render(paypalButtonsRef.current);
  }

  async function handleUpgrade() {
    console.log("🚀 Iniciando processo de upgrade");
    console.log("📱 Dispositivo:", /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "Mobile" : "Desktop");

    if (!userId) {
      alert("Não foi possível identificar seu usuário. Faça login novamente.");
      return;
    }
    setIsLoading(true);
    try {
      console.log("🔧 Garantindo PayPal SDK...");
      await ensurePaypalSdk();
      console.log("✅ SDK garantido, criando ordem...");

      const r = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: selectedRecurrence }),
      });
      const json = await r.json();
      if (!r.ok || !json?.orderID) {
        throw new Error(json?.error || "Erro ao criar a ordem de pagamento.");
      }
      console.log("📋 Ordem criada:", json.orderID);
      setShowButtons(true);
      await renderPayPalButtons(json.orderID);
      console.log("🎉 Botões PayPal renderizados com sucesso");
    } catch (e: any) {
      console.error("💥 Erro no handleUpgrade:", e);
      console.error("🔍 Detalhes do erro:", {
        message: e.message,
        stack: e.stack,
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext
      });
      alert(e?.message || "Falha ao iniciar o pagamento.");
    } finally {
      setIsLoading(false);
    }
  }

  const perks = [
    "Dashboards de conversão prontos",
    "Ranking de vendedores por loja",
    "Insights diários (WhatsApp/Email)",
    "Multi-lojas e times",
    "Suporte humano quando precisar",
  ];

  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedPlan = recurrenceOptions.find((r) => r.id === selectedRecurrence)!;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Converte.Ai</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/app")}>Voltar ao App</Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 text-center">Planos de Pagamento</h1>
          <p className="text-gray-600 text-center mt-2">Escolha a recorrência que faz sentido para sua loja</p>

          <div className="flex justify-center gap-2 mt-6">
            {recurrenceOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedRecurrence(opt.id)}
                className={[
                  "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                  selectedRecurrence === opt.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="text-center mt-6">
            {selectedPlan.destaque && (
              <div className="inline-block text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-2">
                {selectedPlan.destaque}
              </div>
            )}
            <div className="text-4xl font-bold text-blue-600">
              {fmtBRL(selectedPlan.valorMensal)} <span className="text-base text-gray-500">/mês</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {selectedPlan.cicloLabel} — {fmtBRL(selectedPlan.totalCiclo)}
            </div>
            {selectedPlan.economia && (
              <div className="text-sm text-emerald-700 font-medium mt-1">Economize {selectedPlan.economia}</div>
            )}
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 text-sm text-gray-700">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> {p}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 w-full">
            <Button className="w-full sm:w-auto" disabled={isLoading} onClick={handleUpgrade}>
              <CreditCard className="w-4 h-4 mr-2" />
              Assinar plano {selectedPlan.label}
            </Button>

            {showButtons && <div className="w-full sm:w-auto mt-2"><div ref={paypalButtonsRef} /></div>}

            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Garantia de 30 dias — cancele quando quiser
            </p>

            {daysLeft !== null && (
              <p className="text-sm text-gray-600">
                {daysLeft > 0 ? `${daysLeft} dia${daysLeft === 1 ? "" : "s"} restantes no seu teste gratuito` : "Seu teste gratuito expirou"}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
