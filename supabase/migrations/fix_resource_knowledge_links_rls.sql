-- Corrigir políticas RLS da tabela resource_knowledge_links
-- A política atual é muito restritiva e impede acesso aos links quando documentos são públicos

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Links follow resource access" ON public.resource_knowledge_links;

-- Criar nova política mais permissiva que permite acesso aos links quando:
-- 1. O usuário é dono do recurso OU
-- 2. O documento de conhecimento é público (validado)
CREATE POLICY "Links follow resource or public document access" ON public.resource_knowledge_links
    FOR SELECT USING (
        -- Usuário é dono do recurso
        EXISTS (
            SELECT 1 FROM public.generated_resources gr 
            WHERE gr.id = resource_id AND gr.user_id = auth.uid()
        )
        OR
        -- Documento de conhecimento é público (validado)
        EXISTS (
            SELECT 1 FROM public.knowledge_documents kd
            WHERE kd.id = knowledge_document_id AND kd.is_validated = true
        )
    );

-- Adicionar política para inserção (necessária para o sistema funcionar)
CREATE POLICY "Allow insert links for authenticated users" ON public.resource_knowledge_links
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Adicionar política para atualização (caso necessário)
CREATE POLICY "Allow update links for resource owners" ON public.resource_knowledge_links
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.generated_resources gr 
            WHERE gr.id = resource_id AND gr.user_id = auth.uid()
        )
    );

-- Garantir que a role authenticated tenha as permissões necessárias
GRANT SELECT, INSERT, UPDATE ON public.resource_knowledge_links TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resource_knowledge_links TO anon;

-- Comentário explicativo
COMMENT ON POLICY "Links follow resource or public document access" ON public.resource_knowledge_links IS 
'Permite acesso aos links quando o usuário é dono do recurso ou quando o documento de conhecimento é público (validado)';