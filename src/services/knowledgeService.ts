import { supabase } from '@/lib/supabase';
import VectorService from './vectorService';
import { autoRelevanceService, RelevanceMetrics, DocumentRelevanceData } from './autoRelevanceService';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: 'lei' | 'jurisprudencia' | 'recurso_modelo' | 'doutrina' | 'outro';
  tags: string[];
  source_url?: string;
  author?: string;
  publication_date?: string;
  relevance_score: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  category: string;
  color?: string;
  description?: string;
  usage_count: number;
}

export interface SearchFilters {
  types?: string[];
  categories?: string[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  author?: string;
  minRelevance?: number;
  isActive?: boolean;
}

export interface UploadDocumentData {
  title: string;
  content: string;
  type: KnowledgeDocument['type'];
  tags?: string[];
  source_url?: string;
  author?: string;
  publication_date?: string;
  relevance_score?: number;
  metadata?: Record<string, any>;
}

export class KnowledgeService {
  private static instance: KnowledgeService;
  private vectorService = VectorService.getInstance();

  private constructor() {
    // Inicialização se necessária
  }

  static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }

  /**
   * Cria um novo documento na base de conhecimento
   */
  async createDocument(
    documentData: UploadDocumentData,
    userId: string
  ): Promise<KnowledgeDocument> {
    try {
      const documentId = crypto.randomUUID();
      
      // Prepara dados do documento
      const document = {
        id: documentId,
        title: documentData.title,
        content: documentData.content,
        type: documentData.type,
        source_url: documentData.source_url || null,
        author: documentData.author || null,
        publication_date: documentData.publication_date || null,
        relevance_score: 1.0, // Será calculado automaticamente após criação
        is_active: true,
        metadata: documentData.metadata || {},
        created_by: userId
      };

      // Salva documento no banco
      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert(document)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Processa tags se fornecidas
      if (documentData.tags && documentData.tags.length > 0) {
        await this.addTagsToDocument(documentId, documentData.tags);
      }

      // Gera embeddings em background
      this.generateDocumentEmbeddings(documentId, documentData.content, {
        title: documentData.title,
        type: documentData.type
      }).catch(error => {
        console.error('Erro ao gerar embeddings:', error);
      });

      // Calcula score de relevância automaticamente em background
      this.calculateAndUpdateRelevanceScore(documentId).catch(error => {
        console.error('Erro ao calcular score de relevância:', error);
      });

      return data as KnowledgeDocument;
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      throw new Error('Falha ao criar documento na base de conhecimento');
    }
  }

  /**
   * Gera embeddings para um documento
   */
  private async generateDocumentEmbeddings(
    documentId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const embeddings = await this.vectorService.processDocument(
        documentId,
        content,
        metadata
      );
      
      await this.vectorService.saveEmbeddings(embeddings);
    } catch (error) {
      console.error('Erro ao gerar embeddings para documento:', documentId, error);
      throw error;
    }
  }

  /**
   * Busca documentos com filtros
   */
  async searchDocuments(
    query?: string,
    filters?: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ documents: KnowledgeDocument[]; total: number }> {
    try {
      let queryBuilder = supabase
        .from('knowledge_documents')
        .select('*, document_tags(tag_name)', { count: 'exact' });

      // Aplica filtros
      if (filters?.types && filters.types.length > 0) {
        queryBuilder = queryBuilder.in('type', filters.types);
      }



      if (filters?.dateFrom) {
        queryBuilder = queryBuilder.gte('publication_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        queryBuilder = queryBuilder.lte('publication_date', filters.dateTo);
      }

      if (filters?.author) {
        queryBuilder = queryBuilder.ilike('author', `%${filters.author}%`);
      }

      if (filters?.minRelevance !== undefined) {
        queryBuilder = queryBuilder.gte('relevance_score', filters.minRelevance);
      }

      if (filters?.isActive !== undefined) {
        queryBuilder = queryBuilder.eq('is_active', filters.isActive);
      }

      // Busca por texto se fornecido
      if (query) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query}%,content.ilike.%${query}%,author.ilike.%${query}%`
        );
      }

      // Aplica paginação e ordenação
      const { data, error, count } = await queryBuilder
        .order('relevance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        documents: data as KnowledgeDocument[],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      throw new Error('Falha ao buscar documentos');
    }
  }

  /**
   * Busca semântica na base de conhecimento
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<any[]> {
    try {
      const documentTypes = filters?.types;
      
      const results = await this.vectorService.semanticSearch(
        query,
        limit,
        threshold,
        documentTypes
      );

      // Enriquece resultados com dados completos dos documentos
      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          const { data: document } = await supabase
            .from('knowledge_documents')
            .select('*')
            .eq('id', result.document_id)
            .single();

          return {
            ...result,
            document: document || null
          };
        })
      );

      return enrichedResults.filter(result => result.document !== null);
    } catch (error) {
      console.error('Erro na busca semântica:', error);
      throw new Error('Falha na busca semântica');
    }
  }

  /**
   * Obtém documento por ID
   */
  async getDocumentById(id: string): Promise<KnowledgeDocument | null> {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*, document_tags(tag_name)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Documento não encontrado
        }
        throw error;
      }

      return data as KnowledgeDocument;
    } catch (error) {
      console.error('Erro ao buscar documento:', error);
      throw new Error('Falha ao buscar documento');
    }
  }

  /**
   * Atualiza documento
   */
  async updateDocument(
    id: string,
    updates: Partial<UploadDocumentData>
  ): Promise<KnowledgeDocument> {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Atualiza embeddings se o conteúdo foi alterado
      if (updates.content) {
        await this.vectorService.updateDocumentEmbeddings(
          id,
          updates.content,
          {
            title: updates.title || data.title,
            type: updates.type || data.type
          }
        );
      }

      return data as KnowledgeDocument;
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      throw new Error('Falha ao atualizar documento');
    }
  }

  /**
   * Remove documento
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      // Remove embeddings primeiro
      await this.vectorService.removeDocumentEmbeddings(id);
      
      // Remove tags do documento
      await supabase
        .from('document_tags')
        .delete()
        .eq('document_id', id);
      
      // Remove documento
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      throw new Error('Falha ao deletar documento');
    }
  }

  /**
   * Adiciona tags a um documento
   */
  async addTagsToDocument(documentId: string, tags: string[]): Promise<void> {
    try {
      const tagInserts = tags.map(tag => ({
        document_id: documentId,
        tag_name: tag.toLowerCase().trim()
      }));

      const { error } = await supabase
        .from('document_tags')
        .insert(tagInserts);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao adicionar tags:', error);
      throw new Error('Falha ao adicionar tags ao documento');
    }
  }

  /**
   * Remove tags de um documento
   */
  async removeTagsFromDocument(documentId: string, tags: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_tags')
        .delete()
        .eq('document_id', documentId)
        .in('tag_name', tags.map(tag => tag.toLowerCase().trim()));

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao remover tags:', error);
      throw new Error('Falha ao remover tags do documento');
    }
  }

  /**
   * Obtém todas as tags disponíveis
   */
  async getAllTags(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('document_tags')
        .select('tag_name')
        .order('tag_name');

      if (error) {
        throw error;
      }

      const uniqueTags = [...new Set(data?.map(item => item.tag_name) || [])];
      return uniqueTags;
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
      return [];
    }
  }



  /**
   * Obtém estatísticas da base de conhecimento
   */
  async getKnowledgeStats(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByCategory: Record<string, number>;
    totalTags: number;
    avgRelevanceScore: number;
  }> {
    try {
      const { data: documents, error } = await supabase
        .from('knowledge_documents')
        .select('type, relevance_score')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const totalDocuments = documents?.length || 0;
      
      const documentsByType = documents?.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};



      const avgRelevanceScore = totalDocuments > 0 
        ? documents?.reduce((sum, doc) => sum + doc.relevance_score, 0) / totalDocuments 
        : 0;

      const tags = await this.getAllTags();
      const totalTags = tags.length;

      return {
        totalDocuments,
        documentsByType,
        documentsByCategory: documentsByType, // Usando o mesmo que documentsByType por compatibilidade
        totalTags,
        avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalDocuments: 0,
        documentsByType: {},
        documentsByCategory: {},
        totalTags: 0,
        avgRelevanceScore: 0
      };
    }
  }

  /**
   * Busca documentos relacionados para geração de recursos
   */
  async findRelevantDocuments(
    query: string,
    resourceType: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Busca semântica primeiro
      const semanticResults = await this.semanticSearch(
        query,
        { types: ['lei', 'jurisprudencia', 'recurso_modelo'] },
        limit,
        0.6
      );

      // Se não encontrar resultados suficientes, faz busca textual
      if (semanticResults.length < limit) {
        const textResults = await this.searchDocuments(
          query,
          { types: ['lei', 'jurisprudencia', 'recurso_modelo'] },
          limit - semanticResults.length
        );

        // Combina resultados evitando duplicatas
        const existingIds = new Set(semanticResults.map(r => r.document_id));
        const additionalResults = textResults.documents
          .filter(doc => !existingIds.has(doc.id))
          .map(doc => ({
            document_id: doc.id,
            chunk_text: doc.content.substring(0, 500) + '...',
            similarity: 0.5, // Score padrão para busca textual
            document: doc
          }));

        return [...semanticResults, ...additionalResults];
      }

      return semanticResults;
    } catch (error) {
      console.error('Erro ao buscar documentos relevantes:', error);
      return [];
    }
  }

  /**
   * Registra uso de documento para métricas
   */
  async recordDocumentUsage(
    documentId: string,
    usageType: 'view' | 'reference' | 'generation',
    userId?: string
  ): Promise<void> {
    try {
      // Implementar sistema de métricas se necessário
      console.log(`Documento ${documentId} usado para ${usageType} por ${userId || 'anônimo'}`);
      
      // Recalcula score de relevância após uso significativo
      if (usageType === 'generation' || usageType === 'reference') {
        this.calculateAndUpdateRelevanceScore(documentId).catch(error => {
          console.error('Erro ao recalcular score após uso:', error);
        });
      }
    } catch (error) {
      console.error('Erro ao registrar uso do documento:', error);
    }
  }

  /**
   * Calcula e atualiza automaticamente o score de relevância de um documento
   */
  async calculateAndUpdateRelevanceScore(documentId: string): Promise<boolean> {
    try {
      return await autoRelevanceService.updateDocumentRelevanceScore(documentId);
    } catch (error) {
      console.error('Erro ao calcular score de relevância:', error);
      return false;
    }
  }

  /**
   * Obtém métricas detalhadas de relevância de um documento
   */
  async getDocumentRelevanceMetrics(documentId: string): Promise<RelevanceMetrics | null> {
    try {
      return await autoRelevanceService.calculateRelevanceScore(documentId);
    } catch (error) {
      console.error('Erro ao obter métricas de relevância:', error);
      return null;
    }
  }

  /**
   * Obtém dados completos de relevância para análise
   */
  async getDocumentRelevanceData(documentId: string): Promise<DocumentRelevanceData | null> {
    try {
      return await autoRelevanceService.getDocumentRelevanceData(documentId);
    } catch (error) {
      console.error('Erro ao obter dados de relevância:', error);
      return null;
    }
  }

  /**
   * Recalcula scores de relevância de todos os documentos
   */
  async recalculateAllRelevanceScores(): Promise<{ updated: number; errors: number }> {
    try {
      return await autoRelevanceService.recalculateAllRelevanceScores();
    } catch (error) {
      console.error('Erro ao recalcular todos os scores:', error);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * Atualiza score de relevância após feedback do usuário
   */
  async updateRelevanceAfterFeedback(documentId: string): Promise<void> {
    try {
      await this.calculateAndUpdateRelevanceScore(documentId);
    } catch (error) {
      console.error('Erro ao atualizar relevância após feedback:', error);
    }
  }
}

export default KnowledgeService;