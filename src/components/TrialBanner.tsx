// src/components/TrialBanner.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { userEvents, USER_EVENTS } from '@/lib/events';

const TrialBanner = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // busca assíncrona para evitar "pending"
        const d = await authService.getTrialDaysLeft();
        if (alive) setDaysLeft(d);
      } catch {
        if (alive) setDaysLeft(0);
      }
      try {
        // ✅ agora com await (antes retornava Promise)
        const u = await (authService as any).getCurrentUser?.();
        if (alive) setUser(u ?? null);
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Escutar mudanças no status do usuário
  useEffect(() => {
    const handleStatusChange = async (updatedUser: any) => {
      console.log("🔄 TrialBanner: Recebido evento de mudança", updatedUser);

      if (updatedUser) {
        setUser(updatedUser);
        console.log("✅ TrialBanner: Usuário atualizado", {
          plano: updatedUser.plano,
          dataExpiracao: updatedUser.dataExpiracao
        });
      }

      // Sempre recalcular dias restantes após mudança
      try {
        const days = await authService.getTrialDaysLeft();
        setDaysLeft(days);
        console.log("✅ TrialBanner: Dias recalculados", days);
      } catch (error) {
        console.error("❌ TrialBanner: Erro ao recalcular dias", error);
        setDaysLeft(0);
      }
    };

    userEvents.on(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
    userEvents.on(USER_EVENTS.PROFILE_UPDATED, handleStatusChange);

    return () => {
      userEvents.off(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
      userEvents.off(USER_EVENTS.PROFILE_UPDATED, handleStatusChange);
    };
  }, []);

  // ainda carregando dados
  if (daysLeft === null || !user) return null;

  // só mostra se usuário está em trial ATIVO (plano = trial E dias restantes > 0)
  const shouldShow = user.plano === 'trial' && daysLeft > 0;

  if (!shouldShow) {
    console.log("🔍 TrialBanner: Não exibindo banner", {
      plano: user.plano,
      daysLeft,
      shouldShow
    });
    return null;
  }

  console.log("✅ TrialBanner: Exibindo banner", {
    plano: user.plano,
    daysLeft,
    shouldShow
  });

  const exp = user?.dataExpiracao ? new Date(user.dataExpiracao) : null;
  const expStr = exp ? exp.toLocaleDateString('pt-BR') : '';

  return (
    <Card className="mb-4 bg-amber-50 border-amber-200">
      <CardContent className="px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <Clock className="w-4 h-4" />
            <span>
              {daysLeft} dia{daysLeft === 1 ? '' : 's'} restantes do seu teste
              {expStr ? ` • até ${expStr}` : ''}
            </span>
          </div>
          <button
            onClick={() => navigate('/upgrade')}
            className="text-amber-800 underline underline-offset-2 hover:opacity-90"
          >
            assine aqui
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialBanner;
