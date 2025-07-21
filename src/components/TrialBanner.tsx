import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Crown } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

const TrialBanner = () => {
  const [daysLeft, setDaysLeft] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const days = authService.getTrialDaysLeft();
    setDaysLeft(days);
  }, []);

  const user = authService.getCurrentUser();
  
  if (!user || user.plano !== 'trial') {
    return null;
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">
                Período de Teste - {daysLeft} dias restantes
              </h3>
              <p className="text-sm text-orange-700">
                Aproveite todos os recursos gratuitamente até {new Date(user.dataExpiracao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/upgrade')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Crown className="w-4 h-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialBanner;