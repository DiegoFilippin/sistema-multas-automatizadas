import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger'

const log = logger.scope('services/gemini-ocr')

interface DocumentoProcessado {
  // Dados básicos (existentes)
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
  
  // Dados do equipamento
  numeroEquipamento?: string;
  dadosEquipamento?: string;
  tipoEquipamento?: string;
  dataAfericao?: string;
  
  // Dados do proprietário
  nomeProprietario?: string;
  cpfCnpjProprietario?: string;
  identificacaoProprietario?: string;
  
  // Observações detalhadas
  observacoesCompletas?: string;
  mensagemSenatran?: string;
  motivoNaoAbordagem?: string;
  
  // Registro fotográfico
  temRegistroFotografico?: boolean;
  descricaoFoto?: string;
  placaFoto?: string;
  caracteristicasVeiculo?: string;
  dataHoraFoto?: string;
  
  // Notificação de autuação
  codigoAcesso?: string;
  linkNotificacao?: string;
  protocoloNotificacao?: string;
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
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ VITE_GEMINI_API_KEY não está configurada - serviço Gemini OCR desabilitado');
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Converte arquivo para formato compatível com Gemini
   * Aceita File, ArrayBuffer ou base64 string
   */
  private async fileToGenerativePart(fileOrData: File | ArrayBuffer | { base64: string; mimeType: string }) {
    console.log('📂 [GeminiOCR] Convertendo dados para base64...');
    
    // Se já é base64, retornar diretamente
    if (typeof fileOrData === 'object' && 'base64' in fileOrData) {
      console.log('✅ [GeminiOCR] Dados já em base64, tamanho:', fileOrData.base64.length);
      return {
        inlineData: { data: fileOrData.base64, mimeType: fileOrData.mimeType },
      };
    }
    
    // Se é ArrayBuffer, converter diretamente
    if (fileOrData instanceof ArrayBuffer) {
      console.log('📂 [GeminiOCR] Convertendo ArrayBuffer para base64...');
      const uint8Array = new Uint8Array(fileOrData);
      let binaryString = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Data = btoa(binaryString);
      console.log('✅ [GeminiOCR] Base64 gerado de ArrayBuffer, tamanho:', base64Data.length);
      
      return {
        inlineData: { data: base64Data, mimeType: 'application/octet-stream' },
      };
    }
    
    // É um File object
    const file = fileOrData as File;
    console.log('📂 [GeminiOCR] Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size, 'bytes');
    
    // Verificar se o arquivo é válido
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }
    
    if (file.size === 0) {
      throw new Error('Arquivo está vazio (0 bytes)');
    }
    
    // Verificar tamanho máximo (20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: 20MB. Tamanho do arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Usar ArrayBuffer como alternativa mais confiável
    try {
      console.log('📂 [GeminiOCR] Lendo arquivo como ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ [GeminiOCR] ArrayBuffer obtido, tamanho:', arrayBuffer.byteLength);
      
      // Converter ArrayBuffer para Base64
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Data = btoa(binaryString);
      console.log('✅ [GeminiOCR] Base64 gerado, tamanho:', base64Data.length, 'caracteres');
      
      // Determinar MIME type
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else mimeType = 'application/octet-stream';
        console.log('📂 [GeminiOCR] MIME type inferido:', mimeType);
      }
      
      return {
        inlineData: { data: base64Data, mimeType },
      };
    } catch (error: any) {
      // Melhor serialização do erro para debug
      let errorDetails = 'erro desconhecido';
      if (error instanceof Error) {
        errorDetails = error.message;
      } else if (error && typeof error === 'object') {
        try {
          errorDetails = JSON.stringify(error);
        } catch {
          errorDetails = error.toString?.() || 'objeto não serializável';
        }
      } else if (error) {
        errorDetails = String(error);
      }
      
      console.error('❌ [GeminiOCR] Erro ao converter arquivo:', errorDetails);
      console.error('❌ [GeminiOCR] Tipo do erro:', typeof error);
      console.error('❌ [GeminiOCR] Stack:', error?.stack || 'sem stack');
      
      // Verificar se é erro de referência perdida
      if (errorDetails.includes('NotReadable') || errorDetails.includes('reference') || errorDetails === '{}') {
        throw new Error('Arquivo não pode ser lido. A referência foi perdida. Faça o upload novamente.');
      }
      
      throw new Error(`Erro ao processar arquivo: ${errorDetails}`);
    }
  }
  
  /**
   * Pré-processa o arquivo para evitar perda de referência
   * Deve ser chamado imediatamente após o upload
   */
  async preProcessFile(file: File): Promise<{ base64: string; mimeType: string; fileName: string }> {
    console.log('🔄 [GeminiOCR] Pré-processando arquivo para evitar perda de referência...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binaryString);
      
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else mimeType = 'application/octet-stream';
      }
      
      console.log('✅ [GeminiOCR] Arquivo pré-processado:', {
        fileName: file.name,
        mimeType,
        base64Length: base64.length
      });
      
      return { base64, mimeType, fileName: file.name };
    } catch (error: any) {
      console.error('❌ [GeminiOCR] Erro no pré-processamento:', error);
      throw new Error('Erro ao pré-processar arquivo. Tente novamente.');
    }
  }
  
  /**
   * Extrai dados usando dados pré-processados (base64)
   */
  async extrairDadosAutoInfracaoFromBase64(data: { base64: string; mimeType: string }): Promise<DocumentoProcessado> {
    console.log('🔍 [GeminiOCR] Iniciando extração de dados de base64...');
    
    if (!this.genAI) {
      throw new Error('Serviço Gemini não está configurado. Configure VITE_GEMINI_API_KEY nas variáveis de ambiente.');
    }
    
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [GeminiOCR] Tentativa ${attempt}/${maxRetries} de processamento OCR...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.5-pro',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        });
        
        const imagePart = await this.fileToGenerativePart(data);
        
        const prompt = this.getExtractionPrompt();
        
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        return this.parseOcrResponse(text);
      } catch (error: any) {
        console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Erro no processamento OCR após ${maxRetries} tentativas: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error('Erro inesperado no processamento OCR');
  }
  
  private getExtractionPrompt(): string {
    return `Analise esta imagem de um auto de infração de trânsito brasileiro e extraia TODAS as informações disponíveis em formato JSON.

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
  "observacoes": "observações básicas",
  
  "numeroEquipamento": "número do equipamento ou instrumento de aferição",
  "dadosEquipamento": "dados técnicos do equipamento",
  "tipoEquipamento": "tipo de equipamento (radar, lombada, etc.)",
  "dataAfericao": "data de aferição do equipamento",
  
  "nomeProprietario": "nome do proprietário/arrendatário",
  "cpfCnpjProprietario": "CPF/CNPJ do proprietário",
  "identificacaoProprietario": "identificação completa do proprietário",
  
  "observacoesCompletas": "campo observações completo",
  "mensagemSenatran": "mensagem SENATRAN",
  "motivoNaoAbordagem": "motivo da não abordagem",
  
  "temRegistroFotografico": true,
  "descricaoFoto": "transcrição da imagem do registro fotográfico",
  "placaFoto": "placa visível na foto",
  "caracteristicasVeiculo": "características do veículo na foto",
  "dataHoraFoto": "data/hora do registro fotográfico",
  
  "codigoAcesso": "código de acesso da notificação",
  "linkNotificacao": "link ou informações de acesso",
  "protocoloNotificacao": "protocolo da notificação"
}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`;
  }
  
  private parseOcrResponse(text: string): DocumentoProcessado {
    console.log('📝 [GeminiOCR] Resposta bruta (primeiros 500 chars):', text.substring(0, 500));
    
    // Limpar resposta
    let cleanText = text.trim();
    
    // Remover marcadores de código
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();
    
    // Tentar extrair JSON de dentro do texto
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }
    
    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ [GeminiOCR] Erro ao parsear JSON:', parseError);
      console.error('❌ [GeminiOCR] Texto limpo:', cleanText.substring(0, 1000));
      
      // Tentar recuperar JSON incompleto adicionando fechamentos
      try {
        let fixedJson = cleanText;
        // Contar chaves abertas e fechar
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '"}';
        }
        return JSON.parse(fixedJson);
      } catch {
        throw new Error('Resposta do OCR não é um JSON válido');
      }
    }
  }

  /**
   * Extrai dados do auto de infração usando Gemini Vision com retry logic
   */
  async extrairDadosAutoInfracao(file: File): Promise<DocumentoProcessado> {
    console.log('🔍 [GeminiOCR] Iniciando extração de dados...');
    console.log('📄 [GeminiOCR] Arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);
    
    if (!this.genAI) {
      console.error('❌ [GeminiOCR] genAI não está configurado');
      throw new Error('Serviço Gemini não está configurado. Configure VITE_GEMINI_API_KEY nas variáveis de ambiente.');
    }
    
    console.log('✅ [GeminiOCR] genAI está configurado');
    
    const maxRetries = 3;
    const retryDelay = 2000; // 2 segundos
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [GeminiOCR] Tentativa ${attempt}/${maxRetries} de processamento OCR...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.5-pro',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        });
        
        const imagePart = await this.fileToGenerativePart(file);
        
        const prompt = `Analise esta imagem de um auto de infração de trânsito brasileiro e extraia TODAS as informações disponíveis em formato JSON.

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
  "observacoes": "observações básicas",
  
  "numeroEquipamento": "número do equipamento ou instrumento de aferição",
  "dadosEquipamento": "dados técnicos do equipamento",
  "tipoEquipamento": "tipo de equipamento (radar, lombada, etc.)",
  "dataAfericao": "data de aferição do equipamento",
  
  "nomeProprietario": "nome do proprietário/arrendatário",
  "cpfCnpjProprietario": "CPF/CNPJ do proprietário",
  "identificacaoProprietario": "identificação completa do proprietário",
  
  "observacoesCompletas": "campo observações completo",
  "mensagemSenatran": "mensagem SENATRAN",
  "motivoNaoAbordagem": "motivo da não abordagem",
  
  "temRegistroFotografico": true,
  "descricaoFoto": "transcrição da imagem do registro fotográfico",
  "placaFoto": "placa visível na foto",
  "caracteristicasVeiculo": "características do veículo na foto",
  "dataHoraFoto": "data/hora do registro fotográfico",
  
  "codigoAcesso": "código de acesso da notificação",
  "linkNotificacao": "link ou informações de acesso",
  "protocoloNotificacao": "protocolo da notificação"
}

INSTRUÇÕES ESPECÍFICAS:
- DADOS DO EQUIPAMENTO: Procure por "EQUIPAMENTO", "INSTRUMENTO", "RADAR", "LOMBADA", "MEDIÇÃO", "MODELO", "ÓRGÃO"
- DATA DE AFERIÇÃO: ATENÇÃO ESPECIAL! Procure por:
  * Termos: "AFERIÇÃO", "CALIBRAÇÃO", "VERIFICAÇÃO", "VALIDADE", "VÁLIDO ATÉ", "PRÓXIMA AFERIÇÃO", "ÚLTIMA CALIBRAÇÃO"
  * Pode aparecer próximo aos dados do equipamento, modelo, número do equipamento
  * Formatos possíveis: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, DD/MM/AA
  * Pode estar em seção separada ou junto com dados técnicos do equipamento
  * Procure em TODA a área relacionada ao equipamento de medição
- DADOS DO PROPRIETÁRIO: Procure por "PROPRIETÁRIO", "ARRENDATÁRIO", seções com CPF/CNPJ
- OBSERVAÇÕES: Extraia TODAS as observações, mensagens SENATRAN, motivos de não abordagem
- REGISTRO FOTOGRÁFICO: Se houver foto do veículo, descreva detalhadamente o que vê
- NOTIFICAÇÃO: Procure por códigos de acesso, links, protocolos de notificação
- temRegistroFotografico: true se houver foto do veículo, false caso contrário

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não conseguir ler um campo, use "" para strings, 0 para números, false para boolean
- Extraia o MÁXIMO de informações possível
- PRIORIZE a extração da data de aferição - é informação crítica!
- Não adicione explicações ou comentários`;

        const result = await model.generateContent([
          imagePart,
          { text: prompt }
        ]);

        const response = await result.response;
        let jsonStr = response.text().trim();
      
      // console.log('Resposta bruta do Gemini:', jsonStr);
      
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
      
      // console.log('JSON limpo para parse:', jsonStr);

      const dadosExtraidos = JSON.parse(jsonStr);
      
      // Validar se os dados essenciais foram extraídos
      if (!dadosExtraidos.numeroAuto && !dadosExtraidos.placaVeiculo && !dadosExtraidos.codigoInfracao) {
        throw new Error('A resposta da IA não contém os dados esperados. A imagem pode estar ilegível.');
      }
      
      // Validar e converter tipos se necessário
      return {
        // Dados básicos
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
        observacoes: dadosExtraidos.observacoes || '',
        
        // Dados do equipamento
        numeroEquipamento: dadosExtraidos.numeroEquipamento || '',
        dadosEquipamento: dadosExtraidos.dadosEquipamento || '',
        tipoEquipamento: dadosExtraidos.tipoEquipamento || '',
        dataAfericao: dadosExtraidos.dataAfericao || '',
        
        // Dados do proprietário
        nomeProprietario: dadosExtraidos.nomeProprietario || '',
        cpfCnpjProprietario: dadosExtraidos.cpfCnpjProprietario || '',
        identificacaoProprietario: dadosExtraidos.identificacaoProprietario || '',
        
        // Observações detalhadas
        observacoesCompletas: dadosExtraidos.observacoesCompletas || '',
        mensagemSenatran: dadosExtraidos.mensagemSenatran || '',
        motivoNaoAbordagem: dadosExtraidos.motivoNaoAbordagem || '',
        
        // Registro fotográfico
        temRegistroFotografico: dadosExtraidos.temRegistroFotografico || false,
        descricaoFoto: dadosExtraidos.descricaoFoto || '',
        placaFoto: dadosExtraidos.placaFoto || '',
        caracteristicasVeiculo: dadosExtraidos.caracteristicasVeiculo || '',
        dataHoraFoto: dadosExtraidos.dataHoraFoto || '',
        
        // Notificação de autuação
        codigoAcesso: dadosExtraidos.codigoAcesso || '',
        linkNotificacao: dadosExtraidos.linkNotificacao || '',
        protocoloNotificacao: dadosExtraidos.protocoloNotificacao || ''
      };

      } catch (error: any) {
        console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, error);
        
        // Verificar se é erro de API key inválida
        const isApiKeyError = 
          error?.message?.includes('API key not valid') ||
          error?.message?.includes('API_KEY_INVALID') ||
          error?.message?.includes('400');
        
        // Se for erro de API key, não tentar novamente
        if (isApiKeyError) {
          console.error('❌ API key do Gemini inválida ou não configurada');
          throw new Error(
            'API key not valid. Please pass a valid API key.'
          );
        }
        
        // Verificar se é erro 503 (modelo sobrecarregado) ou similar
        const isRetryableError = 
          error?.message?.includes('503') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('rate limit') ||
          error?.status === 503 ||
          error?.code === 503;
        
        if (isRetryableError && attempt < maxRetries) {
          // console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
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
              // Dados básicos
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
              observacoes: 'Falha na extração automática após múltiplas tentativas. Verifique se a imagem está nítida.',
              
              // Dados do equipamento
              numeroEquipamento: '',
              dadosEquipamento: '',
              tipoEquipamento: '',
              dataAfericao: '',
              
              // Dados do proprietário
              nomeProprietario: '',
              cpfCnpjProprietario: '',
              identificacaoProprietario: '',
              
              // Observações detalhadas
              observacoesCompletas: '',
              mensagemSenatran: '',
              motivoNaoAbordagem: '',
              
              // Registro fotográfico
              temRegistroFotografico: false,
              descricaoFoto: '',
              placaFoto: '',
              caracteristicasVeiculo: '',
              dataHoraFoto: '',
              
              // Notificação de autuação
              codigoAcesso: '',
              linkNotificacao: '',
              protocoloNotificacao: ''
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
    if (!this.genAI) {
      throw new Error('Serviço Gemini não está configurado. Configure VITE_GEMINI_API_KEY nas variáveis de ambiente.');
    }
    
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // console.log(`Tentativa ${attempt}/${maxRetries} de processamento OCR do documento de veículo...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.5-pro',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
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
      
        // console.log('Resposta bruta do Gemini (veículo):', jsonStr);
      
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
        
        // console.log('JSON limpo para parse (veículo):', jsonStr);

        const dadosExtraidos = JSON.parse(jsonStr);
        
        // Debug: Log dos dados extraídos
        // console.log('Dados extraídos do Gemini (veículo):', dadosExtraidos);
        // console.log('Campo combustível extraído:', dadosExtraidos.combustivel);
        
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
        // console.log('Resultado final processado:', resultado);
        // console.log('Campo combustível no resultado:', resultado.combustivel);
        
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
          // console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
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
    if (!this.genAI) {
      throw new Error('Serviço Gemini não está configurado. Configure VITE_GEMINI_API_KEY nas variáveis de ambiente.');
    }
    
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // console.log(`Tentativa ${attempt}/${maxRetries} de processamento OCR do documento pessoal...`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.5-pro',
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 8192,
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
      
        // console.log('Resposta bruta do Gemini (documento pessoal):', jsonStr);
      
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
        
        // console.log('JSON limpo para parse (documento pessoal):', jsonStr);

        const dadosExtraidos = JSON.parse(jsonStr);
        
        // Debug: Log dos dados extraídos
        // console.log('Dados extraídos do Gemini (documento pessoal):', dadosExtraidos);
        
        // Debug específico para data de nascimento
        // console.log('Data de nascimento extraída:', dadosExtraidos.dataNascimento);
        if (!dadosExtraidos.dataNascimento) {
          log.warn('⚠️ ATENÇÃO: Data de nascimento não foi extraída do documento!');
          // console.log('Campos disponíveis na resposta:', Object.keys(dadosExtraidos));
        } else {
          log.info('✅ Data de nascimento extraída com sucesso:', dadosExtraidos.dataNascimento);
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
        // console.log('Resultado final processado (documento pessoal):', resultado);
        
        // Debug específico para confirmar data de nascimento no resultado final
        if (resultado.dataNascimento) {
          log.info('✅ Data de nascimento incluída no resultado final:', resultado.dataNascimento);
        } else {
          log.warn('❌ Data de nascimento NÃO incluída no resultado final!');
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
          // console.log(`Erro temporário detectado. Aguardando ${retryDelay}ms antes da próxima tentativa...`);
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
