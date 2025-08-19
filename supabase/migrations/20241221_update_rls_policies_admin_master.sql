-- Atualizar políticas RLS para reconhecer admin_master na tabela user_profiles
-- Substituir referências a usuarios.tipo_usuario por user_profiles.role

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admin master can manage all" ON asaas_config;
DROP POLICY IF EXISTS "Admin master can manage pricing_base" ON pricing_base;
DROP POLICY IF EXISTS "Empresa can manage own pricing" ON pricing_empresa;
DROP POLICY IF EXISTS "Despachante can manage own pricing" ON pricing_despachante;
DROP POLICY IF EXISTS "Users can view related transactions" ON asaas_transactions;
DROP POLICY IF EXISTS "Users can view related subscriptions" ON asaas_subscriptions;

-- Criar novas políticas usando user_profiles.role
-- Admin Master pode gerenciar tudo
CREATE POLICY "Admin master can manage all" ON asaas_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() AND up.role = 'admin_master'
  )
);

CREATE POLICY "Admin master can manage pricing_base" ON pricing_base FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() AND up.role = 'admin_master'
  )
);

-- Empresas podem ver seus próprios preços (admin e admin_master)
CREATE POLICY "Admin can manage pricing_empresa" ON pricing_empresa FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin')
  )
);

-- Despachantes podem ver seus próprios preços (admin_master, admin e user)
CREATE POLICY "Users can manage pricing_despachante" ON pricing_despachante FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin', 'user')
  )
);

-- Usuários podem ver transações relacionadas a eles
CREATE POLICY "Users can view related transactions" ON asaas_transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin', 'user')
  )
);

-- Usuários podem ver assinaturas relacionadas a eles
CREATE POLICY "Users can view related subscriptions" ON asaas_subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin', 'user')
  )
);

-- Política para asaas_customers
CREATE POLICY "Users can manage customers" ON asaas_customers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin', 'user')
  )
);

-- Política para asaas_webhooks (admin_master e admin podem gerenciar)
CREATE POLICY "Admin can manage webhooks" ON asaas_webhooks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin_master', 'admin')
  )
);

-- Comentário explicativo
COMMENT ON TABLE asaas_config IS 'Configurações do Asaas - Acesso: admin_master (total)';
COMMENT ON TABLE pricing_base IS 'Preços base do sistema - Acesso: admin_master (total)';
COMMENT ON TABLE pricing_empresa IS 'Preços por empresa - Acesso: admin_master, admin';
COMMENT ON TABLE pricing_despachante IS 'Preços por despachante - Acesso: admin_master, admin, user';