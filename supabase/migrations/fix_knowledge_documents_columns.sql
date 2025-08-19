-- Migração corretiva para alinhar tabela knowledge_documents com o código TypeScript
-- Adiciona colunas faltantes e renomeia 'category' para 'type'

-- Primeiro, adiciona as novas colunas
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS type VARCHAR(100) CHECK (type IN ('lei', 'jurisprudencia', 'recurso_modelo', 'doutrina', 'outro')),
ADD COLUMN IF NOT EXISTS relevance_score DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS author VARCHAR(255),
ADD COLUMN IF NOT EXISTS publication_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- Define valor padrão para a coluna 'type' nos registros existentes
UPDATE public.knowledge_documents 
SET type = 'outro'
WHERE type IS NULL;

-- Remove a coluna 'category' antiga (se existir)
ALTER TABLE public.knowledge_documents 
DROP COLUMN IF EXISTS category;

-- Atualiza os índices
DROP INDEX IF EXISTS idx_knowledge_documents_category;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type ON public.knowledge_documents(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_relevance_score ON public.knowledge_documents(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_is_active ON public.knowledge_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_author ON public.knowledge_documents(author);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_publication_date ON public.knowledge_documents(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_by ON public.knowledge_documents(created_by);

-- Atualiza as políticas RLS para usar 'type' ao invés de 'category'
DROP POLICY IF EXISTS "Public documents are viewable by all" ON public.knowledge_documents;
CREATE POLICY "Public documents are viewable by all" ON public.knowledge_documents
    FOR SELECT USING (is_validated = true AND is_active = true);

-- Adiciona política para created_by (se não existir)
DROP POLICY IF EXISTS "Users can view documents they created" ON public.knowledge_documents;
CREATE POLICY "Users can view documents they created" ON public.knowledge_documents
    FOR SELECT USING (auth.uid() = created_by);

-- Atualiza dados de teste existentes para usar as novas colunas
UPDATE public.knowledge_documents 
SET 
    relevance_score = COALESCE(success_rate, 1.0),
    is_active = true,
    metadata = '{}'
WHERE relevance_score IS NULL;

-- Comentário atualizado
COMMENT ON TABLE public.knowledge_documents IS 'Base de conhecimento jurídico com leis, jurisprudências e recursos - estrutura alinhada com TypeScript';
COMMENT ON COLUMN public.knowledge_documents.type IS 'Tipo do documento: lei, jurisprudencia, recurso_modelo, doutrina, outro';
COMMENT ON COLUMN public.knowledge_documents.relevance_score IS 'Pontuação de relevância do documento (0.0 a 5.0)';
COMMENT ON COLUMN public.knowledge_documents.tags IS 'Array de tags para categorização';
COMMENT ON COLUMN public.knowledge_documents.metadata IS 'Metadados adicionais em formato JSON';
COMMENT ON COLUMN public.knowledge_documents.is_active IS 'Indica se o documento está ativo/disponível';