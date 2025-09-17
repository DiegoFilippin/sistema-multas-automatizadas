import { toast } from 'sonner';

// Interface para dados extraídos automaticamente de documentos
export interface ExtractedFormData {
  // Dados do Auto de Infração
  numero_auto?: string;
  data_infracao?: string;
  horario_infracao?: string;
  local_infracao?: string;
  codigo_infracao?: string;
  descricao_infracao?: string;
  valor_multa?: number;
  
  // Dados do Veículo
  placa_veiculo?: string;
  modelo_veiculo?: string;
  cor_veiculo?: string;
  categoria_veiculo?: string;
  
  // Dados do Condutor
  nome_condutor?: string;
  cpf_condutor?: string;
  cnh_condutor?: string;
  categoria_cnh?: string;
  
  // Dados do Proprietário (se diferente do condutor)
  nome_proprietario?: string;
  cpf_cnpj_proprietario?: string;
  endereco_proprietario?: string;
  
  // Dados do Órgão Autuador
  orgao_autuador?: string;
  agente_autuador?: string;
  
  // Dados Adicionais
  velocidade_permitida?: number;
  velocidade_aferida?: number;
  equipamento_medicao?: string;
  observacoes?: string;
  
  // Metadados da extração
  confidence_score?: number; // Nível de confiança da extração (0-1)
  extracted_fields?: string[]; // Lista de campos que foram extraídos com sucesso
}

export interface FileProcessingResult {
  content: string;
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    pageCount?: number;
    wordCount: number;
    extractedAt: string;
  };
  extractedFormData?: ExtractedFormData; // Dados estruturados extraídos para pré-preenchimento
}

export interface ProcessingOptions {
  maxFileSize?: number; // em MB
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  maxFileSize: 50, // 50MB
  allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
};

export class FileProcessingService {
  private static instance: FileProcessingService;

  private constructor() {}

  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  /**
   * Valida se o arquivo pode ser processado
   */
  validateFile(file: File, options: ProcessingOptions = DEFAULT_OPTIONS): boolean {
    // Verifica tamanho do arquivo
    const maxSizeBytes = (options.maxFileSize || 50) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${options.maxFileSize}MB`);
      return false;
    }

    // Verifica tipo do arquivo
    const allowedTypes = options.allowedTypes || DEFAULT_OPTIONS.allowedTypes!;
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT.');
      return false;
    }

    return true;
  }

  /**
   * Processa arquivo e extrai texto
   */
  async processFile(file: File, options: ProcessingOptions = DEFAULT_OPTIONS): Promise<FileProcessingResult> {
    if (!this.validateFile(file, options)) {
      throw new Error('Arquivo inválido');
    }

    try {
      let content: string;
      let pageCount: number | undefined;

      switch (file.type) {
        case 'text/plain':
          content = await this.extractTextFromTxt(file);
          break;
        case 'application/pdf':
          const pdfResult = await this.extractTextFromPdf(file);
          content = pdfResult.text;
          pageCount = pdfResult.pageCount;
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.extractTextFromDoc(file);
          break;
        default:
          throw new Error('Tipo de arquivo não suportado');
      }

      // Limpa e normaliza o texto
      content = this.cleanText(content);

      if (!content.trim()) {
        throw new Error('Não foi possível extrair texto do arquivo');
      }

      const wordCount = this.countWords(content);

      // Extrai dados estruturados para pré-preenchimento de formulários
      console.log('Extraindo dados estruturados do documento...');
      const extractedFormData = await this.extractFormData(content, file.name);
      
      if (extractedFormData.confidence_score && extractedFormData.confidence_score > 0) {
        console.log(`Dados estruturados extraídos com ${(extractedFormData.confidence_score * 100).toFixed(1)}% de confiança`);
      }

      return {
        content,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          pageCount,
          wordCount,
          extractedAt: new Date().toISOString()
        },
        extractedFormData // Adiciona os dados extraídos
      };
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw new Error('Falha ao processar arquivo. Verifique se o arquivo não está corrompido.');
    }
  }

  /**
   * Extrai texto de arquivo TXT
   */
  private async extractTextFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo TXT'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Extrai texto de arquivo PDF usando Gemini OCR
   * Solução definitiva que não depende de PDF.js ou Web Workers
   * Baseado na mesma estratégia bem-sucedida do geminiOcrService.ts
   */
  private async extractTextFromPdf(file: File): Promise<{ text: string; pageCount: number }> {
    try {
      console.log('Processando PDF com Gemini OCR...');
      
      // Converte arquivo para base64 usando FileReader nativo (mesma abordagem do geminiOcrService.ts)
      const base64Data = await this.fileToBase64(file);
      
      // Importa e configura Gemini
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY não está configurada no arquivo .env');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192, // Aumentado para documentos longos
        },
      });
      
      // Prepara o arquivo para o Gemini
      const imagePart = {
        inlineData: { 
          data: base64Data, 
          mimeType: file.type 
        },
      };
      
      const prompt = `Analise este documento PDF e extraia TODO o texto visível.

IMPORTANTE:
- Extraia TODO o texto do documento, preservando a estrutura
- Mantenha quebras de linha e parágrafos
- Inclua títulos, subtítulos e todo conteúdo textual
- Se houver tabelas, preserve a estrutura em formato texto
- Não adicione comentários ou explicações
- Retorne apenas o texto extraído

Texto extraído:`;
      
      // Processa com retry logic (como no geminiOcrService.ts)
      const maxRetries = 3;
      const retryDelay = 2000;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Tentativa ${attempt}/${maxRetries} de extração de texto...`);
          
          const geminiResult = await model.generateContent([
            imagePart,
            { text: prompt }
          ]);
          
          const response = await geminiResult.response;
          let extractedText = response.text().trim();
          
          if (!extractedText) {
            throw new Error('Nenhum texto foi extraído do PDF');
          }
          
          // Limpa o texto extraído
          extractedText = extractedText
            .replace(/^Texto extraído:\s*/i, '') // Remove prefixo se presente
            .trim();
          
          console.log('Texto extraído com sucesso via Gemini OCR');
          
          // Estima número de páginas baseado no tamanho do arquivo
          // (aproximação, já que não temos acesso direto às páginas)
          const estimatedPageCount = Math.max(1, Math.ceil(file.size / (1024 * 100))); // ~100KB por página
          
          return { 
            text: extractedText, 
            pageCount: estimatedPageCount 
          };
          
        } catch (error: any) {
          console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, error);
          
          // Verifica se é erro temporário (503, quota, etc.)
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
          
          if (attempt === maxRetries) {
            if (isRetryableError) {
              throw new Error(
                'O serviço de OCR está temporariamente sobrecarregado. ' +
                'Tente novamente em alguns minutos.'
              );
            }
            throw error;
          }
        }
      }
      
      throw new Error('Falha ao processar PDF após todas as tentativas');
      
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('VITE_GEMINI_API_KEY')) {
          throw new Error('Configuração da API do Gemini não encontrada. Verifique as variáveis de ambiente.');
        }
        if (error.message.includes('sobrecarregado')) {
          throw error; // Repassa erro de sobrecarga
        }
      }
      
      throw new Error('Erro ao extrair texto do PDF. Verifique se o arquivo não está corrompido.');
    }
  }

  /**
   * Converte arquivo para base64 usando FileReader nativo
   * Mesma abordagem usada no geminiOcrService.ts que funciona perfeitamente
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const readerResult = e.target?.result as string;
        // Remove o prefixo "data:application/pdf;base64," para obter apenas o base64
        const base64Data = readerResult.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Detecta se o arquivo está protegido por senha
   */
  private async detectPasswordProtection(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Para arquivos DOCX, verifica se contém EncryptionInfo
      if (uint8Array.length >= 4 && uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
        if (text.includes('EncryptionInfo') || text.includes('EncryptedPackage')) {
          return true;
        }
      }
      
      // Para arquivos DOC, verifica estrutura OLE com criptografia
      if (uint8Array.length >= 8 && uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF) {
        // Procura por indicadores de criptografia em arquivos DOC
        const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, 2048));
        if (text.includes('Microsoft Office') && text.includes('Encrypted')) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Erro ao detectar proteção por senha:', error);
      return false;
    }
  }

  /**
   * Valida se o arquivo é um documento Word válido verificando assinatura
   */
  private async validateWordDocument(file: File): Promise<{ isValid: boolean; isPasswordProtected: boolean; fileType: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verifica se arquivo está corrompido (muito pequeno)
      if (uint8Array.length < 512) {
        return { isValid: false, isPasswordProtected: false, fileType: 'unknown' };
      }
      
      // Verifica assinatura de arquivo DOCX (ZIP-based)
      if (uint8Array.length >= 4) {
        if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
          const isPasswordProtected = await this.detectPasswordProtection(file);
          return { isValid: true, isPasswordProtected, fileType: 'docx' };
        }
      }
      
      // Verifica assinatura de arquivo DOC (OLE-based)
      if (uint8Array.length >= 8) {
        if (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF && 
            uint8Array[2] === 0x11 && uint8Array[3] === 0xE0) {
          const isPasswordProtected = await this.detectPasswordProtection(file);
          return { isValid: true, isPasswordProtected, fileType: 'doc' };
        }
      }
      
      // Verifica se pode ser um arquivo RTF
      if (uint8Array.length >= 5) {
        const rtfSignature = new TextDecoder().decode(uint8Array.slice(0, 5));
        if (rtfSignature === '{\\rtf') {
          return { isValid: true, isPasswordProtected: false, fileType: 'rtf' };
        }
      }
      
      return { isValid: false, isPasswordProtected: false, fileType: 'unknown' };
    } catch (error) {
      console.error('Erro ao validar arquivo Word:', error);
      return { isValid: false, isPasswordProtected: false, fileType: 'error' };
    }
  }

  /**
   * Fallback OCR específico para documentos Word quando mammoth falha
   */
  private async extractAsPlainText(file: File): Promise<string> {
    try {
      console.log('Mammoth falhou, tentando OCR específico para documentos Word...');
      
      // Converte arquivo para base64
      const base64Data = await this.fileToBase64(file);
      
      // Importa e configura Gemini
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY não está configurada no arquivo .env');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      });
      
      // Para documentos Word, usa mimeType genérico de imagem
      // O Gemini pode processar documentos como imagem para OCR
      const imagePart = {
        inlineData: { 
          data: base64Data, 
          mimeType: 'image/png' // Usa mimeType genérico suportado pelo Gemini
        },
      };
      
      const prompt = `Analise este documento Word e extraia TODO o texto visível.

IMPORTANTE:
- Extraia TODO o texto do documento, preservando a estrutura
- Mantenha quebras de linha e parágrafos
- Inclua títulos, subtítulos e todo conteúdo textual
- Se houver tabelas, preserve a estrutura em formato texto
- Não adicione comentários ou explicações
- Retorne apenas o texto extraído

Texto extraído:`;
      
      console.log('Processando documento Word via OCR...');
      
      const geminiResult = await model.generateContent([
        imagePart,
        { text: prompt }
      ]);
      
      const response = await geminiResult.response;
      let extractedText = response.text().trim();
      
      if (!extractedText) {
        throw new Error('Nenhum texto foi extraído do documento');
      }
      
      // Limpa o texto extraído
      extractedText = extractedText
        .replace(/^Texto extraído:\s*/i, '') // Remove prefixo se presente
        .trim();
      
      if (extractedText.length < 10) {
        throw new Error('OCR não conseguiu extrair texto suficiente do documento');
      }
      
      console.log(`Texto extraído via OCR: ${extractedText.length} caracteres`);
      return extractedText;
      
    } catch (error) {
      console.error('Erro ao extrair texto via OCR:', error);
      throw new Error('Não foi possível extrair texto do documento Word. Verifique se o arquivo não está corrompido.');
    }
  }

  /**
   * Extrai texto de arquivo DOC/DOCX usando mammoth.js com validação robusta
   */
  private async extractTextFromDoc(file: File): Promise<string> {
    console.log(`Iniciando processamento de documento Word: ${file.name} (${file.size} bytes)`);
    
    // Validação básica do arquivo
    if (!file || file.size === 0) {
      throw new Error('Arquivo vazio ou inválido');
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('Arquivo muito grande (máximo 50MB)');
    }
    
    // Valida se é realmente um documento Word
    const validation = await this.validateWordDocument(file);
    
    if (validation.isPasswordProtected) {
      throw new Error('Arquivo protegido por senha. Remova a proteção e tente novamente.');
    }
    
    // Tenta mammoth primeiro, mesmo se a validação não for 100% positiva
    // Isso permite processar arquivos que podem ter assinaturas ligeiramente diferentes
    if (validation.isValid) {
      console.log(`Arquivo validado como ${validation.fileType.toUpperCase()}, processando com mammoth...`);
    } else {
      console.log(`Validação incerta (tipo: ${validation.fileType}), tentando mammoth mesmo assim...`);
    }
     
     try {
      
      // Importa mammoth.js dinamicamente
      const mammoth = await import('mammoth');
      
      const arrayBuffer = await file.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer });
      
      // Verifica se houve mensagens de erro críticas
      const criticalErrors = mammothResult.messages.filter(msg => 
        msg.type === 'error' || 
        msg.message.toLowerCase().includes('could not find') ||
        msg.message.toLowerCase().includes('corrupt')
      );
      
      if (criticalErrors.length > 0) {
        console.error('Erros críticos detectados no mammoth:', criticalErrors.map(e => e.message));
        console.log('Tentando fallback OCR...');
        return await this.extractAsPlainText(file);
      }
      
      if (mammothResult.messages.length > 0) {
        console.warn('Avisos ao processar documento:', mammothResult.messages);
      }
      
      const extractedText = mammothResult.value?.trim();
      
      if (!extractedText || extractedText.length < 10) {
        console.warn(`Texto extraído muito curto (${extractedText?.length || 0} chars), tentando fallback OCR...`);
        return await this.extractAsPlainText(file);
      }
      
      console.log(`Texto extraído com sucesso: ${extractedText.length} caracteres`);
      return extractedText;
      
    } catch (error: any) {
      console.error('Erro ao processar DOC/DOCX com mammoth:', error);
      
      // Verifica se é erro específico do mammoth
      if (error?.message?.includes('Could not find the body element') ||
          error?.message?.includes('are you sure this is a docx file') ||
          error?.message?.includes('corrupt') ||
          error?.message?.includes('invalid')) {
        console.log(`Erro específico do mammoth: ${error.message}. Tentando fallback OCR específico para Word...`);
        return await this.extractAsPlainText(file);
      }
      
      // Para outros erros, tenta fallback também
      try {
        console.log(`Erro inesperado no mammoth: ${error.message}. Tentando fallback OCR específico para Word...`);
        return await this.extractAsPlainText(file);
      } catch (fallbackError) {
        console.error('Fallback OCR também falhou:', fallbackError);
        throw new Error(
          `Erro ao extrair texto do documento Word. ` +
          `Erro mammoth: ${error.message}. ` +
          `Erro OCR: ${fallbackError instanceof Error ? fallbackError.message : 'Desconhecido'}. ` +
          `Verifique se o arquivo não está corrompido ou protegido por senha.`
        );
      }
    }
  }

  /**
   * Limpa e normaliza o texto extraído
   */
  private cleanText(text: string): string {
    return text
      // Remove quebras de linha excessivas
      .replace(/\n{3,}/g, '\n\n')
      // Remove espaços excessivos
      .replace(/[ \t]{2,}/g, ' ')
      // Remove caracteres de controle
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim geral
      .trim();
  }

  /**
   * Conta palavras no texto
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Gera preview do texto (primeiras linhas)
   */
  generatePreview(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Detecta automaticamente o tipo de documento baseado no conteúdo
   */
  detectDocumentType(content: string, fileName: string): 'lei' | 'jurisprudencia' | 'recurso_modelo' | 'doutrina' | 'outro' {
    const lowerContent = content.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Detecta leis
    if (lowerContent.includes('art.') || lowerContent.includes('artigo') || 
        lowerContent.includes('lei n') || lowerContent.includes('decreto') ||
        lowerFileName.includes('lei') || lowerFileName.includes('ctb')) {
      return 'lei';
    }

    // Detecta jurisprudência
    if (lowerContent.includes('acórdão') || lowerContent.includes('recurso especial') ||
        lowerContent.includes('apelação') || lowerContent.includes('tribunal') ||
        lowerContent.includes('stj') || lowerContent.includes('stf') ||
        lowerFileName.includes('jurisprudencia') || lowerFileName.includes('acordao')) {
      return 'jurisprudencia';
    }

    // Detecta recursos modelo
    if (lowerContent.includes('excelentíssimo') || lowerContent.includes('recurso de primeira instância') ||
        lowerContent.includes('auto de infração') || lowerContent.includes('defesa prévia') ||
        lowerFileName.includes('recurso') || lowerFileName.includes('modelo')) {
      return 'recurso_modelo';
    }

    // Detecta doutrina
    if (lowerContent.includes('doutrina') || lowerContent.includes('comentários') ||
        lowerContent.includes('manual') || lowerContent.includes('tratado') ||
        lowerFileName.includes('doutrina') || lowerFileName.includes('manual')) {
      return 'doutrina';
    }

    return 'outro';
  }

  /**
   * Extrai dados estruturados de documentos para pré-preenchimento de formulários
   * Usa o Gemini para analisar o conteúdo e extrair informações relevantes
   */
  async extractFormData(content: string, fileName: string): Promise<ExtractedFormData> {
    try {
      console.log('Iniciando extração de dados estruturados...');
      
      // Importa e configura Gemini
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('VITE_GEMINI_API_KEY não configurada - extração de dados desabilitada');
        return {};
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.1, // Baixa temperatura para maior precisão
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 4096,
        },
      });
      
      const prompt = `Analise este documento e extraia TODAS as informações estruturadas possíveis.

Documento: ${fileName}
Conteúdo:
${content}

EXTRAIA OS SEGUINTES DADOS (se presentes no documento):

**DADOS DO AUTO DE INFRAÇÃO:**
- Número do auto de infração
- Data da infração (formato YYYY-MM-DD)
- Horário da infração
- Local da infração
- Código da infração
- Descrição da infração
- Valor da multa (apenas números)

**DADOS DO VEÍCULO:**
- Placa do veículo
- Modelo do veículo
- Cor do veículo
- Categoria do veículo

**DADOS DO CONDUTOR:**
- Nome do condutor
- CPF do condutor
- CNH do condutor
- Categoria da CNH

**DADOS DO PROPRIETÁRIO:**
- Nome do proprietário
- CPF/CNPJ do proprietário
- Endereço do proprietário

**DADOS DO ÓRGÃO AUTUADOR:**
- Órgão autuador
- Nome do agente autuador

**DADOS ADICIONAIS:**
- Velocidade permitida (apenas números)
- Velocidade aferida (apenas números)
- Equipamento de medição
- Observações relevantes

RETORNE APENAS UM JSON VÁLIDO com os dados encontrados. Use null para campos não encontrados.
Formato esperado:
{
  "numero_auto": "string ou null",
  "data_infracao": "YYYY-MM-DD ou null",
  "horario_infracao": "string ou null",
  "local_infracao": "string ou null",
  "codigo_infracao": "string ou null",
  "descricao_infracao": "string ou null",
  "valor_multa": number ou null,
  "placa_veiculo": "string ou null",
  "modelo_veiculo": "string ou null",
  "cor_veiculo": "string ou null",
  "categoria_veiculo": "string ou null",
  "nome_condutor": "string ou null",
  "cpf_condutor": "string ou null",
  "cnh_condutor": "string ou null",
  "categoria_cnh": "string ou null",
  "nome_proprietario": "string ou null",
  "cpf_cnpj_proprietario": "string ou null",
  "endereco_proprietario": "string ou null",
  "orgao_autuador": "string ou null",
  "agente_autuador": "string ou null",
  "velocidade_permitida": number ou null,
  "velocidade_aferida": number ou null,
  "equipamento_medicao": "string ou null",
  "observacoes": "string ou null"
}`;
      
      // Processa com retry logic
      const maxRetries = 3;
      const retryDelay = 2000;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Tentativa ${attempt}/${maxRetries} de extração de dados...`);
          
          const geminiResult = await model.generateContent([{ text: prompt }]);
          const response = await geminiResult.response;
          let extractedText = response.text().trim();
          
          if (!extractedText) {
            throw new Error('Nenhum dado foi extraído do documento');
          }
          
          // Limpa a resposta para extrair apenas o JSON
          extractedText = extractedText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          
          // Tenta fazer parse do JSON
          let extractedData: any;
          try {
            extractedData = JSON.parse(extractedText);
          } catch (parseError) {
            console.warn('Erro ao fazer parse do JSON, tentando extrair JSON válido...', parseError);
            
            // Tenta encontrar JSON válido na resposta
            const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Não foi possível extrair JSON válido da resposta');
            }
          }
          
          // Calcula score de confiança baseado nos campos extraídos
          const extractedFields: string[] = [];
          let totalFields = 0;
          let filledFields = 0;
          
          Object.entries(extractedData).forEach(([key, value]) => {
            totalFields++;
            if (value !== null && value !== undefined && value !== '') {
              filledFields++;
              extractedFields.push(key);
            }
          });
          
          const confidenceScore = totalFields > 0 ? filledFields / totalFields : 0;
          
          // Adiciona metadados
          const extractionResult: ExtractedFormData = {
            ...extractedData,
            confidence_score: confidenceScore,
            extracted_fields: extractedFields
          };
          
          console.log(`Dados extraídos com sucesso. Confiança: ${(confidenceScore * 100).toFixed(1)}%`);
          console.log(`Campos extraídos: ${extractedFields.join(', ')}`);
          
          return extractionResult;
          
        } catch (error: any) {
          console.error(`Erro na tentativa ${attempt}/${maxRetries}:`, error);
          
          // Verifica se é erro temporário
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
          
          if (attempt === maxRetries) {
            if (isRetryableError) {
              console.warn('Serviço de extração temporariamente indisponível');
              return { confidence_score: 0, extracted_fields: [] };
            }
            throw error;
          }
        }
      }
      
      return { confidence_score: 0, extracted_fields: [] };
      
    } catch (error) {
      console.error('Erro ao extrair dados estruturados:', error);
      
      // Retorna objeto vazio em caso de erro, não falha o upload
      return { confidence_score: 0, extracted_fields: [] };
    }
  }

  /**
   * Extrai tags automáticas do conteúdo
   */
  extractAutoTags(content: string): string[] {
    const tags: Set<string> = new Set();
    const lowerContent = content.toLowerCase();

    // Tags relacionadas a infrações
    const infractionTerms = [
      'excesso de velocidade', 'embriaguez', 'celular', 'cinto de segurança',
      'estacionamento', 'sinalização', 'ultrapassagem', 'conversão',
      'habilitação', 'documentação', 'licenciamento'
    ];

    infractionTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        tags.add(term.replace(/\s+/g, '-'));
      }
    });

    // Tags relacionadas a órgãos
    const organTerms = ['detran', 'dnit', 'polícia', 'prefeitura', 'município'];
    organTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        tags.add(term);
      }
    });

    // Tags relacionadas a procedimentos
    const procedureTerms = ['recurso', 'defesa', 'multa', 'penalidade', 'suspensão'];
    procedureTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        tags.add(term);
      }
    });

    return Array.from(tags).slice(0, 10); // Limita a 10 tags
  }
}

export default FileProcessingService;