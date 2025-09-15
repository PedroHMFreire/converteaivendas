// src/components/AuthGuard.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/lib/auth";
import { userEvents, USER_EVENTS } from "@/lib/events";

const PUBLIC_ROUTES = new Set<string>([
  "/login", "/register", "/landing", "/upgrade", "/billing/success",
]);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitForSession(msTotal = 6000) {
  const step = 250;
  let elapsed = 0;
  let session = await (authService as any).getSession?.();
  while ((!session || !session.user) && elapsed < msTotal) {
    await sleep(step);
    elapsed += step;
    session = await (authService as any).getSession?.();
  }
  return session;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 0) Rotas públicas passam direto
        if (PUBLIC_ROUTES.has(loc.pathname)) {
          if (!cancelled) setReady(true);
          return;
        }

        // 🔸 Se acabamos de logar, NÃO redirecionar para /login por alguns segundos
        const just = Number(localStorage.getItem('auth:justLoggedIn') || '0');
        const withinGrace = just && (Date.now() - just) < 8000; // 8s de “graça” pós-login

        // 1) Aguarda a sessão (com mais tolerância se acabou de logar)
        const session = await waitForSession(withinGrace ? 8000 : 5000);
        if (!session?.user) {
          if (withinGrace) {
            // ainda sem sessão mas em janela de graça → espera mais um pouco, sem redirecionar
            await sleep(1200);
          } else {
            if (!cancelled) {
              setReady(true);
              navigate("/login");
            }
            return;
          }
        }

        // 2) Trial (sem travar a navegação em caso de erro)
        try {
          const daysLeft = await authService.getTrialDaysLeft();
          const getPlan = (authService as any).getCurrentPlan;
          const plan: string = typeof getPlan === "function"
            ? await getPlan()
            : (typeof daysLeft === "number" && daysLeft > 0 ? "trial" : "unknown");

          if (plan === "trial" && typeof daysLeft === "number" && daysLeft <= 0) {
            if (!cancelled) {
              setReady(true);
              navigate("/upgrade");
            }
            return;
          }
        } catch {
          // ignora falha do cálculo de trial
        }
      } finally {
        // limpa a flag de pós-login (não precisamos mais dela)
        localStorage.removeItem('auth:justLoggedIn');
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [loc.pathname, navigate]);

  // Escutar mudanças no status do usuário
  useEffect(() => {
    const handleStatusChange = () => {
      console.log("🔄 AuthGuard: Status do usuário mudou, re-verificando...");
      // Forçar re-execução da verificação
      setReady(false);
    };

    userEvents.on(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
    userEvents.on(USER_EVENTS.PROFILE_UPDATED, handleStatusChange);

    return () => {
      userEvents.off(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
      userEvents.off(USER_EVENTS.PROFILE_UPDATED, handleStatusChange);
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}