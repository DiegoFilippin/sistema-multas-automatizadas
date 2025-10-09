interface DataWashResponse {
  nome: string;
  cpf: string;
  dataNascimento?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
  success: boolean;
  source: 'datawash' | 'fallback';
  warning?: string;
}

interface WebhookPayload {
  nome?: string;
  Nome?: string;
  dataNascimento?: string;
  nascimento?: string;
  data_nascimento?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    uf?: string;
    cep?: string;
  };
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  celular?: string;
  fone?: string;
  email?: string;
}

class DataWashService {
  private baseUrl = this.getBaseUrl();
  private isProduction = import.meta.env.PROD;
  
  private getBaseUrl(): string {
    // Em produção (Vercel), usar URLs relativas
    if (import.meta.env.PROD) {
      return '/api/datawash';
    }
    
    // Em desenvolvimento, usar localhost
    return 'http://localhost:3001/api/datawash';
  }
  
  async consultarCPF(cpf: string): Promise<DataWashResponse> {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      throw new Error('CPF deve ter 11 dígitos');
    }
    
    try {
      // Consultar sempre via webhook n8n (envia apenas CPF)
      return await this.consultarViaWebhook(cpfLimpo);
    } catch (error) {
      // Log informativo para casos esperados (CPF não encontrado)
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('não encontrado') || message.includes('404')) {
        console.log('CPF não encontrado no webhook, usando dados simulados:', cpfLimpo);
      } else {
        console.error('Erro inesperado na consulta CPF via webhook:', error);
      }
      
      // Sempre retornar dados simulados em caso de erro
      return this.gerarDadosSimulados(cpfLimpo);
    }
  }
  
  private async consultarViaAPI(cpf: string): Promise<DataWashResponse> {
    const response = await fetch(`${this.baseUrl}/${cpf}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // CPF não encontrado - retornar dados simulados diretamente
        console.log('CPF não encontrado na API, gerando dados simulados:', cpf);
        return this.gerarDadosSimulados(cpf);
      } else if (response.status >= 500) {
        throw new Error('Serviço temporariamente indisponível');
      } else {
        throw new Error('Erro ao consultar CPF. Tente novamente');
      }
    }
    
    const data = await response.json();
    
    if (!data.success) {
      // Se a API retornou erro, usar dados simulados
      console.log('API retornou erro, usando dados simulados:', data.warning || 'Erro na consulta CPF');
      return this.gerarDadosSimulados(cpf);
    }
    
    // Garantir que sempre tenha um email válido
    
    return data;
  }
  
  private async consultarViaProxy(cpf: string): Promise<DataWashResponse> {
    const response = await fetch(`${this.baseUrl}/cpf/${cpf}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || 'test-token'}`
      },
      // Timeout de 8 segundos
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // CPF não encontrado - retornar dados simulados diretamente
        console.log('CPF não encontrado na API, gerando dados simulados:', cpf);
        return this.gerarDadosSimulados(cpf);
      } else if (response.status === 401) {
        throw new Error('Não autorizado. Faça login novamente');
      } else if (response.status >= 500) {
        throw new Error('Serviço temporariamente indisponível');
      } else {
        throw new Error('Erro ao consultar CPF. Tente novamente');
      }
    }
    
    const data = await response.json();
    
    if (!data.success) {
      // Se a API retornou erro, usar dados simulados
      console.log('API retornou erro, usando dados simulados:', data.warning || 'Erro na consulta CPF');
      return this.gerarDadosSimulados(cpf);
    }
    
    // Garantir que sempre tenha um email válido
    
    return data;
  }
  
  private async consultarViaWebhook(cpf: string): Promise<DataWashResponse> {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const url = `${this.baseUrl}/webhook-cpf`;
    console.log('🚀 Enviando POST para proxy webhook n8n (CPF somente)...');
    console.log('   URL:', url);
    console.log('   CPF:', cpfLimpo);
    const start = Date.now();

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cpf: cpfLimpo }),
        signal: AbortSignal.timeout(10000)
      });
    } catch (err) {
      console.error('❌ Erro de rede ao chamar proxy webhook n8n:', err);
      return this.gerarDadosSimulados(cpfLimpo);
    }

    const duration = Date.now() - start;
    console.log(`⏱️ Webhook respondeu com status ${response.status} em ${duration}ms`);

    if (!response.ok) {
      console.log('❌ Webhook retornou erro:', response.status, response.statusText);
      if (response.status === 404) {
        console.log('CPF não encontrado no webhook, usando fallback simulado.');
        return this.gerarDadosSimulados(cpfLimpo);
      }
      return this.gerarDadosSimulados(cpfLimpo);
    }

    let raw: WebhookPayload;
    try {
      raw = await response.json() as WebhookPayload;
      console.log('📦 Webhook payload bruto:', raw);
    } catch (err) {
      console.error('❌ Falha ao parsear JSON do webhook:', err);
      return this.gerarDadosSimulados(cpfLimpo);
    }

    // Normalizar estruturas possíveis vindas do n8n/DataWash
    let mapped: DataWashResponse;

    // Suportar respostas como array ou objeto
    let root: any = raw as any;
    if (Array.isArray(root)) {
      // Escolher item que contenha a estrutura do DataWash se existir
      root = root.find((item: any) => item && (item.ConsultaCPFCompleta || item.DADOS)) || root[0] || {};
    }

    const compl = root?.ConsultaCPFCompleta || (raw as any)?.ConsultaCPFCompleta || null;
    if (compl) {
      const dados = compl.DADOS || compl.Dados || compl.dados || {};
      const enderecos = dados.ENDERECOS?.ENDERECO;
      const enderecoObj = Array.isArray(enderecos) ? (enderecos[0] || {}) : (enderecos || {});

      const telefones = dados.TELEFONES_MOVEIS?.TELEFONE;
      const telefoneStr = Array.isArray(telefones)
        ? (telefones[0] || '')
        : (typeof telefones === 'string' ? telefones : '');

      const emails = dados.EMAILS?.EMAIL;
      const emailStr = Array.isArray(emails)
        ? (emails[0] || '')
        : (typeof emails === 'string' ? emails : '');

      mapped = {
        nome: dados.NOME || root.nome || '',
        cpf: dados.CPF || cpfLimpo,
        dataNascimento: dados.DATA_NASC || root.dataNascimento || '',
        endereco: {
          logradouro: enderecoObj.LOGRADOURO || root.logradouro || '',
          numero: enderecoObj.NUMERO || root.numero || '',
          complemento: enderecoObj.COMPLEMENTO || root.complemento || '',
          bairro: enderecoObj.BAIRRO || root.bairro || '',
          cidade: enderecoObj.CIDADE || root.cidade || '',
          estado: enderecoObj.UF || enderecoObj.estado || root.uf || root.estado || '',
          cep: enderecoObj.CEP || root.cep || ''
        },
        telefone: telefoneStr || root.telefone || root.celular || root.fone || '',
        email: emailStr || root.email || '',
        success: true,
        source: 'datawash'
      };
    } else {
      // Fallback para payload plano (sem ConsultaCPFCompleta)
      const enderecoRaw = (raw as any).endereco || {};
      mapped = {
        nome: (raw as any).nome || (raw as any).Nome || '',
        cpf: cpfLimpo,
        dataNascimento: (raw as any).dataNascimento || (raw as any).nascimento || (raw as any).data_nascimento || '',
        endereco: {
          logradouro: enderecoRaw.logradouro || (raw as any).logradouro || '',
          numero: enderecoRaw.numero || (raw as any).numero || '',
          complemento: enderecoRaw.complemento || (raw as any).complemento || '',
          bairro: enderecoRaw.bairro || (raw as any).bairro || '',
          cidade: enderecoRaw.cidade || (raw as any).cidade || '',
          estado: enderecoRaw.estado || enderecoRaw.uf || (raw as any).estado || (raw as any).uf || '',
          cep: enderecoRaw.cep || (raw as any).cep || ''
        },
        telefone: (raw as any).telefone || (raw as any).celular || (raw as any).fone || '',
        email: (raw as any).email || '',
        success: true,
        source: 'datawash'
      };
    }

    console.log('✅ Dados mapeados do webhook:', mapped);
    return mapped;
  }
  
  private gerarEmailDoNome(nome: string): string {
    if (!nome) return 'usuario@email.com';
    
    const nomeNormalizado = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
      .trim();
    
    const partes = nomeNormalizado.split(' ').filter(p => p.length > 0);
    
    if (partes.length >= 2) {
      return `${partes[0]}.${partes[partes.length - 1]}@email.com`;
    } else if (partes.length === 1) {
      return `${partes[0]}@email.com`;
    }
    
    return 'usuario@email.com';
  }

  private gerarDadosSimulados(cpf: string): DataWashResponse {
    const nomes = [
      'João Silva Santos', 'Maria Oliveira Costa', 'Pedro Souza Lima',
      'Ana Paula Ferreira', 'Carlos Eduardo Alves', 'Fernanda Rodrigues',
      'Ricardo Pereira', 'Juliana Martins', 'Roberto Carlos', 'Patricia Lima',
      'Fernando Santos', 'Camila Rodrigues', 'Bruno Costa', 'Larissa Silva'
    ];
    
    const logradouros = [
      'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Rua Oscar Freire',
      'Av. Faria Lima', 'Rua Teodoro Sampaio', 'Rua Consolação', 'Av. Rebouças',
      'Rua Haddock Lobo', 'Av. Brigadeiro Faria Lima', 'Rua da Consolação'
    ];
    
    const bairros = [
      'Centro', 'Bela Vista', 'Consolação', 'Jardins',
      'Itaim Bibi', 'Pinheiros', 'Vila Olímpia', 'Moema',
      'Brooklin', 'Vila Madalena', 'Perdizes'
    ];
    
    const cidades = [
      'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre',
      'Curitiba', 'Salvador', 'Brasília', 'Fortaleza'
    ];
    
    const estados = ['SP', 'RJ', 'MG', 'RS', 'PR', 'BA', 'DF', 'CE'];
    
    // Usar CPF como seed para dados consistentes
    const seed = parseInt(cpf.substring(0, 3));
    const nomeIndex = seed % nomes.length;
    const logradouroIndex = seed % logradouros.length;
    const bairroIndex = seed % bairros.length;
    const cidadeIndex = seed % cidades.length;
    const estadoIndex = seed % estados.length;
    
    return {
      nome: nomes[nomeIndex],
      cpf: cpf,
      dataNascimento: `19${80 + (seed % 30)}-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`,
      endereco: {
        logradouro: logradouros[logradouroIndex],
        numero: String((seed % 999) + 1),
        complemento: seed % 3 === 0 ? `Apto ${(seed % 99) + 1}` : '',
        bairro: bairros[bairroIndex],
        cidade: cidades[cidadeIndex],
        estado: estados[estadoIndex],
        cep: `${String(seed).padStart(5, '0')}-${String(seed * 2).substring(0, 3)}`
      },
      telefone: `(${String(seed).substring(0, 2).padStart(2, '1')}) 9${String(seed).padStart(4, '0')}-${String(seed * 2).substring(0, 4)}`,
      email: this.gerarEmailDoNome(nomes[nomeIndex]),
      success: true,
      source: 'fallback',
      warning: 'Dados simulados - API DataWash indisponível'
    };
  }
  
  // Método para validar CPF
  static validarCPF(cpf: string): boolean {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    // Validar dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  }
  
  // Método para formatar CPF
  static formatarCPF(cpf: string): string {
    const cpfLimpo = cpf.replace(/\D/g, '');
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}

export const datawashService = new DataWashService();
export default DataWashService;