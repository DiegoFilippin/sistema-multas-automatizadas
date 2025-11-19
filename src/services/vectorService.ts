import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  chunk_text: string;
  embedding: number[];
  chunk_index: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  document_id: string;
  chunk_text: string;
  similarity: number;
  metadata?: Record<string, any>;
  document_title?: string;
  document_type?: string;
}

export class VectorService {
  private static instance: VectorService;
  private openai: OpenAI;
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;

  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  /**
   * Gera embedding para um texto usando OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text.replace(/\n/g, ' ').trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw new Error('Falha ao gerar embedding do texto');
    }
  }

  /**
   * Divide texto em chunks menores para processamento
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i += this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
      const chunk = words.slice(i, i + this.CHUNK_SIZE).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Processa documento e gera embeddings para cada chunk
   */
  async processDocument(
    documentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<DocumentEmbedding[]> {
    try {
      const chunks = this.chunkText(content);
      const embeddings: DocumentEmbedding[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);
        
        const documentEmbedding: DocumentEmbedding = {
          id: crypto.randomUUID(),
          document_id: documentId,
          chunk_text: chunk,
          embedding,
          chunk_index: i,
          metadata
        };

        embeddings.push(documentEmbedding);
      }

      return embeddings;
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      throw new Error('Falha ao processar documento para embeddings');
    }
  }

  /**
   * Salva embeddings no banco de dados
   */
  async saveEmbeddings(embeddings: DocumentEmbedding[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .insert(
          embeddings.map(emb => ({
            id: emb.id,
            document_id: emb.document_id,
            pinecone_id: crypto.randomUUID(), // Campo obrigatório para compatibilidade
            chunk_text: emb.chunk_text,
            embedding: emb.embedding,
            chunk_index: emb.chunk_index,
            metadata: emb.metadata || {}
          }))
        );

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar embeddings:', error);
      throw new Error('Falha ao salvar embeddings no banco de dados');
    }
  }

  /**
   * Busca semântica usando similaridade de cosseno
   */
  async semanticSearch(
    query: string,
    limit: number = 10,
    threshold: number = 0.7,
    documentTypes?: string[]
  ): Promise<SearchResult[]> {
    try {
      // Gera embedding da query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Constrói a query SQL com filtros opcionais
      let sqlQuery = `
        SELECT 
          de.document_id,
          de.chunk_text,
          de.metadata,
          kd.title as document_title,
          kd.type as document_type,
          (de.embedding <=> $1::vector) as distance,
          (1 - (de.embedding <=> $1::vector)) as similarity
        FROM document_embeddings de
        JOIN knowledge_documents kd ON de.document_id = kd.id
        WHERE (1 - (de.embedding <=> $1::vector)) >= $2
      `;
      
      const params: any[] = [JSON.stringify(queryEmbedding), threshold];
      
      if (documentTypes && documentTypes.length > 0) {
        sqlQuery += ` AND kd.type = ANY($3)`;
        params.push(documentTypes);
      }
      
      sqlQuery += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sqlQuery,
        params
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        document_id: row.document_id,
        chunk_text: row.chunk_text,
        similarity: row.similarity,
        metadata: row.metadata,
        document_title: row.document_title,
        document_type: row.document_type
      }));
    } catch (error) {
      console.error('Erro na busca semântica:', error);
      throw new Error('Falha na busca semântica');
    }
  }

  /**
   * Busca semântica simplificada usando função do PostgreSQL
   */
  async simpleSemanticSearch(
    query: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const { data, error } = await supabase
        .rpc('search_documents', {
          query_embedding: queryEmbedding,
          similarity_threshold: threshold,
          match_count: limit
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro na busca semântica simples:', error);
      // Fallback para busca manual se a função RPC não existir
      return this.semanticSearch(query, limit, threshold);
    }
  }

  /**
   * Remove embeddings de um documento
   */
  async removeDocumentEmbeddings(documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao remover embeddings:', error);
      throw new Error('Falha ao remover embeddings do documento');
    }
  }

  /**
   * Atualiza embeddings de um documento
   */
  async updateDocumentEmbeddings(
    documentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Remove embeddings antigos
      await this.removeDocumentEmbeddings(documentId);
      
      // Gera novos embeddings
      const embeddings = await this.processDocument(documentId, content, metadata);
      
      // Salva novos embeddings
      await this.saveEmbeddings(embeddings);
    } catch (error) {
      console.error('Erro ao atualizar embeddings:', error);
      throw new Error('Falha ao atualizar embeddings do documento');
    }
  }

  /**
   * Busca documentos similares a um documento específico
   */
  async findSimilarDocuments(
    documentId: string,
    limit: number = 5,
    threshold: number = 0.8
  ): Promise<SearchResult[]> {
    try {
      // Busca um chunk representativo do documento
      const { data: embeddings, error } = await supabase
        .from('document_embeddings')
        .select('chunk_text')
        .eq('document_id', documentId)
        .eq('chunk_index', 0)
        .single();

      if (error || !embeddings) {
        throw new Error('Documento não encontrado');
      }

      // Usa o primeiro chunk para buscar documentos similares
      const results = await this.semanticSearch(
        embeddings.chunk_text,
        limit + 1, // +1 para excluir o próprio documento
        threshold
      );

      // Remove o próprio documento dos resultados
      return results.filter(result => result.document_id !== documentId);
    } catch (error) {
      console.error('Erro ao buscar documentos similares:', error);
      throw new Error('Falha ao buscar documentos similares');
    }
  }

  /**
   * Obtém estatísticas dos embeddings
   */
  async getEmbeddingStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    avgChunksPerDocument: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('document_id')
        .order('document_id');

      if (error) {
        throw error;
      }

      const totalChunks = data?.length || 0;
      const uniqueDocuments = new Set(data?.map(d => d.document_id) || []);
      const totalDocuments = uniqueDocuments.size;
      const avgChunksPerDocument = totalDocuments > 0 ? totalChunks / totalDocuments : 0;

      return {
        totalDocuments,
        totalChunks,
        avgChunksPerDocument: Math.round(avgChunksPerDocument * 100) / 100
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        avgChunksPerDocument: 0
      };
    }
  }
}

export default VectorService;