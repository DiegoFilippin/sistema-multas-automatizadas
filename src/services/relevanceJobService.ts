import { autoRelevanceService } from './autoRelevanceService';
import { supabase } from '../lib/supabase';

export interface JobResult {
  success: boolean;
  documentsProcessed: number;
  documentsUpdated: number;
  errors: number;
  duration: number;
  timestamp: string;
}

export interface JobSchedule {
  enabled: boolean;
  intervalHours: number;
  lastRun?: string;
  nextRun?: string;
}

class RelevanceJobService {
  private static instance: RelevanceJobService;
  private jobInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): RelevanceJobService {
    if (!RelevanceJobService.instance) {
      RelevanceJobService.instance = new RelevanceJobService();
    }
    return RelevanceJobService.instance;
  }

  /**
   * Executa o job de recálculo de relevância
   */
  async runRelevanceRecalculationJob(): Promise<JobResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('🔄 Iniciando job de recálculo de relevância...', timestamp);

    if (this.isRunning) {
      console.log('⚠️ Job já está em execução, pulando...');
      return {
        success: false,
        documentsProcessed: 0,
        documentsUpdated: 0,
        errors: 1,
        duration: 0,
        timestamp
      };
    }

    this.isRunning = true;

    try {
      // Busca todos os documentos ativos
      const { data: documents, error } = await supabase
        .from('knowledge_documents')
        .select('id, title, relevance_score, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: true }); // Prioriza documentos mais antigos

      if (error) {
        throw new Error(`Erro ao buscar documentos: ${error.message}`);
      }

      if (!documents || documents.length === 0) {
        console.log('📄 Nenhum documento encontrado para processar');
        return {
          success: true,
          documentsProcessed: 0,
          documentsUpdated: 0,
          errors: 0,
          duration: Date.now() - startTime,
          timestamp
        };
      }

      console.log(`📊 Processando ${documents.length} documentos...`);

      let documentsUpdated = 0;
      let errors = 0;

      // Processa documentos em lotes para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (doc) => {
            try {
              // Calcula novo score
              const metrics = await autoRelevanceService.calculateRelevanceScore(doc.id);
              const newScore = metrics.finalScore;
              const currentScore = doc.relevance_score;

              // Só atualiza se houver diferença significativa (> 0.1)
              if (Math.abs(newScore - currentScore) > 0.1) {
                const success = await autoRelevanceService.updateDocumentRelevanceScore(doc.id);
                if (success) {
                  documentsUpdated++;
                  console.log(`✅ Documento "${doc.title}" atualizado: ${currentScore.toFixed(1)} → ${newScore.toFixed(1)}`);
                } else {
                  errors++;
                  console.error(`❌ Erro ao atualizar documento: ${doc.title}`);
                }
              }
            } catch (error) {
              errors++;
              console.error(`❌ Erro ao processar documento ${doc.id}:`, error);
            }
          })
        );

        // Pausa entre lotes para não sobrecarregar o sistema
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;
      const result: JobResult = {
        success: errors < documents.length / 2, // Sucesso se menos de 50% de erros
        documentsProcessed: documents.length,
        documentsUpdated,
        errors,
        duration,
        timestamp
      };

      console.log('✅ Job de recálculo concluído:', {
        processados: documents.length,
        atualizados: documentsUpdated,
        erros: errors,
        duração: `${(duration / 1000).toFixed(1)}s`
      });

      // Salva resultado do job
      await this.saveJobResult(result);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Erro no job de recálculo:', error);
      
      const result: JobResult = {
        success: false,
        documentsProcessed: 0,
        documentsUpdated: 0,
        errors: 1,
        duration,
        timestamp
      };

      await this.saveJobResult(result);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Agenda execução periódica do job
   */
  scheduleRelevanceJob(intervalHours: number = 24): void {
    // Para job anterior se existir
    this.stopScheduledJob();

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`⏰ Agendando job de relevância para executar a cada ${intervalHours} horas`);
    
    this.jobInterval = setInterval(async () => {
      try {
        await this.runRelevanceRecalculationJob();
      } catch (error) {
        console.error('Erro na execução agendada do job:', error);
      }
    }, intervalMs);

    // Executa uma vez imediatamente (opcional)
    // this.runRelevanceRecalculationJob().catch(console.error);
  }

  /**
   * Para a execução agendada do job
   */
  stopScheduledJob(): void {
    if (this.jobInterval) {
      clearInterval(this.jobInterval);
      this.jobInterval = null;
      console.log('⏹️ Job agendado de relevância parado');
    }
  }

  /**
   * Verifica se o job está agendado
   */
  isJobScheduled(): boolean {
    return this.jobInterval !== null;
  }

  /**
   * Verifica se o job está executando
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Salva resultado do job para histórico
   */
  private async saveJobResult(result: JobResult): Promise<void> {
    try {
      // Salva no localStorage para histórico local
      const jobHistory = this.getJobHistory();
      jobHistory.unshift(result);
      
      // Mantém apenas os últimos 50 resultados
      if (jobHistory.length > 50) {
        jobHistory.splice(50);
      }
      
      localStorage.setItem('relevance_job_history', JSON.stringify(jobHistory));
    } catch (error) {
      console.error('Erro ao salvar resultado do job:', error);
    }
  }

  /**
   * Obtém histórico de execuções do job
   */
  getJobHistory(): JobResult[] {
    try {
      const history = localStorage.getItem('relevance_job_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Erro ao obter histórico do job:', error);
      return [];
    }
  }

  /**
   * Obtém configuração do job
   */
  getJobSchedule(): JobSchedule {
    try {
      const config = localStorage.getItem('relevance_job_schedule');
      return config ? JSON.parse(config) : {
        enabled: false,
        intervalHours: 24
      };
    } catch (error) {
      console.error('Erro ao obter configuração do job:', error);
      return {
        enabled: false,
        intervalHours: 24
      };
    }
  }

  /**
   * Salva configuração do job
   */
  saveJobSchedule(schedule: JobSchedule): void {
    try {
      localStorage.setItem('relevance_job_schedule', JSON.stringify(schedule));
    } catch (error) {
      console.error('Erro ao salvar configuração do job:', error);
    }
  }

  /**
   * Executa recálculo para documentos específicos
   */
  async recalculateSpecificDocuments(documentIds: string[]): Promise<JobResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log(`🎯 Recalculando relevância para ${documentIds.length} documentos específicos...`);

    let documentsUpdated = 0;
    let errors = 0;

    for (const documentId of documentIds) {
      try {
        const success = await autoRelevanceService.updateDocumentRelevanceScore(documentId);
        if (success) {
          documentsUpdated++;
        } else {
          errors++;
        }
      } catch (error) {
        errors++;
        console.error(`Erro ao recalcular documento ${documentId}:`, error);
      }
    }

    const result: JobResult = {
      success: errors < documentIds.length / 2,
      documentsProcessed: documentIds.length,
      documentsUpdated,
      errors,
      duration: Date.now() - startTime,
      timestamp
    };

    console.log('✅ Recálculo específico concluído:', result);
    return result;
  }
}

export const relevanceJobService = RelevanceJobService.getInstance();
export default relevanceJobService;