import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { User } from '@/types/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      const currentUser = await authService.getCurrentUser();

      if (!currentUser) {
        // Não autenticado
        navigate('/login');
        return;
      }

      try {
        const trialExpired = await authService.isTrialExpired();

        if (!currentUser.ativo || trialExpired) {
          navigate('/upgrade');
          return;
        }

        if (active) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erro ao validar usuário:', err);
        navigate('/login');
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
