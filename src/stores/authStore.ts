import { create } from 'zustand'
import { authService, type AuthUser } from '../services/authService'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  session: any | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, companyId: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'nome' | 'email'>>) => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true, // Inicia como true para verificação inicial

  login: async (email: string, password: string) => {
    try {
      console.log('authStore - login - iniciando');
      // Limpar estado anterior antes de tentar novo login
      set({ 
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: true 
      })
      
      const response = await authService.login({ email, password })
      console.log('authStore - login - sucesso:', { user: response.user });
      
      set({
        user: response.user,
        session: response.session,
        isAuthenticated: true,
        isLoading: false,
      })
      // Persistir token de acesso do Supabase para requisições ao backend
      if (response.session?.access_token) {
        localStorage.setItem('token', response.session.access_token)
      }
      console.log('authStore - login - estado atualizado, isAuthenticated:', true);
    } catch (error) {
      console.error('authStore - login - erro:', error);
      set({ 
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false 
      })
      throw error
    }
  },

  register: async (email: string, password: string, name: string, companyId: string) => {
    try {
      console.log('authStore - register - iniciando');
      set({ isLoading: true })
      const response = await authService.register({ email, password, nome: name, company_id: companyId })
      console.log('authStore - register - sucesso:', { user: response.user });
      
      set({
        user: response.user,
        session: response.session,
        isAuthenticated: true,
        isLoading: false,
      })
      // Persistir token após registro
      if (response.session?.access_token) {
        localStorage.setItem('token', response.session.access_token)
      }
      console.log('authStore - register - estado atualizado, isAuthenticated:', true);
    } catch (error) {
      console.error('authStore - register - erro:', error);
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      console.log('authStore - logout - iniciando');
      await authService.logout()
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
      // Remover token persistido no logout
      localStorage.removeItem('token')
      console.log('authStore - logout - concluído');
    } catch (error) {
      console.error('authStore - logout - erro:', error);
      // Even if logout fails, clear local state
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
      throw error
    }
  },

  updateProfile: async (updates: Partial<Pick<AuthUser, 'nome' | 'email'>>) => {
    try {
      console.log('authStore - updateProfile - iniciando');
      const { user } = get()
      if (!user) throw new Error('No user logged in')
      
      const updatedUser = await authService.updateProfile(user.id, updates)
      set({ user: updatedUser })
      console.log('authStore - updateProfile - concluído');
    } catch (error) {
      console.error('authStore - updateProfile - erro:', error);
      throw error
    }
  },

  changePassword: async (newPassword: string) => {
    try {
      console.log('authStore - changePassword - iniciando');
      await authService.changePassword(newPassword)
      console.log('authStore - changePassword - concluído');
    } catch (error) {
      console.error('authStore - changePassword - erro:', error);
      throw error
    }
  },

  resetPassword: async (email: string) => {
    try {
      console.log('authStore - resetPassword - iniciando');
      await authService.resetPassword(email)
      console.log('authStore - resetPassword - concluído');
    } catch (error) {
      console.error('authStore - resetPassword - erro:', error);
      throw error
    }
  },

  checkAuth: async () => {
    try {
      console.log('authStore - checkAuth - iniciando verificação');
      set({ isLoading: true })
      
      // Primeiro verifica se há uma sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('authStore - checkAuth - nenhuma sessão encontrada');
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }
      
      const user = await authService.getCurrentUser()
      console.log('authStore - checkAuth - resultado getCurrentUser:', user);
      
      if (user) {
        console.log('authStore - checkAuth - sessão encontrada:', !!session);
        set({
          user,
          session,
          isAuthenticated: true,
          isLoading: false,
        })
        console.log('authStore - checkAuth - autenticado com sucesso, isAuthenticated:', true);
      } else {
        console.log('authStore - checkAuth - usuário não encontrado');
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        })
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('authStore - checkAuth - erro:', error);
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, !!session);
  // O checkAuth será chamado pelo App.tsx na inicialização
  // Removemos a chamada automática aqui para evitar conflitos
})