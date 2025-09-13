import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // (Opcional) Se quiser, chame um endpoint para sincronizar o status logo após o retorno:
    // (async () => {
    //   try { await fetch("/api/billing/mercadopago/sync", { method: "POST" }); } catch {}
    // })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span className="font-semibold">Converte.Ai</span>
        </div>

        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">Assinatura confirmada!</h1>
        <p className="text-gray-600 mt-2">
          Liberamos seu acesso completo. Você já pode usar todos os recursos do Converte.Ai.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/dashboard")}>
            Ir para o Dashboard
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Voltar ao site</Link>
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Dica: salve este e-mail de confirmação e, se precisar, fale com nosso suporte.
        </p>
      </div>
    </div>
  );
}