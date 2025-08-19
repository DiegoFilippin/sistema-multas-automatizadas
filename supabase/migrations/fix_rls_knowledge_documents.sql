-- Corrigir políticas RLS para permitir inserção de documentos sem autenticação
-- Isso é necessário para o sistema de upload de documentos funcionar

-- Adicionar política para permitir inserção pela role anon (usuários não autenticados)
CREATE POLICY "Allow anon insert documents" ON public.knowledge_documents
    FOR INSERT TO anon
    WITH CHECK (true);

-- Adicionar política para permitir inserção pela role authenticated sem verificação de user_id
CREATE POLICY "Allow authenticated insert documents" ON public.knowledge_documents
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Garantir que as roles tenham as permissões necessárias
GRANT INSERT ON public.knowledge_documents TO anon;
GRANT INSERT ON public.knowledge_documents TO authenticated;

-- Também garantir permissões para tabelas relacionadas
GRANT INSERT ON public.document_embeddings TO anon;
GRANT INSERT ON public.document_embeddings TO authenticated;

GRANT INSERT ON public.document_tags TO anon;
GRANT INSERT ON public.document_tags TO authenticated;

-- Adicionar políticas para document_embeddings
CREATE POLICY "Allow anon insert embeddings" ON public.document_embeddings
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated insert embeddings" ON public.document_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Adicionar políticas para document_tags
CREATE POLICY "Allow anon insert tags" ON public.document_tags
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated insert tags" ON public.document_tags
    FOR INSERT TO authenticated
    WITH CHECK (true);