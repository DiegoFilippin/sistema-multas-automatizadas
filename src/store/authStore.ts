import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'icetran' | 'despachante';
  company_id?: string;
  company?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    
    login: (user: User, token: string) => {
      set({ 
        user, 
        token, 
        isAuthenticated: true 
      });
    },
    
    logout: () => {
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      });
    },
    
    updateUser: (userData: Partial<User>) => {
      const currentUser = get().user;
      if (currentUser) {
        set({ 
          user: { ...currentUser, ...userData } 
        });
      }
    }
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({ 
      user: state.user, 
      token: state.token, 
      isAuthenticated: state.isAuthenticated 
    })
  }
));