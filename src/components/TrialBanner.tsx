// src/components/TrialBanner.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

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

  // ainda carregando
  if (daysLeft === null) return null;

  // sem usuário, fora de trial, ou trial expirado → não exibe
  if (!user || user.plano !== 'trial' || daysLeft <= 0) return null;

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
