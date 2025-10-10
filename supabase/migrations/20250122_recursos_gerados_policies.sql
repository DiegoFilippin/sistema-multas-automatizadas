-- Políticas RLS para a tabela recursos_gerados
-- Permite que usuários autenticados possam inserir, visualizar, atualizar e deletar recursos
-- baseado na company_id do usuário logado

-- Política para SELECT (visualizar recursos)
CREATE POLICY "Users can view recursos_gerados from their company" ON recursos_gerados
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para INSERT (criar novos recursos)
CREATE POLICY "Users can insert recursos_gerados for their company" ON recursos_gerados
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Política para UPDATE (atualizar recursos)
CREATE POLICY "Users can update recursos_gerados from their company" ON recursos_gerados
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ) WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para DELETE (deletar recursos)
CREATE POLICY "Users can delete recursos_gerados from their company" ON recursos_gerados
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Conceder permissões básicas para os roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON recursos_gerados TO authenticated;
GRANT SELECT ON recursos_gerados TO anon;

-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'recursos_gerados'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;