import { createClient } from '@supabase/supabase-js';
import KnowledgeService from './knowledgeService';
import OpenAI from 'openai';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface DadosInfracao {
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

export interface DadosCliente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  endereco?: string;
  telefone?: string;
}

export interface DadosVeiculo {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  renavam?: string;
  chassi?: string;
}

export interface RecursoGerado {
  id: string;
  cliente_id: string;
  veiculo_id: string;
  dados_infracao: DadosInfracao;
  conteudo_recurso: string;
  fundamentacao_juridica: string[];
  documentos_referencia: string[];
  tipo_recurso: 'defesa_previa' | 'recurso_primeira_instancia' | 'recurso_segunda_instancia';
  status: 'rascunho' | 'revisao' | 'finalizado' | 'enviado';
  score_confianca: number;
  sugestoes_melhoria: string[];
  created_at: string;
  updated_at: string;
}

export interface ContextoJuridico {
  documentos_relevantes: any[];
  fundamentacao_principal: string;
  jurisprudencias: any[];
  leis_aplicaveis: any[];
  precedentes: any[];
}

export class RecursoService {
  private static instance: RecursoService;
  private knowledgeService = KnowledgeService.getInstance();
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  static getInstance(): RecursoService {
    if (!RecursoService.instance) {
      RecursoService.instance = new RecursoService();
    }
    return RecursoService.instance;
  }

  /**
   * Busca contexto jurídico relevante para a infração
   */
  async buscarContextoJuridico(
    dadosInfracao: DadosInfracao
  ): Promise<ContextoJuridico> {
    try {
      // Constrói query de busca baseada nos dados da infração
      const queryBusca = this.construirQueryBusca(dadosInfracao);
      
      // Busca documentos relevantes usando busca semântica
      const documentosRelevantes = await this.knowledgeService.findRelevantDocuments(
        queryBusca,
        'recurso',
        10
      );

      // Separa documentos por tipo
      const leis = documentosRelevantes.filter(doc => 
        doc.document?.type === 'lei'
      );
      
      const jurisprudencias = documentosRelevantes.filter(doc => 
        doc.document?.type === 'jurisprudencia'
      );
      
      const recursosModelo = documentosRelevantes.filter(doc => 
        doc.document?.type === 'recurso_modelo'
      );

      // Identifica fundamentação principal
      const fundamentacaoPrincipal = await this.identificarFundamentacaoPrincipal(
        dadosInfracao,
        documentosRelevantes
      );

      return {
        documentos_relevantes: documentosRelevantes,
        fundamentacao_principal: fundamentacaoPrincipal,
        jurisprudencias,
        leis_aplicaveis: leis,
        precedentes: recursosModelo
      };
    } catch (error) {
      console.error('Erro ao buscar contexto jurídico:', error);
      return {
        documentos_relevantes: [],
        fundamentacao_principal: '',
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
    }
    
    if (dadosInfracao.descricaoInfracao.toLowerCase().includes('estacion')) {
      elementos.push('estacionamento', 'zona azul', 'vaga');
    }
    
    if (dadosInfracao.descricaoInfracao.toLowerCase().includes('sinal')) {
      elementos.push('semáforo', 'sinalização', 'placa');
    }

    return elementos.filter(Boolean).join(' ');
  }

  /**
   * Identifica a fundamentação jurídica principal
   */
  private async identificarFundamentacaoPrincipal(
    dadosInfracao: DadosInfracao,
    documentos: any[]
  ): Promise<string> {
    try {
      if (documentos.length === 0) {
        return 'Fundamentação baseada no Código de Trânsito Brasileiro';
      }

      // Usa IA para analisar os documentos e identificar a fundamentação principal
      const prompt = `
Analise os seguintes dados de infração e documentos jurídicos para identificar a fundamentação principal para um recurso:

Dados da Infração:
- Código: ${dadosInfracao.codigoInfracao}
- Descrição: ${dadosInfracao.descricaoInfracao}
- Local: ${dadosInfracao.localInfracao}
- Órgão: ${dadosInfracao.orgaoAutuador}

Documentos Relevantes:
${documentos.slice(0, 3).map(doc => `
- ${doc.document?.title}: ${doc.chunk_text.substring(0, 200)}...`).join('')}

Identifique a fundamentação jurídica principal em uma frase concisa:
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || 
        'Fundamentação baseada no Código de Trânsito Brasileiro';
    } catch (error) {
      console.error('Erro ao identificar fundamentação:', error);
      return 'Fundamentação baseada no Código de Trânsito Brasileiro';
    }
  }

  /**
   * Gera recurso usando IA com contexto jurídico
   */
  async gerarRecurso(
    dadosCliente: DadosCliente,
    dadosVeiculo: DadosVeiculo,
    dadosInfracao: DadosInfracao,
    tipoRecurso: 'defesa_previa' | 'recurso_primeira_instancia' | 'recurso_segunda_instancia' = 'defesa_previa'
  ): Promise<RecursoGerado> {
    try {
      // Busca contexto jurídico
      const contexto = await this.buscarContextoJuridico(dadosInfracao);
      
      // Gera o conteúdo do recurso
      const conteudoRecurso = await this.gerarConteudoRecurso(
        dadosCliente,
        dadosVeiculo,
        dadosInfracao,
        contexto,
        tipoRecurso
      );

      // Calcula score de confiança
      const scoreConfianca = this.calcularScoreConfianca(contexto, dadosInfracao);
      
      // Gera sugestões de melhoria
      const sugestoesMelhoria = await this.gerarSugestoesMelhoria(
        conteudoRecurso,
        contexto,
        scoreConfianca
      );

      // Cria registro do recurso
      const recurso: RecursoGerado = {
        id: crypto.randomUUID(),
        cliente_id: dadosCliente.id,
        veiculo_id: dadosVeiculo.id,
        dados_infracao: dadosInfracao,
        conteudo_recurso: conteudoRecurso,
        fundamentacao_juridica: contexto.documentos_relevantes.map(doc => doc.document?.title || ''),
        documentos_referencia: contexto.documentos_relevantes.map(doc => doc.document_id),
        tipo_recurso: tipoRecurso,
        status: 'rascunho',
        score_confianca: scoreConfianca,
        sugestoes_melhoria: sugestoesMelhoria,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Salva no banco de dados
      await this.salvarRecurso(recurso);
      
      // Registra links com documentos de conhecimento
      await this.registrarLinksConhecimento(recurso.id, contexto.documentos_relevantes);

      return recurso;
    } catch (error) {
      console.error('Erro ao gerar recurso:', error);
      throw new Error('Falha ao gerar recurso');
    }
  }

  /**
   * Gera o conteúdo textual do recurso
   */
  private async gerarConteudoRecurso(
    cliente: DadosCliente,
    veiculo: DadosVeiculo,
    infracao: DadosInfracao,
    contexto: ContextoJuridico,
    tipo: string
  ): Promise<string> {
    try {
      const prompt = `
Gere um ${tipo.replace('_', ' ')} profissional para multa de trânsito com base nos dados fornecidos:

**DADOS DO CLIENTE:**
Nome: ${cliente.nome}
CPF: ${cliente.cpf}
Endereço: ${cliente.endereco || 'Não informado'}

**DADOS DO VEÍCULO:**
Marca/Modelo: ${veiculo.marca} ${veiculo.modelo}
Placa: ${veiculo.placa}
Ano: ${veiculo.ano}

**DADOS DA INFRAÇÃO:**
Número do Auto: ${infracao.numeroAuto}
Data: ${infracao.dataInfracao}
Hora: ${infracao.horaInfracao}
Local: ${infracao.localInfracao}
Código: ${infracao.codigoInfracao}
Descrição: ${infracao.descricaoInfracao}
Valor: R$ ${infracao.valorMulta.toFixed(2)}
Órgão Autuador: ${infracao.orgaoAutuador}

**FUNDAMENTAÇÃO JURÍDICA:**
${contexto.fundamentacao_principal}

**DOCUMENTOS DE REFERÊNCIA:**
${contexto.documentos_relevantes.slice(0, 3).map(doc => 
  `- ${doc.document?.title}: ${doc.chunk_text.substring(0, 150)}...`
).join('\n')}

**INSTRUÇÕES:**
1. Use linguagem jurídica formal e técnica
2. Estruture com: identificação, fatos, fundamentação jurídica, pedidos
3. Cite as leis e jurisprudências relevantes
4. Seja específico sobre os vícios do auto de infração
5. Inclua pedido de cancelamento da multa
6. Mantenha tom respeitoso e profissional
7. Use no máximo 2000 palavras

Gere o recurso completo:
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.3
      });

      return response.choices[0]?.message?.content?.trim() || 
        'Erro ao gerar conteúdo do recurso';
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      throw new Error('Falha ao gerar conteúdo do recurso');
    }
  }

  /**
   * Calcula score de confiança baseado na qualidade do contexto
   */
  private calcularScoreConfianca(
    contexto: ContextoJuridico,
    infracao: DadosInfracao
  ): number {
    let score = 0.5; // Base
    
    // Pontuação por documentos relevantes
    if (contexto.documentos_relevantes.length > 0) {
      score += 0.2;
    }
    
    if (contexto.documentos_relevantes.length >= 3) {
      score += 0.1;
    }
    
    // Pontuação por tipos de documentos
    if (contexto.leis_aplicaveis.length > 0) {
      score += 0.1;
    }
    
    if (contexto.jurisprudencias.length > 0) {
      score += 0.1;
    }
    
    // Pontuação por qualidade dos dados
    if (infracao.numeroAuto && infracao.codigoInfracao) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Gera sugestões de melhoria para o recurso
   */
  private async gerarSugestoesMelhoria(
    conteudo: string,
    contexto: ContextoJuridico,
    score: number
  ): Promise<string[]> {
    const sugestoes: string[] = [];
    
    if (score < 0.7) {
      sugestoes.push('Considere adicionar mais fundamentação jurídica específica');
    }
    
    if (contexto.jurisprudencias.length === 0) {
      sugestoes.push('Busque jurisprudências similares para fortalecer a argumentação');
    }
    
    if (contexto.leis_aplicaveis.length === 0) {
      sugestoes.push('Inclua citações específicas do Código de Trânsito Brasileiro');
    }
    
    if (conteudo.length < 1000) {
      sugestoes.push('Considere expandir a fundamentação e argumentação');
    }
    
    return sugestoes;
  }

  /**
   * Salva recurso no banco de dados
   */
  private async salvarRecurso(recurso: RecursoGerado): Promise<void> {
    try {
      const { error } = await supabase
        .from('generated_resources')
        .insert({
          id: recurso.id,
          cliente_id: recurso.cliente_id,
          veiculo_id: recurso.veiculo_id,
          dados_infracao: recurso.dados_infracao,
          conteudo_recurso: recurso.conteudo_recurso,
          fundamentacao_juridica: recurso.fundamentacao_juridica,
          tipo_recurso: recurso.tipo_recurso,
          status: recurso.status,
          score_confianca: recurso.score_confianca,
          sugestoes_melhoria: recurso.sugestoes_melhoria,
          metadata: {
            documentos_referencia: recurso.documentos_referencia
          }
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar recurso:', error);
      throw new Error('Falha ao salvar recurso no banco de dados');
    }
  }

  /**
   * Registra links entre recurso e documentos de conhecimento
   */
  private async registrarLinksConhecimento(
    recursoId: string,
    documentos: any[]
  ): Promise<void> {
    try {
      const links = documentos.map(doc => ({
        resource_id: recursoId,
        knowledge_document_id: doc.document_id,
        similarity_score: doc.similarity || 0
      }));

      if (links.length > 0) {
        const { error } = await supabase
          .from('resource_knowledge_links')
          .insert(links);

        if (error) {
          console.error('Erro ao registrar links:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao registrar links de conhecimento:', error);
    }
  }

  /**
   * Busca recursos gerados
   */
  async buscarRecursos(
    clienteId?: string,
    status?: string,
    limit: number = 20
  ): Promise<RecursoGerado[]> {
    try {
      let query = supabase
        .from('generated_resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar recursos:', error);
      return [];
    }
  }

  /**
   * Atualiza status do recurso
   */
  async atualizarStatusRecurso(
    recursoId: string,
    novoStatus: RecursoGerado['status']
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('generated_resources')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', recursoId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw new Error('Falha ao atualizar status do recurso');
    }
  }
}

export default RecursoService;