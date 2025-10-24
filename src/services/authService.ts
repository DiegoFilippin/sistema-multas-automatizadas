import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  nome: string
  role: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user' | 'viewer' | 'admin_master'
  company_id?: string
  ativo: boolean
  ultimo_login?: string
  asaas_customer_id?: string
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
  role?: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user'
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

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email)
        .single()

      if (profileError) {
        throw new Error('User profile not found')
      }

      // Update last login
      await supabase
        .from('users')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', userProfile.id)

      // Normalizar role para os 4 perfis da UI, com compatibilidade
      const mapDbRoleToUi = (r?: string): AuthUser['role'] => {
        switch (r) {
          case 'admin_master': return 'Superadmin'
          case 'admin': return 'ICETRAN'
          case 'user': return 'Despachante'
          case 'viewer': return 'Usuario/Cliente'
          case 'Superadmin':
          case 'ICETRAN':
          case 'Despachante':
          case 'Usuario/Cliente':
            return r as AuthUser['role']
          default:
            return 'Usuario/Cliente'
        }
      }

      // Preferir role do user_profiles se existir (admin_master, etc.)
      let rawRole = userProfile.role as string | undefined
      try {
        const { data: profileByEmail, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('email', userProfile.email)
          .maybeSingle()
        if (!profileError && profileByEmail?.role) {
          rawRole = profileByEmail.role
        }
      } catch {
        // Ignorar erros de leitura de user_profiles e seguir com role do users
      }
      // Override por e-mail para garantir que contas conhecidas sejam Superadmin
      const superadminEmails = ['superadmin@sistema.com', 'master@sistema.com']
      if (superadminEmails.includes(userProfile.email)) {
        rawRole = 'admin_master'
      }

      const uiRole = mapDbRoleToUi(rawRole)

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.nome,
        role: uiRole,
        company_id: userProfile.company_id,
        ativo: userProfile.ativo,
        ultimo_login: userProfile.ultimo_login,
        asaas_customer_id: userProfile.asaas_customer_id,
      }

      return { user, session: authData.session }
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async register(data: RegisterData): Promise<{ user: AuthUser; session: any }> {
    try {
      // Map UI role to DB role ('admin' | 'user')
      const mapRoleToDb = (r?: RegisterData['role']): 'admin' | 'user' => {
        switch (r) {
          case 'Superadmin':
          case 'ICETRAN':
          case 'admin':
            return 'admin'
          case 'Despachante':
          case 'Usuario/Cliente':
          case 'user':
          default:
            return 'user'
        }
      }

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

      const dbRole = mapRoleToDb(data.role)

      // Create user profile in users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          nome: data.nome,
          role: dbRole,
          company_id: data.company_id,
          ativo: true,
        })
        .select()
        .single()

      if (profileError) {
        throw new Error('Failed to create user profile')
      }

      const user: AuthUser = {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.nome,
        role: userProfile.role,
        company_id: userProfile.company_id,
        ativo: userProfile.ativo,
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

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (profileError) {
        return null
      }

      // Normalizar role para os 4 perfis da UI, com compatibilidade
      const mapDbRoleToUi = (r?: string): AuthUser['role'] => {
        switch (r) {
          case 'admin_master': return 'Superadmin'
          case 'admin': return 'ICETRAN'
          case 'user': return 'Despachante'
          case 'viewer': return 'Usuario/Cliente'
          case 'Superadmin':
          case 'ICETRAN':
          case 'Despachante':
          case 'Usuario/Cliente':
            return r as AuthUser['role']
          default:
            return 'Usuario/Cliente'
        }
      }

      // Preferir role do user_profiles se existir (admin_master, etc.)
      let rawRole = userProfile.role as string | undefined
      try {
        const { data: profileByEmail, error: profileError2 } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('email', userProfile.email)
          .maybeSingle()
        if (!profileError2 && profileByEmail?.role) {
          rawRole = profileByEmail.role
        }
      } catch {
        // Ignorar erros de leitura de user_profiles e seguir com role do users
      }
      // Override por e-mail para garantir que contas conhecidas sejam Superadmin
      const superadminEmails = ['superadmin@sistema.com', 'master@sistema.com']
      if (superadminEmails.includes(userProfile.email)) {
        rawRole = 'admin_master'
      }

      const uiRole = mapDbRoleToUi(rawRole)

      return {
        id: userProfile.id,
        email: userProfile.email,
        nome: userProfile.nome,
        role: uiRole,
        company_id: userProfile.company_id,
        ativo: userProfile.ativo,
        ultimo_login: userProfile.ultimo_login,
        asaas_customer_id: userProfile.asaas_customer_id,
      }
    } catch {
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<Pick<AuthUser, 'nome' | 'email'>>): Promise<AuthUser> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        company_id: data.company_id,
        ativo: data.ativo,
        ultimo_login: data.ultimo_login,
        asaas_customer_id: data.asaas_customer_id,
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

  async getUsersByCompany(companyId: string): Promise<AuthUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('ativo', true)

      if (error) {
        throw new Error(error.message)
      }

      return data.map(user => ({
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        company_id: user.company_id,
        ativo: user.ativo,
        ultimo_login: user.ultimo_login,
        asaas_customer_id: user.asaas_customer_id,
      }))
    } catch (error) {
      throw new Error(`Failed to get users by company: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

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