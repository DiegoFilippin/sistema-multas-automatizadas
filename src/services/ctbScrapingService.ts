import KnowledgeService from './knowledgeService';
import { autoRelevanceService } from './autoRelevanceService';

interface CTBArticle {
  articleNumber: string;
  title: string;
  content: string;
  comments?: string;
  author?: string;
  url: string;
}

interface ScrapingResult {
  success: boolean;
  articlesProcessed: number;
  errors: string[];
  articles: CTBArticle[];
}

class CTBScrapingService {
  private baseUrl = 'https://www.ctbdigital.com.br';
  private rateLimitDelay = 2000; // 2 segundos entre requisições
  private maxRetries = 3;

  /**
   * Extrai um artigo específico do CTB Digital
   */
  async scrapeArticle(articleNumber: string): Promise<CTBArticle | null> {
    try {
      const articleUrl = `${this.baseUrl}/artigo/art${articleNumber}`;
      
      // Simula delay para rate limiting
      await this.delay(this.rateLimitDelay);
      
      const response = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const article = this.parseArticleHTML(html, articleNumber, articleUrl);
      
      // Tenta buscar comentários do artigo
      if (article) {
        const comments = await this.scrapeArticleComments(articleNumber);
        if (comments) {
          article.comments = comments.content;
          article.author = comments.author;
        }
      }

      return article;
    } catch (error) {
      console.error(`Erro ao extrair artigo ${articleNumber}:`, error);
      return null;
    }
  }

  /**
   * Extrai comentários de um artigo específico
   */
  private async scrapeArticleComments(articleNumber: string): Promise<{content: string, author?: string} | null> {
    try {
      // Tenta diferentes padrões de URL para comentários
      const commentUrls = [
        `${this.baseUrl}/comentario/comentario${articleNumber}`,
        `${this.baseUrl}/artigo-comentarista/${articleNumber}`
      ];

      for (const commentUrl of commentUrls) {
        await this.delay(this.rateLimitDelay);
        
        const response = await fetch(commentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          const html = await response.text();
          return this.parseCommentHTML(html);
        }
      }

      return null;
    } catch (error) {
      console.error(`Erro ao extrair comentários do artigo ${articleNumber}:`, error);
      return null;
    }
  }

  /**
   * Extrai múltiplos artigos em lote
   */
  async scrapeArticleRange(startArticle: number, endArticle: number): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: true,
      articlesProcessed: 0,
      errors: [],
      articles: []
    };

    for (let i = startArticle; i <= endArticle; i++) {
      try {
        console.log(`Extraindo artigo ${i}...`);
        const article = await this.scrapeArticle(i.toString());
        
        if (article) {
          result.articles.push(article);
          result.articlesProcessed++;
        } else {
          result.errors.push(`Falha ao extrair artigo ${i}`);
        }
      } catch (error) {
        const errorMsg = `Erro no artigo ${i}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Adiciona artigos extraídos à base de conhecimento
   */
  async addArticlesToKnowledgeBase(articles: CTBArticle[]): Promise<{success: number, errors: string[]}> {
    const result = {
      success: 0,
      errors: [] as string[]
    };

    console.log(`🔄 Iniciando salvamento de ${articles.length} artigos na base de conhecimento...`);

    for (const article of articles) {
      try {
        console.log(`📝 Processando artigo ${article.articleNumber}: ${article.title}`);
        
        // Verifica se o artigo já existe
        const exists = await this.checkArticleExists(article.articleNumber);
        if (exists) {
          console.log(`⚠️ Artigo ${article.articleNumber} já existe na base - pulando`);
          continue;
        }

        // Formata o conteúdo do documento
        const content = this.formatArticleContent(article);
        
        console.log(`💾 Salvando artigo ${article.articleNumber} na base de conhecimento...`);
        
        // Cria o documento na base de conhecimento
        const document = await KnowledgeService.getInstance().createDocument({
          title: `CTB Art. ${article.articleNumber} - ${article.title}`,
          content,
          type: 'lei',
          source_url: article.url,
          metadata: {
            articleNumber: article.articleNumber,
            source: 'ctb_scraping',
            author: article.author,
            scrapedAt: new Date().toISOString()
          }
        }, 'system');

        console.log(`✅ Artigo ${article.articleNumber} salvo com ID: ${document.id}`);
        
        // Recalcula o score de relevância
        console.log(`🔄 Recalculando score de relevância para artigo ${article.articleNumber}...`);
        try {
          await autoRelevanceService.calculateRelevanceScore(document.id);
          console.log(`✅ Score de relevância calculado para artigo ${article.articleNumber}`);
        } catch (relevanceError) {
          console.warn(`⚠️ Erro ao calcular relevância para artigo ${article.articleNumber}:`, relevanceError);
          // Não falha o processo por erro de relevância
        }
        
        result.success++;
      } catch (error) {
        const errorMsg = `Erro ao salvar artigo ${article.articleNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(`🎯 Processo concluído: ${result.success} artigos salvos, ${result.errors.length} erros`);
    return result;
  }

  /**
   * Verifica se um artigo já existe na base de conhecimento
   */
  private async checkArticleExists(articleNumber: string): Promise<boolean> {
    try {
      console.log(`🔍 Verificando se artigo ${articleNumber} já existe...`);
      
      const searchResult = await KnowledgeService.getInstance().searchDocuments(`CTB Art. ${articleNumber}`);
      const exists = searchResult.documents.some(doc => 
        doc.metadata?.articleNumber === articleNumber ||
        doc.title.includes(`Art. ${articleNumber}`)
      );
      
      console.log(`${exists ? '✅' : '❌'} Artigo ${articleNumber} ${exists ? 'já existe' : 'não encontrado'}`);
      return exists;
    } catch (error) {
      console.error(`❌ Erro ao verificar existência do artigo ${articleNumber}:`, error);
      return false; // Em caso de erro, assume que não existe
    }
  }

  /**
   * Formata o conteúdo do artigo para salvamento
   */
  private formatArticleContent(article: CTBArticle): string {
    let content = `# Artigo ${article.articleNumber} - ${article.title}\n\n`;
    content += `**Conteúdo:**\n${article.content}\n\n`;
    
    if (article.comments) {
      content += `**Comentários:**\n${article.comments}\n\n`;
    }
    
    if (article.author) {
      content += `**Autor dos comentários:** ${article.author}\n\n`;
    }
    
    content += `**Fonte:** [CTB Digital](${article.url})`;
    
    return content;
  }

  /**
   * Extrai e limpa o conteúdo HTML do artigo
   */
  private parseArticleHTML(html: string, articleNumber: string, url: string): CTBArticle | null {
    try {
      // Implementação simplificada - em produção usaria um parser HTML real
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
      const contentMatch = html.match(/<div[^>]*class=["']?article-content["']?[^>]*>([\s\S]*?)<\/div>/i);
      
      if (!titleMatch && !contentMatch) {
        return null;
      }
      
      const title = titleMatch ? titleMatch[1].trim() : `Artigo ${articleNumber}`;
      const content = contentMatch ? this.cleanHTML(contentMatch[1]) : 'Conteúdo não encontrado';
      
      return {
        articleNumber,
        title,
        content,
        url
      };
    } catch (error) {
      console.error(`Erro ao fazer parse do HTML do artigo ${articleNumber}:`, error);
      return null;
    }
  }

  /**
   * Extrai e limpa comentários HTML
   */
  private parseCommentHTML(html: string): {content: string, author?: string} | null {
    try {
      const commentMatch = html.match(/<div[^>]*class=["']?comment-content["']?[^>]*>([\s\S]*?)<\/div>/i);
      const authorMatch = html.match(/<span[^>]*class=["']?comment-author["']?[^>]*>([^<]+)</i);
      
      if (!commentMatch) {
        return null;
      }
      
      return {
        content: this.cleanHTML(commentMatch[1]),
        author: authorMatch ? authorMatch[1].trim() : undefined
      };
    } catch (error) {
      console.error('Erro ao fazer parse dos comentários:', error);
      return null;
    }
  }

  /**
   * Remove tags HTML e limpa o texto
   */
  private cleanHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ') // Substitui &nbsp; por espaço
      .replace(/&amp;/g, '&') // Decodifica &amp;
      .replace(/&lt;/g, '<') // Decodifica &lt;
      .replace(/&gt;/g, '>') // Decodifica &gt;
      .replace(/&quot;/g, '"') // Decodifica &quot;
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  /**
   * Delay para rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const ctbScrapingService = new CTBScrapingService();
export type { CTBArticle, ScrapingResult };