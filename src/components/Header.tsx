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

  // ⚠️ Agora buscamos o usuário de forma assíncrona e guardamos no state
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await authService.getCurrentUser(); // <- era o Promise
        if (!alive) return;
        // se o serviço retorna algo com outra forma, adapte o mapeamento aqui
        setUser(u as unknown as AppUser ?? null);
      } catch {
        if (!alive) return;
        setUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  const menuItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
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

  return (
    <header className="bg-white shadow-sm border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="w-full flex flex-col">
        <div className="flex justify-between items-center h-16 px-2 md:px-4">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Converte.Ai</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
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

                  <DropdownMenuLabel className="text-xs text-green-600 font-medium px-4">
                    Plano: Gratuito
                  </DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs text-yellow-600 px-4">
                    5 dias restantes do seu teste gratuito
                  </DropdownMenuLabel>

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
