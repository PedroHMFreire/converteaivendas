// src/components/Header.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  PlusCircle,
  Menu,
  User,
  LogOut,
  Settings,
  Sun,
  Moon,
  Lightbulb,
  Home as HomeIcon,
  Clock,
  Crown,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { userEvents, USER_EVENTS } from '@/lib/events';

type AppUser = {
  id: string;
  nome?: string;
  email?: string;
  empresa?: string;
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Usuário logado
  const [user, setUser] = useState<AppUser | null>(null);

  // Plano e contagem de dias do trial (dinâmicos)
  const [plan, setPlan] = useState<'trial' | 'basic' | 'premium' | 'unknown'>('unknown');
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = (await authService.getCurrentUser()) as unknown as AppUser | null;
        if (!alive) return;
        setUser(u ?? null);
      } catch {
        if (!alive) return;
        setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Busca assíncrona do plano e dos dias de trial
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await authService.getCurrentPlan();
        const d = await authService.getTrialDaysLeft();
        if (!alive) return;
        setPlan(p as any);
        setDaysLeft(typeof d === 'number' ? d : 0);
      } catch {
        if (!alive) return;
        setPlan('unknown');
        setDaysLeft(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Escutar mudanças no status do usuário
  useEffect(() => {
    const handleStatusChange = async () => {
      console.log("🔄 Header: Status do usuário mudou, atualizando dados...");

      try {
        const p = await authService.getCurrentPlan();
        const d = await authService.getTrialDaysLeft();
        setPlan(p as any);
        setDaysLeft(typeof d === 'number' ? d : 0);
        console.log("✅ Header: Dados atualizados", { plan: p, daysLeft: d });
      } catch (error) {
        console.error("❌ Header: Erro ao atualizar dados", error);
        setPlan('unknown');
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

  const menuItems = [
    { path: '/app', label: 'Home', icon: HomeIcon },
    { path: '/vendas', label: 'Vendas', icon: PlusCircle },
    { path: '/insights', label: 'Insights da IA', icon: Lightbulb },
    { path: '/cadastros', label: 'Cadastros', icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const ThemeToggleButton = () => (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full border hover:bg-gray-200 dark:hover:bg-gray-800 transition"
      title={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
      style={{ marginRight: 4 }}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );

  // Aviso sutil de trial (apenas quando plano = 'trial' e restam dias)
  const showTrialPill = user && plan === 'trial' && typeof daysLeft === 'number' && daysLeft > 0;

  return (
    <header className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="w-full flex flex-col">
        <div className="flex justify-between items-center h-16 px-2 md:px-4">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Converte.Ai</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

          </nav>

          {/* User Menu + Tema */}
          <div className="flex items-center space-x-2">
            <ThemeToggleButton />


            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {getInitials(user?.nome)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none truncate">{user?.nome || '-'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || '-'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.empresa || '-'}</p>
                  </div>

                  {/* Resumo do plano + trial dinâmico */}
                  <DropdownMenuLabel className="text-xs px-4">
                    Plano: {plan === 'trial' ? 'Gratuito (teste)' : plan === 'basic' ? 'Basic' : plan === 'premium' ? 'Premium' : '—'}
                  </DropdownMenuLabel>
                  {plan === 'trial' && typeof daysLeft === 'number' && daysLeft > 0 && (
                    <DropdownMenuLabel className="text-xs px-4 text-yellow-700">
                      {daysLeft} dia{daysLeft === 1 ? '' : 's'} restantes do seu teste
                    </DropdownMenuLabel>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/upgrade')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Planos</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4 text-red-500" />
                    <span className="text-red-500">Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
