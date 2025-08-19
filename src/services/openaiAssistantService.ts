import OpenAI from 'openai';
import type { DocumentoProcessado } from './geminiOcrService';
import { KnowledgeService } from './knowledgeService';
import type { DadosInfracao, ContextoJuridico } from './recursoService';

interface RecursoGerado {
  titulo: string;
  argumentacao: string;
  fundamentacao_legal: string;
  pedido: string;
  tipo: 'defesa_previa' | 'recurso_primeira_instancia' | 'recurso_segunda_instancia';
}

class OpenAIAssistantService {
  private openai: OpenAI;
  private assistantId: string;
  private knowledgeService: KnowledgeService;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID;
    
    if (!apiKey) {
      throw new Error('VITE_OPENAI_API_KEY não configurada');
    }
    
    if (!assistantId) {
      throw new Error('VITE_OPENAI_ASSISTANT_ID não configurada');
    }

    // Validar formato do assistant_id
    if (!assistantId.startsWith('asst_') || assistantId.length < 10) {
      throw new Error('VITE_OPENAI_ASSISTANT_ID tem formato inválido. Deve começar com "asst_"');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Necessário para uso no frontend
    });
    
    this.assistantId = assistantId;
    this.knowledgeService = KnowledgeService.getInstance();
    console.log('OpenAI Assistant Service inicializado com assistant_id:', assistantId);
  }

  static isConfigured(): boolean {
    return !!import.meta.env.VITE_OPENAI_API_KEY && !!import.meta.env.VITE_OPENAI_ASSISTANT_ID;
  }

  /**
   * Busca contexto jurídico relevante para a infração
   */
  private async buscarContextoJuridico(dadosInfracao: DadosInfracao): Promise<ContextoJuridico> {
    try {
      // Constrói query de busca baseada nos dados da infração
      const queryBusca = this.construirQueryBusca(dadosInfracao);
      
      // Busca documentos relevantes usando busca semântica
      const documentosRelevantes = await this.knowledgeService.findRelevantDocuments(
        queryBusca,
        'defesa_previa',
        10
      );
      
      // Busca jurisprudências específicas
      const jurisprudencias = await this.knowledgeService.semanticSearch(
        `${dadosInfracao.descricaoInfracao} jurisprudência tribunal`,
        { types: ['jurisprudencia'] },
        5,
        0.6
      );
      
      // Busca leis aplicáveis
      const leisAplicaveis = await this.knowledgeService.semanticSearch(
        `${dadosInfracao.codigoInfracao} código trânsito brasileiro CTB`,
        { types: ['lei'] },
        5,
        0.7
      );
      
      // Busca precedentes similares
      const precedentes = await this.knowledgeService.semanticSearch(
        `${dadosInfracao.descricaoInfracao} precedente recurso`,
        { types: ['recurso_modelo'] },
        3,
        0.6
      );
      
      return {
        documentos_relevantes: documentosRelevantes,
        fundamentacao_principal: this.extrairFundamentacaoPrincipal(documentosRelevantes),
        jurisprudencias: jurisprudencias.map(j => j.document),
        leis_aplicaveis: leisAplicaveis.map(l => l.document),
        precedentes: precedentes.map(p => p.document)
      };
    } catch (error) {
      console.error('Erro ao buscar contexto jurídico:', error);
      return {
        documentos_relevantes: [],
        fundamentacao_principal: 'Fundamentação baseada no Código de Trânsito Brasileiro',
        jurisprudencias: [],
        leis_aplicaveis: [],
        precedentes: []
      };
    }
  }

  /**
   * Constrói query de busca baseada nos dados da infração
   */
  private construirQueryBusca(dadosInfracao: DadosInfracao): string {
    const elementos = [
      dadosInfracao.descricaoInfracao,
      dadosInfracao.codigoInfracao,
      dadosInfracao.orgaoAutuador,
      'recurso de multa',
      'defesa prévia',
      'código de trânsito'
    ];

    // Adiciona contexto específico baseado no tipo de infração
    if (dadosInfracao.descricaoInfracao.toLowerCase().includes('velocidade')) {
      elementos.push('excesso de velocidade', 'radar', 'velocimetro');
    } else if (dadosInfracao.descricaoInfracao.toLowerCase().includes('estacionamento')) {
      elementos.push('estacionamento irregular', 'zona azul');
    } else if (dadosInfracao.descricaoInfracao.toLowerCase().includes('sinalização')) {
      elementos.push('desobediência sinalização', 'semáforo', 'placa');
    }

    return elementos.filter(Boolean).join(' ');
  }

  /**
   * Extrai fundamentação principal dos documentos relevantes
   */
  private extrairFundamentacaoPrincipal(documentos: Array<{ document?: { content?: string } }>): string {
    if (documentos.length === 0) {
      return 'Fundamentação baseada no Código de Trânsito Brasileiro';
    }

    // Pega o documento mais relevante
    const documentoPrincipal = documentos[0];
    
    if (documentoPrincipal.document && documentoPrincipal.document.content) {
      // Extrai os primeiros 200 caracteres como fundamentação principal
      return documentoPrincipal.document.content.substring(0, 200) + '...';
    }

    return 'Fundamentação baseada no Código de Trânsito Brasileiro';
  }

  private construirContextoJuridicoTexto(contexto: ContextoJuridico): string {
    let texto = 'CONTEXTO JURÍDICO RELEVANTE:\n\n';
    
    if (contexto.documentos_relevantes.length > 0) {
      texto += 'DOCUMENTOS RELEVANTES:\n';
      contexto.documentos_relevantes.forEach((doc, index) => {
        texto += `${index + 1}. ${doc.document?.title || 'Documento'}\n`;
        texto += `   Tipo: ${doc.document?.type || 'N/A'}\n`;
        if (doc.document?.tags && doc.document.tags.length > 0) {
          texto += `   Tags: ${doc.document.tags.join(', ')}\n`;
        }
        texto += `   Conteúdo: ${(doc.document?.content || '').substring(0, 300)}...\n\n`;
      });
    }
    
    if (contexto.jurisprudencias.length > 0) {
      texto += 'JURISPRUDÊNCIAS APLICÁVEIS:\n';
      contexto.jurisprudencias.forEach((juris, index) => {
        texto += `${index + 1}. ${juris.title || 'Jurisprudência'}\n`;
        texto += `   Conteúdo: ${(juris.content || '').substring(0, 300)}...\n\n`;
      });
    }
    
    if (contexto.leis_aplicaveis.length > 0) {
      texto += 'LEIS APLICÁVEIS:\n';
      contexto.leis_aplicaveis.forEach((lei, index) => {
        texto += `${index + 1}. ${lei.title || 'Lei'}\n`;
        texto += `   Conteúdo: ${(lei.content || '').substring(0, 300)}...\n\n`;
      });
    }
    
    if (contexto.precedentes.length > 0) {
      texto += 'PRECEDENTES RELEVANTES:\n';
      contexto.precedentes.forEach((prec, index) => {
        texto += `${index + 1}. ${prec.title || 'Precedente'}\n`;
        texto += `   Conteúdo: ${(prec.content || '').substring(0, 300)}...\n\n`;
      });
    }
    
    if (contexto.fundamentacao_principal) {
      texto += 'FUNDAMENTAÇÃO PRINCIPAL:\n';
      texto += `${contexto.fundamentacao_principal}\n\n`;
    }
    
    texto += 'INSTRUÇÕES: Use essas informações jurídicas para fundamentar adequadamente o documento, citando artigos específicos, jurisprudências e precedentes quando aplicável.\n\n';
    
    return texto;
  }

  async gerarRecurso(dadosMulta: DocumentoProcessado, nomeCliente: string, tipoDocumento: 'defesa_previa' | 'conversao_advertencia' = 'defesa_previa'): Promise<RecursoGerado> {
    try {
      console.log('Iniciando geração de recurso com OpenAI Assistant');
      console.log('Assistant ID:', this.assistantId);
      console.log('Dados da multa:', dadosMulta);
      console.log('Nome do cliente:', nomeCliente);
      
      // Validar dados de entrada
      if (!dadosMulta || !nomeCliente) {
        throw new Error('Dados da multa ou nome do cliente não fornecidos');
      }
      
      // Buscar contexto jurídico relevante
      console.log('Buscando contexto jurídico relevante...');
      const dadosInfracao: DadosInfracao = {
        numeroAuto: dadosMulta.numeroAuto,
        descricaoInfracao: dadosMulta.descricaoInfracao,
        codigoInfracao: dadosMulta.codigoInfracao,
        orgaoAutuador: dadosMulta.orgaoAutuador,
        valorMulta: dadosMulta.valorMulta,
        dataInfracao: dadosMulta.dataInfracao,
        horaInfracao: dadosMulta.horaInfracao,
        localInfracao: dadosMulta.localInfracao,
        placaVeiculo: dadosMulta.placaVeiculo
      };
      
      const contextoJuridico = await this.buscarContextoJuridico(dadosInfracao);
      console.log('Contexto jurídico encontrado:', contextoJuridico);
      
      // Criar uma thread para a conversa
      console.log('Criando thread...');
      const thread = await this.openai.beta.threads.create();
      console.log('Thread criada:', thread.id);

      // Preparar a mensagem com os dados da multa, requerente e contexto jurídico
      const isConversaoAdvertencia = tipoDocumento === 'conversao_advertencia';
      
      // Construir seção de contexto jurídico
      const contextoJuridicoTexto = this.construirContextoJuridicoTexto(contextoJuridico);
      
      const mensagem = `
Você é um especialista em direito de trânsito e deve gerar um DOCUMENTO COMPLETO, pronto para protocolo no órgão de trânsito.

${isConversaoAdvertencia ? 'TIPO DE DOCUMENTO: PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO' : 'TIPO DE DOCUMENTO: DEFESA PRÉVIA'}

DADOS DA MULTA:
- Auto de Infração: ${dadosMulta.numeroAuto}
- Data da Infração: ${dadosMulta.dataInfracao}
- Hora: ${dadosMulta.horaInfracao}
- Local: ${dadosMulta.localInfracao}
- Placa do Veículo: ${dadosMulta.placaVeiculo}
- Tipo de Infração: ${dadosMulta.descricaoInfracao}
- Código da Infração: ${dadosMulta.codigoInfracao}
- Valor da Multa: R$ ${dadosMulta.valorMulta}
- Órgão Autuador: ${dadosMulta.orgaoAutuador}
- Agente: ${dadosMulta.agente}

DADOS DO REQUERENTE:
- Nome: ${nomeCliente}

${contextoJuridicoTexto}

${isConversaoAdvertencia ? `INSTRUÇÕES ESPECÍFICAS PARA CONVERSÃO EM ADVERTÊNCIA:
1. Gere um PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO
2. Fundamente no Art. 267 do Código de Trânsito Brasileiro (CTB)
3. Destaque que se trata de infração LEVE
4. Mencione que o condutor NÃO possui registro de multas nos últimos 12 meses
5. Solicite a aplicação da penalidade de advertência por escrito em substituição à multa
6. Use linguagem formal e respeitosa
7. Inclua todos os dados da infração e do requerente
8. Estruture como requerimento administrativo formal
9. O documento deve estar pronto para protocolo` : `INSTRUÇÕES ESPECÍFICAS PARA DEFESA PRÉVIA:
1. Gere um documento COMPLETO e FORMAL, pronto para protocolo
2. Inclua cabeçalho dirigido ao órgão autuador
3. Identifique completamente o requerente e o veículo
4. Analise tecnicamente a infração e identifique vícios específicos
5. Use fundamentação legal detalhada com artigos específicos do CTB
6. Estruture o pedido de forma clara e objetiva
7. Inclua local, data e campo para assinatura
8. Use linguagem jurídica formal mas acessível
9. O documento deve estar pronto para download e envio`}

${isConversaoAdvertencia ? `ESTRUTURA OBRIGATÓRIA DO PEDIDO DE CONVERSÃO:
- Cabeçalho com destinatário (órgão autuador)
- Título (PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO)
- Identificação do requerente
- Identificação do veículo
- Dados da autuação
- Fundamentação legal (Art. 267 CTB)
- Declaração de ausência de multas nos últimos 12 meses
- Pedido de conversão
- Local, data e assinatura` : `ESTRUTURA OBRIGATÓRIA DO DOCUMENTO:
- Cabeçalho com destinatário
- Título (DEFESA PRÉVIA)
- Identificação do requerente
- Identificação do veículo
- Dados da autuação
- Argumentação técnica
- Fundamentação legal
- Pedido estruturado
- Local, data e assinatura`}

Retorne a resposta em formato JSON com os campos: titulo, argumentacao, fundamentacao_legal, pedido e tipo.
O campo 'argumentacao' deve conter o documento COMPLETO formatado com quebras de linha (\n).`;

      // Adicionar mensagem à thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: mensagem
      });

      // Executar o assistente
      console.log('Executando assistente...');
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });
      console.log('Run criado:', run.id, 'Status:', run.status);

      // Aguardar a conclusão da execução
        let runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
          thread_id: thread.id
        });
        console.log('Status inicial do run:', runStatus.status);
      
      let attempts = 0;
      const maxAttempts = 60; // Máximo 60 segundos
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
          runStatus = await this.openai.beta.threads.runs.retrieve(run.id, {
            thread_id: thread.id
          });
          attempts++;
          console.log(`Tentativa ${attempts}: Status do run:`, runStatus.status);
          
          // Verificar se o run precisa de ação (ex: function calls)
          if (runStatus.status === 'requires_action') {
            console.log('Run requer ação:', runStatus.required_action);
            break;
          }
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Timeout: Assistente demorou muito para responder');
      }

      if (runStatus.status === 'completed') {
        console.log('Assistente completou a execução com sucesso');
        
        // Obter as mensagens da thread
        console.log('Obtendo mensagens da thread...');
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        console.log('Número de mensagens:', messages.data.length);
        
        const lastMessage = messages.data[0];
        console.log('Última mensagem:', lastMessage);
        
        if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
          const responseText = lastMessage.content[0].text.value;
          
          console.log('Resposta bruta do OpenAI Assistant:', responseText);
          
          try {
            // Tentar extrair JSON da resposta
            let jsonStr = responseText.trim();
            
            // Limpar possíveis marcadores de código
            jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Procurar por JSON na resposta
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonStr = jsonMatch[0];
            }
            
            console.log('JSON extraído para parsing:', jsonStr);
            
            const recursoGerado = JSON.parse(jsonStr);
            
            // Validar estrutura do objeto
            if (!recursoGerado.titulo || !recursoGerado.argumentacao || !recursoGerado.fundamentacao_legal || !recursoGerado.pedido) {
              throw new Error('Estrutura de resposta inválida');
            }

            return {
              titulo: recursoGerado.titulo,
              argumentacao: recursoGerado.argumentacao,
              fundamentacao_legal: recursoGerado.fundamentacao_legal,
              pedido: recursoGerado.pedido,
              tipo: recursoGerado.tipo || (isConversaoAdvertencia ? 'conversao_advertencia' : 'defesa_previa')
            };
            
          } catch (parseError) {
            console.error('Erro ao fazer parsing da resposta do OpenAI:', parseError);
            console.error('Resposta que causou erro:', responseText);
            
            // Fallback: tentar extrair informações da resposta em texto livre
            return this.criarRecursoFallback(dadosMulta, responseText);
          }
        } else {
          console.error('Formato de mensagem inesperado:', lastMessage);
          throw new Error('Formato de resposta do assistente inesperado');
        }
      } else {
        console.error('Execução do assistente falhou:', runStatus.status);
        console.error('Detalhes do run:', runStatus);
        
        // Verificar se há erros específicos
        if (runStatus.last_error) {
          console.error('Erro específico:', runStatus.last_error);
          throw new Error(`Erro do assistente: ${runStatus.last_error.message}`);
        }
        
        throw new Error(`Execução do assistente falhou: ${runStatus.status}`);
      }

      // Se chegou até aqui, algo deu errado
      throw new Error('Não foi possível obter resposta do assistente');
      
    } catch (error) {
      console.error('Erro ao gerar recurso com OpenAI Assistant:', error);
      
      // Log detalhado do erro
      if (error instanceof Error) {
        console.error('Mensagem do erro:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      // Verificar se é um erro específico da OpenAI
      if (error && typeof error === 'object' && 'status' in error) {
        const openAIError = error as { status?: number; code?: string };
        console.error('Status do erro OpenAI:', openAIError.status);
        console.error('Código do erro OpenAI:', openAIError.code);
      }
      
      // Fallback em caso de erro na API
      console.log('Usando fallback para gerar recurso...');
      return this.criarRecursoFallback(dadosMulta);
    }
  }

  private criarRecursoFallback(dadosMulta: DocumentoProcessado, respostaIA?: string): RecursoGerado {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const orgaoDestinatario = dadosMulta.orgaoAutuador || 'Órgão de Trânsito Competente';
    
    // Se temos uma resposta da IA mas não conseguimos fazer parse, usar o conteúdo formatado
    if (respostaIA) {
      const documentoCompleto = `AO ${orgaoDestinatario.toUpperCase()}\n\n` +
        `DEFESA PRÉVIA\n` +
        `Auto de Infração nº ${dadosMulta.numeroAuto}\n\n` +
        respostaIA +
        `\n\nLocal e Data: _________________, ${dataAtual}\n\n` +
        `_________________________________\n` +
        `Requerente`;
      
      return {
        titulo: `DEFESA PRÉVIA - Auto de Infração nº ${dadosMulta.numeroAuto}`,
        argumentacao: documentoCompleto,
        fundamentacao_legal: 'Código de Trânsito Brasileiro (Lei 9.503/97) e regulamentações do CONTRAN.',
        pedido: 'Requer-se a revisão e possível arquivamento do auto de infração.',
        tipo: 'defesa_previa'
      };
    }
    
    // Fallback genérico com formatação completa
    const documentoCompleto = `AO ${orgaoDestinatario.toUpperCase()}\n\n` +
      `DEFESA PRÉVIA\n` +
      `Auto de Infração nº ${dadosMulta.numeroAuto}\n\n` +
      `IDENTIFICAÇÃO DO REQUERENTE:\n` +
      `Nome: [NOME DO REQUERENTE]\n` +
      `Qualidade: Proprietário/Condutor do veículo\n\n` +
      `IDENTIFICAÇÃO DO VEÍCULO:\n` +
      `Placa: ${dadosMulta.placaVeiculo}\n\n` +
      `DADOS DA AUTUAÇÃO:\n` +
      `Auto de Infração: ${dadosMulta.numeroAuto}\n` +
      `Data da Infração: ${dadosMulta.dataInfracao}\n` +
      `Horário: ${dadosMulta.horaInfracao}\n` +
      `Local: ${dadosMulta.localInfracao}\n` +
      `Código da Infração: ${dadosMulta.codigoInfracao}\n` +
      `Descrição: ${dadosMulta.descricaoInfracao}\n` +
      `Valor da Multa: R$ ${dadosMulta.valorMulta}\n` +
      `Agente Autuador: ${dadosMulta.agente}\n\n` +
      `ARGUMENTAÇÃO:\n\n` +
      `Venho, respeitosamente, apresentar DEFESA PRÉVIA ao Auto de Infração em epígrafe, alegando irregularidades no processo de autuação que comprometem a validade do ato administrativo.\n\n` +
      `Após análise do auto de infração, verifico a existência de vícios que maculam sua validade, devendo ser arquivado por não atender aos requisitos legais estabelecidos pelo Código de Trânsito Brasileiro.\n\n` +
      `FUNDAMENTAÇÃO LEGAL:\n\n` +
      `- Artigos 280, 281 e 282 do Código de Trânsito Brasileiro (Lei 9.503/97)\n` +
      `- Resolução CONTRAN nº 619/2016\n` +
      `- Artigo 5º, incisos LIV e LV da Constituição Federal\n\n` +
      `PEDIDO:\n\n` +
      `Diante do exposto, REQUER-SE:\n\n` +
      `a) O recebimento da presente defesa prévia;\n` +
      `b) O ARQUIVAMENTO do Auto de Infração nº ${dadosMulta.numeroAuto} por vício insanável;\n` +
      `c) A não aplicação da penalidade de multa no valor de R$ ${dadosMulta.valorMulta}.\n\n` +
      `Termos em que pede deferimento.\n\n` +
      `Local e Data: _________________, ${dataAtual}\n\n` +
      `_________________________________\n` +
      `[NOME DO REQUERENTE]\n` +
      `Requerente`;
    
    return {
      titulo: `DEFESA PRÉVIA - Auto de Infração nº ${dadosMulta.numeroAuto}`,
      argumentacao: documentoCompleto,
      fundamentacao_legal: 'Artigos 280, 281 e 282 do Código de Trânsito Brasileiro (Lei 9.503/97), Resolução CONTRAN nº 619/2016, Artigo 5º, incisos LIV e LV da Constituição Federal.',
      pedido: `Arquivamento do Auto de Infração nº ${dadosMulta.numeroAuto} por vício insanável e não aplicação da penalidade de multa no valor de R$ ${dadosMulta.valorMulta}.`,
      tipo: 'defesa_previa'
    };
  }
}

export default new OpenAIAssistantService();
export { OpenAIAssistantService };
export type { RecursoGerado };