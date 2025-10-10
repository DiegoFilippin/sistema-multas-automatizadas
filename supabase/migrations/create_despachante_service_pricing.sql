-- Criar tabela despachante_service_pricing
CREATE TABLE IF NOT EXISTS public.despachante_service_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    despachante_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    client_price DECIMAL(10,2) NULL, -- Preço que o despachante cobra do cliente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(despachante_id, service_id)
);

-- Habilitar RLS
ALTER TABLE public.despachante_service_pricing ENABLE ROW LEVEL SECURITY;

-- Política para despachantes verem apenas seus próprios registros
CREATE POLICY "Despachantes podem ver apenas seus próprios preços" ON public.despachante_service_pricing
    FOR ALL USING (
        auth.uid() = despachante_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Superadmin'
        )
    );

-- Política para inserção (despachantes podem inserir apenas para si mesmos)
CREATE POLICY "Despachantes podem inserir apenas seus próprios preços" ON public.despachante_service_pricing
    FOR INSERT WITH CHECK (
        auth.uid() = despachante_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Superadmin'
        )
    );

-- Política para atualização (despachantes podem atualizar apenas seus próprios registros)
CREATE POLICY "Despachantes podem atualizar apenas seus próprios preços" ON public.despachante_service_pricing
    FOR UPDATE USING (
        auth.uid() = despachante_id OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Superadmin'
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_despachante_service_pricing_updated_at 
    BEFORE UPDATE ON public.despachante_service_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Popular tabela com despachantes existentes
INSERT INTO public.despachante_service_pricing (despachante_id, service_id, client_price)
SELECT 
    u.id as despachante_id,
    s.id as service_id,
    NULL as client_price
FROM public.users u
CROSS JOIN public.services s
WHERE u.role = 'Despachante'
ON CONFLICT (despachante_id, service_id) DO NOTHING;

-- Função para criar registros automaticamente quando um novo despachante é criado
CREATE OR REPLACE FUNCTION create_despachante_service_pricing_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o novo usuário é um despachante, criar registros para todos os serviços
    IF NEW.role = 'Despachante' THEN
        INSERT INTO public.despachante_service_pricing (despachante_id, service_id, client_price)
        SELECT NEW.id, s.id, NULL
        FROM public.services s
        ON CONFLICT (despachante_id, service_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar registros automaticamente quando um novo despachante é criado
CREATE TRIGGER trigger_create_despachante_service_pricing_on_user_insert
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_despachante_service_pricing_on_user_insert();

-- Função para criar registros automaticamente quando um novo serviço é criado
CREATE OR REPLACE FUNCTION create_despachante_service_pricing_on_service_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um novo serviço é criado, criar registros para todos os despachantes
    INSERT INTO public.despachante_service_pricing (despachante_id, service_id, client_price)
    SELECT u.id, NEW.id, NULL
    FROM public.users u
    WHERE u.role = 'Despachante'
    ON CONFLICT (despachante_id, service_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar registros automaticamente quando um novo serviço é criado
CREATE TRIGGER trigger_create_despachante_service_pricing_on_service_insert
    AFTER INSERT ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION create_despachante_service_pricing_on_service_insert();

-- Conceder permissões
GRANT ALL PRIVILEGES ON public.despachante_service_pricing TO authenticated;
GRANT SELECT ON public.despachante_service_pricing TO anon;

-- Comentários para documentação
COMMENT ON TABLE public.despachante_service_pricing IS 'Tabela espelho dos serviços para cada despachante com seus preços personalizados';
COMMENT ON COLUMN public.despachante_service_pricing.client_price IS 'Preço que o despachante cobra do cliente final pelo serviço';
COMMENT ON COLUMN public.despachante_service_pricing.despachante_id IS 'ID do despachante (referência para users.id)';
COMMENT ON COLUMN public.despachante_service_pricing.service_id IS 'ID do serviço (referência para services.id)';