-- Corrigir estrutura da tabela document_embeddings
-- Adicionar colunas necessárias para o sistema de embeddings

-- Habilitar extensão vector se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar as colunas necessárias
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS chunk_text TEXT;
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Garantir que as permissões estejam corretas
GRANT ALL PRIVILEGES ON document_embeddings TO authenticated;
GRANT SELECT ON document_embeddings TO anon;