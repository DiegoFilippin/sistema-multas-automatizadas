import { GoogleGenerativeAI } from '@google/generative-ai';

interface DocumentoProcessado {
  numeroAuto: string;
  dataInfracao: string;
  horaInfracao: string;
  localInfracao: string;
  codigoInfracao: string;
  descricaoInfracao: string;
  valorMulta: number;
  placaVeiculo: string;
  condutor?: string;
  orgaoAutuador: string;
  agente?: string;
  observacoes?: string;
}

interface DocumentoVeiculoProcessado {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  renavam?: string;
  chassi?: string;
  proprietario?: string;
  categoria?: string;
  combustivel?: string;
}

interface DocumentoPessoalProcessado {
  nome: string;
  cpf: string;
  rg?: string;
  cnh?: string;
  dataNascimento?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
}

class GeminiOcrService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY não está configurada no arquivo .env');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Converte arquivo para formato compatível com Gemini
   */
  private async fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  /**
   * Extrai dados do auto de infração usando Gemini Vision com retry logic
   */
  async extrairDadosAutoInfracao(file: File): Promise<DocumentoProcessado> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 segundos
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de processamento OCR...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        });
        
        const imagePart = await this.fileToGenerativePart(file);
        
        const prompt = `Analise esta imagem de um auto de infração de trânsito brasileiro e extraia as informações em formato JSON.

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "numeroAuto": "número do auto de infração",
  "dataInfracao": "data no formato DD/MM/AAAA",
  "horaInfracao": "hora no formato HH:MM",
  "localInfracao": "local da infração",
  "codigoInfracao": "código da infração",
  "descricaoInfracao": "descrição da infração",
  "valorMulta": 0,
  "placaVeiculo": "placa do veículo",
  "condutor": "nome do condutor",
  "orgaoAutuador": "órgão autuador",
  "agente": "nome do agente",
  "observacoes": "observações"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não conseguir ler um campo, use "" para strings ou 0 para números
- Não adicione explicações ou comentários`;

        const result = await model.generateContent([
          imagePart,
          { text: prompt }
        ]);

        const response = await result.response;
        let jsonStr = response.text().trim();
      
      console.log('Resposta bruta do Gemini:', jsonStr);
      
      // Limpar possíveis caracteres extras do response
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }
      
      // Remover quebras de linha e espaços extras
      jsonStr = jsonStr.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
      
      // Tentar encontrar o JSON dentro da resposta
      const jsonMatch = jsonStr.match(/\{[^}]*\}/s);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      console.log('JSON limpo para parse:', jsonStr);

      const dadosExtraidos = JSON.parse(jsonStr);
      
      // Validar se os dados essenciais foram extraídos
      if (!dadosExtraidos.numeroAuto && !dadosExtraidos.placaVeiculo && !dadosExtraidos.codigoInfracao) {
        throw new Error('A resposta da IA não contém os dados esperados. A imagem pode estar ilegível.');
      }
      
      // Validar e converter tipos se necessário
      return {
        numeroAuto: dadosExtraidos.numeroAuto || '',
        dataInfracao: dadosExtraidos.dataInfracao || '',
        horaInfracao: dadosExtraidos.horaInfracao || '',
        localInfracao: dadosExtraidos.localInfracao || '',
        codigoInfracao: dadosExtraidos.codigoInfracao || '',
        descricaoInfracao: dadosExtraidos.descricaoInfracao || '',
        valorMulta: parseFloat(dadosExtraidos.valorMulta) || 0,
        placaVeiculo: dadosExtraidos.placaVeiculo || '',
        condutor: dadosExtraidos.condutor || '',
        orgaoAutuador: dadosExtraidos.orgaoAutuador || '',
        agente: dadosExtraidos.agente || '',
        observacoes: dadosExtraidos.observacoes || ''
      };

      } catch (error: any) {
        console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, error);
        
        // Verificar se é erro 503 (modelo sobrecarregado) ou similar
        const isRetryableError = 
          error?.message?.includes('503') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('rate limit') ||
          error?.status === 503 ||
          error?.code === 503;
        
        if (isRetryableError && attempt < maxRetries) {
          console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // Backoff exponencial
          continue;
        }
        
        // Se chegou aqui, ou não é um erro recuperável ou esgotaram as tentativas
        if (attempt === maxRetries) {
          console.error('Todas as tentativas falharam');
          
          if (isRetryableError) {
            throw new Error(
              'O serviço de OCR está temporariamente sobrecarregado. ' +
              'Tente novamente em alguns minutos. Se o problema persistir, ' +
              'entre em contato com o suporte.'
            );
          }
          
          if (error instanceof SyntaxError) {
            console.error('Erro de parsing JSON após todas as tentativas');
            
            // Fallback: retornar dados vazios se não conseguir parsear
            return {
              numeroAuto: '',
              dataInfracao: '',
              horaInfracao: '',
              localInfracao: '',
              codigoInfracao: '',
              descricaoInfracao: 'Erro ao processar documento - dados não extraídos',
              valorMulta: 0,
              placaVeiculo: '',
              condutor: '',
              orgaoAutuador: '',
              agente: '',
              observacoes: 'Falha na extração automática após múltiplas tentativas. Verifique se a imagem está nítida.'
            };
          }
          
          if (error instanceof Error) {
            throw new Error(`Erro no processamento OCR após ${maxRetries} tentativas: ${error.message}`);
          } else {
            throw new Error(
              `Não foi possível extrair os dados do documento após ${maxRetries} tentativas. ` +
              'Verifique se a imagem está nítida e tente novamente.'
            );
          }
        }
      }
    }
    
    // Este ponto nunca deveria ser alcançado
    throw new Error('Erro inesperado no processamento OCR.');
  }

  /**
   * Extrai dados de documento de veículo (CRLV, DUT, etc.) usando Gemini Vision
   */
  async extrairDadosDocumentoVeiculo(file: File): Promise<DocumentoVeiculoProcessado> {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de processamento OCR do documento de veículo...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        });
        
        const imagePart = await this.fileToGenerativePart(file);
        
        const prompt = `Analise esta imagem de um documento de veículo brasileiro (CRLV, DUT, CNH ou similar) e extraia as informações em formato JSON.

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "placa": "placa do veículo no formato ABC-1234",
  "marca": "marca do veículo",
  "modelo": "modelo do veículo",
  "ano": 0,
  "cor": "cor do veículo",
  "renavam": "número do RENAVAM",
  "chassi": "número do chassi",
  "proprietario": "nome do proprietário",
  "categoria": "categoria do veículo",
  "combustivel": "tipo de combustível (ex: GASOLINA, ETANOL, FLEX, DIESEL, GNV)"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não conseguir ler um campo, use "" para strings ou 0 para números
- Para o ano, extraia apenas o número (ex: 2020)
- Para a placa, use o formato padrão brasileiro
- Para combustível, procure por termos como: GASOLINA, ÁLCOOL, ETANOL, FLEX, DIESEL, GNV, BICOMBUSTÍVEL
- Não adicione explicações ou comentários`;

        const result = await model.generateContent([
          imagePart,
          { text: prompt }
        ]);

        const response = await result.response;
        let jsonStr = response.text().trim();
      
        console.log('Resposta bruta do Gemini (veículo):', jsonStr);
      
        // Limpar possíveis caracteres extras do response
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7, -3).trim();
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3, -3).trim();
        }
        
        // Remover quebras de linha e espaços extras
        jsonStr = jsonStr.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
        
        // Tentar encontrar o JSON dentro da resposta
        const jsonMatch = jsonStr.match(/\{[^}]*\}/s);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        console.log('JSON limpo para parse (veículo):', jsonStr);

        const dadosExtraidos = JSON.parse(jsonStr);
        
        // Debug: Log dos dados extraídos
        console.log('Dados extraídos do Gemini (veículo):', dadosExtraidos);
        console.log('Campo combustível extraído:', dadosExtraidos.combustivel);
        
        // Validar se os dados essenciais foram extraídos
        if (!dadosExtraidos.placa && !dadosExtraidos.marca && !dadosExtraidos.modelo) {
          throw new Error('A resposta da IA não contém os dados esperados. A imagem pode estar ilegível.');
        }
        
        // Validar e converter tipos se necessário
        const resultado = {
          placa: dadosExtraidos.placa || '',
          marca: dadosExtraidos.marca || '',
          modelo: dadosExtraidos.modelo || '',
          ano: parseInt(dadosExtraidos.ano) || 0,
          cor: dadosExtraidos.cor || '',
          renavam: dadosExtraidos.renavam || '',
          chassi: dadosExtraidos.chassi || '',
          proprietario: dadosExtraidos.proprietario || '',
          categoria: dadosExtraidos.categoria || '',
          combustivel: dadosExtraidos.combustivel || ''
        };
        
        // Debug: Log do resultado final
        console.log('Resultado final processado:', resultado);
        console.log('Campo combustível no resultado:', resultado.combustivel);
        
        return resultado;

      } catch (error: any) {
        console.error(`Erro na tentativa ${attempt}/${maxRetries} (veículo):`, error);
        
        // Verificar se é erro 503 (modelo sobrecarregado) ou similar
        const isRetryableError = 
          error?.message?.includes('503') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('rate limit') ||
          error?.status === 503 ||
          error?.code === 503;
        
        if (isRetryableError && attempt < maxRetries) {
          console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        // Se chegou aqui, ou não é um erro recuperável ou esgotaram as tentativas
        if (attempt === maxRetries) {
          console.error('Todas as tentativas falharam (veículo)');
          
          if (isRetryableError) {
            throw new Error(
              'O serviço de OCR está temporariamente sobrecarregado. ' +
              'Tente novamente em alguns minutos. Se o problema persistir, ' +
              'entre em contato com o suporte.'
            );
          }
          
          if (error instanceof SyntaxError) {
            console.error('Erro de parsing JSON após todas as tentativas (veículo)');
            
            // Fallback: retornar dados vazios se não conseguir parsear
            return {
              placa: '',
              marca: '',
              modelo: '',
              ano: 0,
              cor: '',
              renavam: '',
              chassi: '',
              proprietario: '',
              categoria: '',
              combustivel: ''
            };
          }
          
          if (error instanceof Error) {
            throw new Error(`Erro no processamento OCR de veículo após ${maxRetries} tentativas: ${error.message}`);
          } else {
            throw new Error(
              `Não foi possível extrair os dados do documento de veículo após ${maxRetries} tentativas. ` +
              'Verifique se a imagem está nítida e tente novamente.'
            );
          }
        }
      }
    }
    
    // Este ponto nunca deveria ser alcançado
    throw new Error('Erro inesperado no processamento OCR de veículo.');
  }

  /**
   * Extrai dados de documento pessoal (CNH, RG, CPF) usando Gemini Vision
   */
  async extrairDadosPessoais(file: File): Promise<DocumentoPessoalProcessado> {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries} de processamento OCR do documento pessoal...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        });
        
        const imagePart = await this.fileToGenerativePart(file);
        
        const prompt = `Analise esta imagem de um documento pessoal brasileiro (CNH, RG, CPF ou similar) e extraia as informações em formato JSON.

Retorne APENAS um objeto JSON válido com os seguintes campos:
{
  "nome": "nome completo da pessoa",
  "cpf": "CPF no formato 000.000.000-00",
  "rg": "número do RG",
  "cnh": "número da CNH",
  "dataNascimento": "data de nascimento no formato DD/MM/AAAA",
  "endereco": "logradouro/rua",
  "numero": "número do endereço",
  "complemento": "complemento do endereço",
  "bairro": "bairro",
  "cidade": "cidade",
  "estado": "estado (sigla)",
  "cep": "CEP no formato 00000-000",
  "telefone": "telefone se disponível",
  "email": "email se disponível"
}

INSTRUÇÕES ESPECÍFICAS PARA DATA DE NASCIMENTO:
- Na CNH, procure pelos campos: "DATA DE NASCIMENTO", "NASCIMENTO", "NASC:", "DATA NASC:", "NASCTO:"
- A data pode estar em formatos como: DD/MM/AAAA, DD.MM.AAAA, DD-MM-AAAA
- Exemplos: "15/03/1985", "15.03.1985", "15-03-1985"
- Converta sempre para o formato DD/MM/AAAA
- Se encontrar apenas o ano, use 01/01/AAAA
- No RG, procure por "NASCIMENTO" ou "DATA NASC"

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não conseguir ler um campo, use "" para strings
- Para CPF, mantenha a formatação com pontos e hífen
- Para CEP, mantenha a formatação com hífen
- Para data de nascimento, use SEMPRE o formato DD/MM/AAAA
- Procure atentamente pela data de nascimento, é um campo obrigatório na CNH
- Não adicione explicações ou comentários`;

        const result = await model.generateContent([
          imagePart,
          { text: prompt }
        ]);

        const response = await result.response;
        let jsonStr = response.text().trim();
      
        console.log('Resposta bruta do Gemini (documento pessoal):', jsonStr);
      
        // Limpar possíveis caracteres extras do response
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7, -3).trim();
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3, -3).trim();
        }
        
        // Remover quebras de linha e espaços extras
        jsonStr = jsonStr.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
        
        // Tentar encontrar o JSON dentro da resposta
        const jsonMatch = jsonStr.match(/\{[^}]*\}/s);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        console.log('JSON limpo para parse (documento pessoal):', jsonStr);

        const dadosExtraidos = JSON.parse(jsonStr);
        
        // Debug: Log dos dados extraídos
        console.log('Dados extraídos do Gemini (documento pessoal):', dadosExtraidos);
        
        // Debug específico para data de nascimento
        console.log('Data de nascimento extraída:', dadosExtraidos.dataNascimento);
        if (!dadosExtraidos.dataNascimento) {
          console.warn('⚠️ ATENÇÃO: Data de nascimento não foi extraída do documento!');
          console.log('Campos disponíveis na resposta:', Object.keys(dadosExtraidos));
        } else {
          console.log('✅ Data de nascimento extraída com sucesso:', dadosExtraidos.dataNascimento);
        }
        
        // Validar se os dados essenciais foram extraídos
        if (!dadosExtraidos.nome && !dadosExtraidos.cpf) {
          throw new Error('A resposta da IA não contém os dados esperados. A imagem pode estar ilegível.');
        }
        
        // Validar e converter tipos se necessário
        const resultado = {
          nome: dadosExtraidos.nome || '',
          cpf: dadosExtraidos.cpf || '',
          rg: dadosExtraidos.rg || '',
          cnh: dadosExtraidos.cnh || '',
          dataNascimento: dadosExtraidos.dataNascimento || '',
          endereco: {
            logradouro: dadosExtraidos.endereco || '',
            numero: dadosExtraidos.numero || '',
            complemento: dadosExtraidos.complemento || '',
            bairro: dadosExtraidos.bairro || '',
            cidade: dadosExtraidos.cidade || '',
            estado: dadosExtraidos.estado || '',
            cep: dadosExtraidos.cep || ''
          },
          telefone: dadosExtraidos.telefone || '',
          email: dadosExtraidos.email || ''
        };
        
        // Debug: Log do resultado final
        console.log('Resultado final processado (documento pessoal):', resultado);
        
        // Debug específico para confirmar data de nascimento no resultado final
        if (resultado.dataNascimento) {
          console.log('✅ Data de nascimento incluída no resultado final:', resultado.dataNascimento);
        } else {
          console.warn('❌ Data de nascimento NÃO incluída no resultado final!');
        }
        
        return resultado;

      } catch (error: any) {
        console.error(`Erro na tentativa ${attempt}/${maxRetries} (documento pessoal):`, error);
        
        // Verificar se é erro 503 (modelo sobrecarregado) ou similar
        const isRetryableError = 
          error?.message?.includes('503') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('rate limit') ||
          error?.status === 503 ||
          error?.code === 503;
        
        if (isRetryableError && attempt < maxRetries) {
          console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        // Se chegou aqui, ou não é um erro recuperável ou esgotaram as tentativas
        if (attempt === maxRetries) {
          console.error('Todas as tentativas falharam (documento pessoal)');
          
          if (isRetryableError) {
            throw new Error(
              'O serviço de OCR está temporariamente sobrecarregado. ' +
              'Tente novamente em alguns minutos. Se o problema persistir, ' +
              'entre em contato com o suporte.'
            );
          }
          
          if (error instanceof SyntaxError) {
            console.error('Erro de parsing JSON após todas as tentativas (documento pessoal)');
            
            // Fallback: retornar dados vazios se não conseguir parsear
            return {
              nome: '',
              cpf: '',
              rg: '',
              cnh: '',
              dataNascimento: '',
              endereco: {
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                estado: '',
                cep: ''
              },
              telefone: '',
              email: ''
            };
          }
          
          if (error instanceof Error) {
            throw new Error(`Erro no processamento OCR de documento pessoal após ${maxRetries} tentativas: ${error.message}`);
          } else {
            throw new Error(
              `Não foi possível extrair os dados do documento pessoal após ${maxRetries} tentativas. ` +
              'Verifique se a imagem está nítida e tente novamente.'
            );
          }
        }
      }
    }
    
    // Este ponto nunca deveria ser alcançado
    throw new Error('Erro inesperado no processamento OCR de documento pessoal.');
  }

  /**
   * Valida se a API key está configurada
   */
  static isConfigured(): boolean {
    return !!import.meta.env.VITE_GEMINI_API_KEY && 
           import.meta.env.VITE_GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';
  }
}

export default GeminiOcrService;
export type { DocumentoProcessado, DocumentoVeiculoProcessado, DocumentoPessoalProcessado };
