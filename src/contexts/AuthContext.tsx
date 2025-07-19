import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types/auth';
import { authService } from '@/lib/auth';

interface AuthContextType extends AuthState {
  login: (email: string, senha: string) => Promise<User>;
  register: (userData: Omit<User, 'id' | 'dataRegistro' | 'dataVencimento' | 'status' | 'plano' | 'limites'>) => Promise<User>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Verificar se há usuário logado
    const user = authService.getCurrentUser();
    setAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
  }, []);

  const login = async (email: string, senha: string): Promise<User> => {
    try {
      const user = authService.login(email, senha);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: Omit<User, 'id' | 'dataRegistro' | 'dataVencimento' | 'status' | 'plano' | 'limites'>): Promise<User> => {
    try {
      const user = authService.register(userData);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const updateUser = async (updates: Partial<User>): Promise<User> => {
    if (!authState.user) {
      throw new Error('Usuário não logado');
    }

    const updatedUser = authService.updateUser(authState.user.id, updates);
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
    
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};