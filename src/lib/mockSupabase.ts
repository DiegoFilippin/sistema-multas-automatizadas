// Mock Supabase client for development when real Supabase is not configured

interface MockResponse<T = any> {
  data: T | null
  error: any
}

interface MockAuthResponse {
  data: {
    user: any
    session: any
  } | null
  error: any
}

class MockSupabaseClient {
  private mockData = {
    users: [
      {
        id: '1',
        email: 'master@multastrae.com',
        name: 'Administrador Master',
        company_id: '1',
        role: 'admin',
        is_active: true,
        last_login: null
      },
      {
        id: '2',
        email: 'despachante@exemplo.com',
        name: 'Despachante Demo',
        company_id: '1',
        role: 'user',
        is_active: true,
        last_login: null
      },
      {
        id: '3',
        email: 'cliente@exemplo.com',
        name: 'Cliente Demo',
        company_id: '1',
        role: 'viewer',
        is_active: true,
        last_login: null
      },
      {
        id: '4',
        email: 'admin@demo.com',
        name: 'Admin Demo',
        company_id: '1',
        role: 'admin',
        is_active: true,
        last_login: null
      }
    ],
    companies: [
      {
        id: '1',
        nome: 'Empresa Demo',
        cnpj: '12.345.678/0001-90',
        email: 'contato@demo.com',
        status: 'ativo'
      }
    ],
    // Adicionar tabela mock para asaas_subaccounts
    asaas_config: [
      {
        id: '1',
        environment: 'sandbox',
        api_key_sandbox: 'mock_sandbox_key_123',
        api_key_production: 'mock_production_key_456',
        webhook_url: 'https://webhook.demo.com/asaas',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    asaas_subaccounts: [
      {
        id: 'sub_demo_1',
        company_id: '1',
        asaas_account_id: 'acc_demo_1',
        wallet_id: null,
        manual_wallet_id: null,
        api_key: 'mock_api_key_123',
        account_type: 'manual',
        status: 'active',
        is_manual_config: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    multas: [
      {
        id: '1',
        company_id: '1',
        client_id: '7ae2ec03-956b-44cc-b57e-eaebab801790',
        vehicle_id: '1',
        numero_auto: 'SP123456789',
        placa_veiculo: 'ABC-1234',
        data_infracao: '2024-01-15',
        hora_infracao: '14:30:00',
        local_infracao: 'Av. Paulista, 1000 - São Paulo/SP',
        codigo_infracao: '74550',
        descricao_infracao: 'Avançar sinal vermelho',
        valor_original: 293.47,
        valor_desconto: 0,
        valor_final: 293.47,
        data_vencimento: '2024-02-15',
        status: 'pendente',
        orgao_autuador: 'CET-SP',
        pontos: 7,
        observacoes: null,
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z'
      },
      {
        id: '2',
        company_id: '1',
        client_id: '7ae2ec03-956b-44cc-b57e-eaebab801790',
        vehicle_id: '1',
        numero_auto: 'SP987654321',
        placa_veiculo: 'ABC-1234',
        data_infracao: '2024-01-20',
        hora_infracao: '09:15:00',
        local_infracao: 'Rua Augusta, 500 - São Paulo/SP',
        codigo_infracao: '74630',
        descricao_infracao: 'Estacionar em local proibido',
        valor_original: 130.16,
        valor_desconto: 0,
        valor_final: 130.16,
        data_vencimento: '2024-02-20',
        status: 'pendente',
        orgao_autuador: 'CET-SP',
        pontos: 3,
        observacoes: null,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z'
      },
      {
        id: '3',
        company_id: '1',
        client_id: 'outro-cliente-id',
        vehicle_id: '2',
        numero_auto: 'RJ111222333',
        placa_veiculo: 'XYZ-5678',
        data_infracao: '2024-01-25',
        hora_infracao: '16:45:00',
        local_infracao: 'Av. Copacabana, 200 - Rio de Janeiro/RJ',
        codigo_infracao: '74550',
        descricao_infracao: 'Excesso de velocidade',
        valor_original: 195.23,
        valor_desconto: 0,
        valor_final: 195.23,
        data_vencimento: '2024-02-25',
        status: 'pendente',
        orgao_autuador: 'DETRAN-RJ',
        pontos: 5,
        observacoes: null,
        created_at: '2024-01-25T10:00:00Z',
        updated_at: '2024-01-25T10:00:00Z'
      },
      {
        id: '4',
        company_id: '1',
        client_id: '7ae2ec03-956b-44cc-b57e-eaebab801790',
        vehicle_id: '1',
        numero_auto: 'SP444555666',
        placa_veiculo: 'ABC-1234',
        data_infracao: '2024-02-01',
        hora_infracao: '11:20:00',
        local_infracao: 'Marginal Tietê, Km 15 - São Paulo/SP',
        codigo_infracao: '74550',
        descricao_infracao: 'Excesso de velocidade',
        valor_original: 293.47,
        valor_desconto: 0,
        valor_final: 293.47,
        data_vencimento: '2024-03-01',
        status: 'pago',
        orgao_autuador: 'PRF',
        pontos: 7,
        observacoes: 'Multa paga com desconto',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z'
      },
      {
        id: '5',
        company_id: '1',
        client_id: 'outro-cliente-id-2',
        vehicle_id: '3',
        numero_auto: 'MG777888999',
        placa_veiculo: 'DEF-9012',
        data_infracao: '2024-02-05',
        hora_infracao: '13:10:00',
        local_infracao: 'BR-381, Km 200 - Belo Horizonte/MG',
        codigo_infracao: '74630',
        descricao_infracao: 'Estacionar em local proibido',
        valor_original: 130.16,
        valor_desconto: 0,
        valor_final: 130.16,
        data_vencimento: '2024-03-05',
        status: 'pendente',
        orgao_autuador: 'DETRAN-MG',
        pontos: 3,
        observacoes: null,
        created_at: '2024-02-05T10:00:00Z',
        updated_at: '2024-02-05T10:00:00Z'
      }
    ],
    recursos: [],
    precadastros: [
      {
        id: '1',
        nome: 'João Silva',
        email: 'joao@exemplo.com',
        telefone: '(11) 99999-9999',
        data_nascimento: '1985-05-15',
        cnpj: '12.345.678/0001-90',
        razao_social: 'Empresa Exemplo LTDA',
        nome_fantasia: 'Exemplo',
        endereco: 'Rua das Flores, 123',
        numero: '123',
        complemento: 'Sala 1',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        status: 'pendente',
        webhook_enviado: true,
        webhook_response: '{"success": true}',
        observacoes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    clients: [
      {
        id: '7ae2ec03-956b-44cc-b57e-eaebab801790',
        company_id: '1',
        nome: 'Ricardo Pereira',
        cpf_cnpj: '123.456.789-00',
        email: 'ricardo@exemplo.com',
        telefone: '(11) 99999-9999',
        endereco: 'Rua das Flores, 123',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
        status: 'ativo',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      },
      {
        id: 'outro-cliente-id',
        company_id: '1',
        nome: 'Maria Silva',
        cpf_cnpj: '987.654.321-00',
        email: 'maria@exemplo.com',
        telefone: '(11) 88888-8888',
        endereco: 'Av. Central, 456',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-890',
        status: 'ativo',
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }
    ]
  }

  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }): Promise<MockAuthResponse> => {
      console.log('🔄 Mock login attempt:', email)
      
      // Find user in mock data
      const user = this.mockData.users.find(u => u.email === email)
      
      if (user && (password === 'demo123' || password === 'senha123')) {
        console.log('✅ Mock login successful for:', email)
        return {
          data: {
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                name: user.name,
                company_id: user.company_id,
                role: user.role
              }
            },
            session: {
              access_token: 'mock-token-' + user.id,
              refresh_token: 'mock-refresh-token-' + user.id,
              user: {
                id: user.id,
                email: user.email
              }
            }
          },
          error: null
        }
      }
      
      console.log('❌ Mock login failed for:', email, 'with password:', password)
      return {
        data: null,
        error: { message: 'Login failed: Invalid login credentials' }
      }
    },

    signUp: async ({ email, password, options }: any): Promise<MockAuthResponse> => {
      console.log('🔄 Mock signup attempt:', email)
      return {
        data: {
          user: {
            id: Date.now().toString(),
            email,
            user_metadata: options?.data || {}
          },
          session: null
        },
        error: null
      }
    },

    signOut: async (): Promise<{ error: any }> => {
      console.log('🔄 Mock logout')
      return { error: null }
    },

    getSession: async () => {
      return {
        data: { session: null },
        error: null
      }
    },

    getUser: async () => {
      console.log('🔄 Mock getUser')
      return {
        data: { user: null },
        error: null
      }
    },

    updateUser: async (updates: any) => {
      console.log('🔄 Mock updateUser:', updates)
      return {
        data: { user: updates },
        error: null
      }
    },

    resetPasswordForEmail: async (email: string) => {
      console.log('🔄 Mock resetPasswordForEmail:', email)
      return {
        data: {},
        error: null
      }
    },

    onAuthStateChange: (callback: Function) => {
      // Mock auth state change listener
      return {
        data: { subscription: {} },
        unsubscribe: () => {}
      }
    }
  }

  from(table: string) {
    return {
      select: (columns?: string) => {
        const createQueryBuilder = (currentData?: any[]) => {
          const data = currentData || this.mockData[table as keyof typeof this.mockData] || []
          
          return {
            eq: (column: string, value: any) => {
              const filteredData = Array.isArray(data) ? data.filter((item: any) => item[column] === value) : []
              console.log(`🔄 Mock query: ${table}.select(${columns}).eq(${column}, ${value}) - Found ${filteredData.length} items`)
              return {
                ...createQueryBuilder(filteredData),
                single: async (): Promise<MockResponse> => {
                  console.log(`🔄 Mock query: ${table}.select(${columns}).eq(${column}, ${value}).single()`)
                  const result = filteredData[0] || null
                  return { data: result, error: null }
                },
                execute: async (): Promise<MockResponse> => {
                  return { data: filteredData, error: null }
                }
              }
            },
            order: (column: string, options?: { ascending?: boolean }) => {
              const sortedData = [...data].sort((a, b) => {
                const aVal = a[column]
                const bVal = b[column]
                const ascending = options?.ascending !== false
                if (ascending) {
                  return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
                } else {
                  return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
                }
              })
              console.log(`🔄 Mock query: ${table}.order(${column}, ${JSON.stringify(options)})`)
              return createQueryBuilder(sortedData)
            },
            execute: async (): Promise<MockResponse> => {
              console.log(`🔄 Mock query: ${table}.select(${columns}) - Found ${data.length} items`)
              return { data, error: null }
            }
          }
        }
        
        return createQueryBuilder()
      },
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async (): Promise<MockResponse> => {
            console.log(`🔄 Mock insert: ${table}`, data)
            const newItem = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() }
            return { data: newItem, error: null }
          }
        }),
        single: async (): Promise<MockResponse> => {
          console.log(`🔄 Mock insert: ${table}`, data)
          const newItem = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() }
          return { data: newItem, error: null }
        }
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async (): Promise<MockResponse> => {
              console.log(`🔄 Mock update: ${table}.update().eq(${column}, ${value})`, data)
              // Find and update the item in mock data
              const tableData = this.mockData[table as keyof typeof this.mockData]
              if (Array.isArray(tableData)) {
                const itemIndex = tableData.findIndex((item: any) => item[column] === value)
                if (itemIndex !== -1) {
                  tableData[itemIndex] = { ...tableData[itemIndex], ...data, updated_at: new Date().toISOString() }
                  return { data: tableData[itemIndex], error: null }
                }
              }
              return { data: { ...data, updated_at: new Date().toISOString() }, error: null }
            }
          }),
          execute: async (): Promise<MockResponse> => {
            console.log(`🔄 Mock update: ${table}.update().eq(${column}, ${value})`, data)
            return { data: null, error: null }
          }
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          execute: async (): Promise<MockResponse> => {
            console.log(`🔄 Mock delete: ${table}.delete().eq(${column}, ${value})`)
            return { data: null, error: null }
          }
        })
      })
    }
  }
}

export const createMockSupabaseClient = () => {
  console.log('🎭 Using Mock Supabase Client for development')
  console.log('📧 Demo credentials:')
  console.log('   • master@multastrae.com / demo123 (Admin)')
  console.log('   • despachante@exemplo.com / demo123 (User)')
  console.log('   • cliente@exemplo.com / demo123 (Viewer)')
  console.log('   • admin@demo.com / demo123 (Admin)')
  return new MockSupabaseClient()
}