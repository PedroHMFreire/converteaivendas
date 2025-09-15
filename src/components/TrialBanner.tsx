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

  // Função de debug para verificar estado
  const debugState = () => {
    console.log("🐛 TrialBanner Debug State:", {
      daysLeft,
      user: user ? {
        id: user.id,
        plano: user.plano,
        dataExpiracao: user.dataExpiracao,
        email: user.email
      } : null,
      shouldShow: user?.plano === 'trial' && daysLeft > 0,
      timestamp: new Date().toISOString()
    });
  };

  // Chamar debug no primeiro render
  useEffect(() => {
    debugState();
  }, [daysLeft, user]);

  // Refresh automático a cada 30 segundos para garantir dados frescos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        console.log("🔄 TrialBanner: Refresh automático iniciado");

        const u = await (authService as any).getCurrentUser?.();
        const d = await authService.getTrialDaysLeft();

        setUser(u ?? null);
        setDaysLeft(d);

        console.log("✅ TrialBanner: Refresh automático concluído", {
          userPlano: u?.plano,
          daysLeft: d,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("❌ TrialBanner: Erro no refresh automático:", error);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

    // Escutar mudanças no status do usuário
  useEffect(() => {
    const handleStatusChange = async (updatedUser: any) => {
      console.log("� TrialBanner: Evento STATUS_CHANGED recebido", {
        updatedUser,
        timestamp: new Date().toISOString()
      });

      if (updatedUser) {
        setUser(updatedUser);
        console.log("✅ TrialBanner: Usuário atualizado via evento", {
          plano: updatedUser.plano,
          dataExpiracao: updatedUser.dataExpiracao
        });
      }

      // Sempre recalcular dias restantes após mudança
      try {
        const days = await authService.getTrialDaysLeft();
        setDaysLeft(days);
        console.log("✅ TrialBanner: Dias recalculados via evento", {
          days,
          userPlano: updatedUser?.plano
        });
      } catch (error) {
        console.error("❌ TrialBanner: Erro ao recalcular dias via evento", error);
        setDaysLeft(0);
      }
    };

    const handleProfileUpdate = async (updatedUser: any) => {
      console.log("📡 TrialBanner: Evento PROFILE_UPDATED recebido", {
        updatedUser,
        timestamp: new Date().toISOString()
      });
      await handleStatusChange(updatedUser);
    };

    userEvents.on(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
    userEvents.on(USER_EVENTS.PROFILE_UPDATED, handleProfileUpdate);

    console.log("🎧 TrialBanner: Listeners de eventos registrados");

    return () => {
      userEvents.off(USER_EVENTS.STATUS_CHANGED, handleStatusChange);
      userEvents.off(USER_EVENTS.PROFILE_UPDATED, handleProfileUpdate);
      console.log("🔇 TrialBanner: Listeners de eventos removidos");
    };
  }, []);

  // ainda carregando dados
  if (daysLeft === null || !user) {
    console.log("⏳ TrialBanner: Ainda carregando dados", {
      daysLeft,
      userExists: !!user,
      userPlano: user?.plano
    });
    return null;
  }

  // só mostra se usuário está em trial ATIVO (plano = trial E dias restantes > 0)
  const shouldShow = user.plano === 'trial' && daysLeft > 0;

  if (!shouldShow) {
    console.log("🔍 TrialBanner: Não exibindo banner", {
      plano: user.plano,
      daysLeft,
      shouldShow,
      reason: user.plano !== 'trial' ? 'não está em trial' : 'trial expirado',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  console.log("✅ TrialBanner: Exibindo banner", {
    plano: user.plano,
    daysLeft,
    shouldShow,
    dataExpiracao: user?.dataExpiracao,
    timestamp: new Date().toISOString()
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
          <div className="flex items-center gap-2">
            <button
              onClick={debugState}
              className="text-amber-600 hover:text-amber-800 text-xs px-2 py-1 rounded border border-amber-300 hover:bg-amber-100"
              title="Debug State"
            >
              🐛
            </button>
            <button
              onClick={() => navigate('/upgrade')}
              className="text-amber-800 underline underline-offset-2 hover:opacity-90"
            >
              assine aqui
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialBanner;

// Função global de debug para console
(window as any).debugTrialBanner = () => {
  console.log("🔧 Debug Global TrialBanner");
  console.log("Para usar: debugTrialBanner()");
  console.log("Isso irá disparar o debug do componente TrialBanner ativo");
};
