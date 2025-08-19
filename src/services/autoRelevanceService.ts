import { supabase } from '../lib/supabase';

export interface RelevanceMetrics {
  feedbackScore: number;
  usageFrequency: number;
  contentQuality: number;
  documentAge: number;
  finalScore: number;
}

export interface DocumentRelevanceData {
  id: string;
  title: string;
  content: string;
  created_at: string;
  current_relevance_score: number;
  calculated_metrics: RelevanceMetrics;
}

class AutoRelevanceService {
  /**
   * Calcula o score de relevância automático para um documento
   */
  async calculateRelevanceScore(documentId: string): Promise<RelevanceMetrics> {
    try {
      // Calcula cada métrica com fallback individual
      const feedbackScore = await this.calculateFeedbackScore(documentId).catch(error => {
        console.warn('Fallback para feedbackScore:', error);
        return 2.5; // Score neutro
      });
      
      const usageFrequency = await this.calculateUsageFrequency(documentId).catch(error => {
        console.warn('Fallback para usageFrequency:', error);
        return 1.0; // Score baixo
      });
      
      const contentQuality = await this.calculateContentQuality(documentId).catch(error => {
        console.warn('Fallback para contentQuality:', error);
        return 2.0; // Score neutro
      });
      
      const documentAge = await this.calculateDocumentAge(documentId).catch(error => {
        console.warn('Fallback para documentAge:', error);
        return 2.5; // Score neutro
      });

      // Pesos para cada métrica (total = 1.0)
      const weights = {
        feedback: 0.4,    // 40% - Feedback dos usuários
        usage: 0.3,       // 30% - Frequência de uso
        quality: 0.2,     // 20% - Qualidade do conteúdo
        age: 0.1          // 10% - Idade do documento
      };

      // Calcula o score final (escala 0-5)
      const finalScore = Math.min(5.0, Math.max(0.0, 
        (feedbackScore * weights.feedback) +
        (usageFrequency * weights.usage) +
        (contentQuality * weights.quality) +
        (documentAge * weights.age)
      ));

      return {
        feedbackScore,
        usageFrequency,
        contentQuality,
        documentAge,
        finalScore: Math.round(finalScore * 10) / 10 // Arredonda para 1 casa decimal
      };
    } catch (error) {
      console.error('Erro crítico no cálculo de relevância:', error);
      // Fallback completo com scores seguros
      return {
        feedbackScore: 2.5,
        usageFrequency: 1.0,
        contentQuality: 2.0,
        documentAge: 2.5,
        finalScore: 2.0
      };
    }
  }

  /**
   * Calcula score baseado no feedback dos usuários
   * Considera tanto o rating geral quanto os aspectos específicos
   */
  private async calculateFeedbackScore(documentId: string): Promise<number> {
    try {
      // Primeiro busca os resource_ids que usaram este documento
      const { data: links, error: linksError } = await supabase
        .from('resource_knowledge_links')
        .select('resource_id')
        .eq('knowledge_document_id', documentId);

      if (linksError) {
        console.warn('Erro ao buscar links de recursos:', linksError);
        return 2.5; // Fallback para score neutro
      }

      if (!links || links.length === 0) {
        return 2.5; // Score neutro se não há links
      }

      const resourceIds = links.map(link => link.resource_id);

      // Agora busca feedbacks desses recursos
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('feedback')
        .select('rating, aspectos_avaliacao')
        .in('resource_id', resourceIds);

      if (feedbackError) {
        console.warn('Erro ao buscar feedbacks:', feedbackError);
        return 2.5; // Fallback para score neutro
      }

      if (!feedbacks || feedbacks.length === 0) {
        return 2.5; // Score neutro se não há feedback
      }

      let totalScore = 0;
      let count = 0;

      feedbacks.forEach(feedback => {
        // Rating geral (1-5)
        if (feedback.rating) {
          totalScore += feedback.rating;
          count++;
        }

        // Aspectos específicos se disponíveis
        if (feedback.aspectos_avaliacao) {
          const aspectos = feedback.aspectos_avaliacao as any;
          if (aspectos.relevancia_juridica) {
            totalScore += aspectos.relevancia_juridica;
            count++;
          }
          if (aspectos.clareza_texto) {
            totalScore += aspectos.clareza_texto;
            count++;
          }
        }
      });

      return count > 0 ? totalScore / count : 2.5;
    } catch (error) {
      console.error('Erro ao calcular feedback score:', error);
      return 2.5;
    }
  }

  /**
   * Calcula score baseado na frequência de uso do documento
   */
  private async calculateUsageFrequency(documentId: string): Promise<number> {
    try {
      // Tenta buscar os links primeiro para verificar se a tabela está acessível
      const { data: links, error } = await supabase
        .from('resource_knowledge_links')
        .select('id')
        .eq('knowledge_document_id', documentId)
        .limit(100); // Limita para evitar consultas muito pesadas

      if (error) {
        console.warn('Erro ao acessar resource_knowledge_links:', error);
        // Fallback: retorna score baseado na existência do documento
        return 1.0;
      }

      const usageCount = links ? links.length : 0;

      // Normaliza para escala 0-5 (logarítmica para evitar valores muito altos)
      const normalizedUsage = Math.min(5.0, Math.log10(usageCount + 1) * 2);
      return normalizedUsage;
    } catch (error) {
      console.warn('Erro ao calcular frequência de uso:', error);
      // Fallback seguro
      return 1.0;
    }
  }

  /**
   * Calcula score baseado na qualidade do conteúdo
   */
  private async calculateContentQuality(documentId: string): Promise<number> {
    try {
      const { data: document, error } = await supabase
        .from('knowledge_documents')
        .select('content, title, metadata')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        return 2.0;
      }

      let qualityScore = 0;
      let factors = 0;

      // Fator 1: Tamanho do conteúdo (textos muito curtos ou muito longos são penalizados)
      const contentLength = document.content?.length || 0;
      if (contentLength > 100 && contentLength < 50000) {
        qualityScore += 5.0;
      } else if (contentLength > 50 && contentLength < 100000) {
        qualityScore += 3.0;
      } else {
        qualityScore += 1.0;
      }
      factors++;

      // Fator 2: Presença de título
      if (document.title && document.title.trim().length > 5) {
        qualityScore += 4.0;
      } else {
        qualityScore += 1.0;
      }
      factors++;

      // Fator 3: Estrutura do texto (parágrafos, pontuação)
      const paragraphs = document.content?.split('\n\n').length || 0;
      const sentences = document.content?.split(/[.!?]+/).length || 0;
      if (paragraphs > 2 && sentences > 5) {
        qualityScore += 5.0;
      } else if (paragraphs > 1 || sentences > 2) {
        qualityScore += 3.0;
      } else {
        qualityScore += 1.0;
      }
      factors++;

      // Fator 4: Metadados estruturados
      if (document.metadata && Object.keys(document.metadata).length > 0) {
        qualityScore += 4.0;
      } else {
        qualityScore += 2.0;
      }
      factors++;

      return factors > 0 ? qualityScore / factors : 2.0;
    } catch (error) {
      console.error('Erro ao calcular qualidade do conteúdo:', error);
      return 2.0;
    }
  }

  /**
   * Calcula score baseado na idade do documento
   * Documentos mais recentes têm score maior
   */
  private async calculateDocumentAge(documentId: string): Promise<number> {
    try {
      const { data: document, error } = await supabase
        .from('knowledge_documents')
        .select('created_at')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        return 2.5;
      }

      const createdAt = new Date(document.created_at);
      const now = new Date();
      const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Score decresce com a idade (documentos mais antigos têm score menor)
      if (ageInDays <= 30) {
        return 5.0; // Muito recente
      } else if (ageInDays <= 90) {
        return 4.0; // Recente
      } else if (ageInDays <= 180) {
        return 3.0; // Moderado
      } else if (ageInDays <= 365) {
        return 2.0; // Antigo
      } else {
        return 1.0; // Muito antigo
      }
    } catch (error) {
      console.error('Erro ao calcular idade do documento:', error);
      return 2.5;
    }
  }

  /**
   * Atualiza o score de relevância de um documento no banco
   */
  async updateDocumentRelevanceScore(documentId: string): Promise<boolean> {
    try {
      const metrics = await this.calculateRelevanceScore(documentId);
      
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ relevance_score: metrics.finalScore })
        .eq('id', documentId);

      if (error) {
        console.error('Erro ao atualizar score de relevância:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar score de relevância:', error);
      return false;
    }
  }

  /**
   * Recalcula scores de todos os documentos
   */
  async recalculateAllRelevanceScores(): Promise<{ updated: number; errors: number }> {
    try {
      const { data: documents, error } = await supabase
        .from('knowledge_documents')
        .select('id');

      if (error || !documents) {
        throw new Error('Erro ao buscar documentos');
      }

      let updated = 0;
      let errors = 0;

      for (const doc of documents) {
        const success = await this.updateDocumentRelevanceScore(doc.id);
        if (success) {
          updated++;
        } else {
          errors++;
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Erro ao recalcular todos os scores:', error);
      return { updated: 0, errors: 1 };
    }
  }

  /**
   * Obtém dados detalhados de relevância para análise
   */
  async getDocumentRelevanceData(documentId: string): Promise<DocumentRelevanceData | null> {
    try {
      const { data: document, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, content, created_at, relevance_score')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        return null;
      }

      const calculatedMetrics = await this.calculateRelevanceScore(documentId);

      return {
        id: document.id,
        title: document.title,
        content: document.content,
        created_at: document.created_at,
        current_relevance_score: document.relevance_score,
        calculated_metrics: calculatedMetrics
      };
    } catch (error) {
      console.error('Erro ao obter dados de relevância:', error);
      return null;
    }
  }
}

export const autoRelevanceService = new AutoRelevanceService();
export default autoRelevanceService;