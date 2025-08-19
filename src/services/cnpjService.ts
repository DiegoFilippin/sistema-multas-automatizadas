import axios from 'axios';

interface CNPJResponse {
  nome: string;
  fantasia: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

class CNPJService {
  private baseUrl = 'https://buscarcnpj.com.br/api/v1';

  async buscarCNPJ(cnpj: string): Promise<CNPJResponse | null> {
    try {
      // Remove caracteres não numéricos do CNPJ
      const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
      
      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ inválido');
      }
      
      const response = await axios.get(`${this.baseUrl}/cnpj/${cnpjLimpo}`);
      
      if (response.status === 200 && response.data) {
        return {
          nome: response.data.razao_social || '',
          fantasia: response.data.nome_fantasia || '',
          email: response.data.email || '',
          telefone: response.data.telefone || '',
          logradouro: response.data.logradouro || '',
          numero: response.data.numero || '',
          complemento: response.data.complemento || '',
          bairro: response.data.bairro || '',
          municipio: response.data.municipio || '',
          uf: response.data.uf || '',
          cep: response.data.cep || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      throw error;
    }
  }
}

export const cnpjService = new CNPJService();
