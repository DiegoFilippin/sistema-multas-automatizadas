import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  nome: string // Mapeado do campo 'name' da tabela user_profiles
  role: 'admin' | 'user' | 'viewer' | 'admin_master' | 'expert'
  company_id?: string // Campo opcional para compatibilidade
  client_id?: string // Campo opcional para compatibilidade
  ativo: boolean // Sempre true para user_profiles
  ultimo_login?: string // Campo opcional para compatibilidade
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  nome: string
  company_id?: string
  role?: 'admin' | 'user' | 'viewer' | 'admin_master' | 'expert'
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; session: any }> {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Login failed')
      }

      // Get user profile from user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        throw new Error('User profile not found')
      }

      // Update last login in user_profiles
      await supabase
        .from('user_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', authData.user.id)

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.name, // Campo 'name' da user_profiles
        role: userProfile.role,
        company_id: undefined, // user_profiles não tem company_id
        ativo: true, // user_profiles sempre ativo
        ultimo_login: userProfile.updated_at,
      }

      return { user, session: authData.session }
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async register(data: RegisterData): Promise<{ user: AuthUser; session: any }> {
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Registration failed')
      }

      // Create user profile in user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          name: data.nome, // Campo 'name' na user_profiles
          role: data.role || 'user',
        })
        .select()
        .single()

      if (profileError) {
        throw new Error('Failed to create user profile')
      }

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.name, // Campo 'name' da user_profiles
        role: userProfile.role,
        company_id: undefined, // user_profiles não tem company_id
        ativo: true, // user_profiles sempre ativo
      }

      return { user, session: authData.session }
    } catch (error) {
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Get user profile from user_profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        return null
      }

      return {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.name, // Campo 'name' da user_profiles
        role: userProfile.role,
        company_id: undefined, // user_profiles não tem company_id
        ativo: true, // user_profiles sempre ativo
        ultimo_login: userProfile.updated_at,
      }
    } catch (error) {
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<Pick<AuthUser, 'nome' | 'email'>>): Promise<AuthUser> {
    try {
      // Mapear 'nome' para 'name' se necessário
      const mappedUpdates: any = {}
      if (updates.nome) mappedUpdates.name = updates.nome
      if (updates.email) mappedUpdates.email = updates.email
      mappedUpdates.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('user_profiles')
        .update(mappedUpdates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        id: data.id,
        email: data.email,
        nome: data.name, // Campo 'name' da user_profiles
        role: data.role,
        company_id: undefined, // user_profiles não tem company_id
        ativo: true, // user_profiles sempre ativo
        ultimo_login: data.updated_at,
      }
    } catch (error) {
      throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async changePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      throw new Error(`Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      throw new Error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Método temporariamente desabilitado - user_profiles não tem company_id
  // async getUsersByCompany(companyId: string): Promise<AuthUser[]> {
  //   // Este método precisa ser reimplementado quando houver relação entre user_profiles e companies
  //   throw new Error('Method not implemented for user_profiles table')
  // }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()