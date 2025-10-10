-- Migração para adicionar campos relacionados à funcionalidade de multas leves
-- Adiciona campos para identificar tipo de multa e controlar advertência por escrito

-- Adicionar campo para identificar o tipo de gravidade da multa
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS tipo_gravidade VARCHAR(20) CHECK (tipo_gravidade IN ('leve', 'media', 'grave', 'gravissima'));

-- Adicionar campo para indicar se o condutor possui histórico de multas nos últimos 12 meses
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS condutor_tem_historico_12m BOOLEAN DEFAULT NULL;

-- Adicionar campo para indicar se foi sugerida advertência por escrito
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS sugerida_advertencia_escrita BOOLEAN DEFAULT FALSE;

-- Adicionar campo para armazenar a data da verificação do histórico
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS data_verificacao_historico TIMESTAMP WITH TIME ZONE;

-- Adicionar campo para armazenar observações sobre a advertência
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS observacoes_advertencia TEXT;

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN multas.tipo_gravidade IS 'Tipo de gravidade da multa: leve, media, grave, gravissima';
COMMENT ON COLUMN multas.condutor_tem_historico_12m IS 'Indica se o condutor possui multas nos últimos 12 meses (NULL = não verificado, TRUE = possui, FALSE = não possui)';
COMMENT ON COLUMN multas.sugerida_advertencia_escrita IS 'Indica se foi sugerida advertência por escrito para multa leve sem histórico';
COMMENT ON COLUMN multas.data_verificacao_historico IS 'Data e hora da verificação do histórico do condutor';
COMMENT ON COLUMN multas.observacoes_advertencia IS 'Observações sobre a advertência por escrito sugerida';

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_multas_tipo_gravidade ON multas(tipo_gravidade);
CREATE INDEX IF NOT EXISTS idx_multas_condutor_historico ON multas(condutor_tem_historico_12m);
CREATE INDEX IF NOT EXISTS idx_multas_sugerida_advertencia ON multas(sugerida_advertencia_escrita);
CREATE INDEX IF NOT EXISTS idx_multas_data_verificacao_historico ON multas(data_verificacao_historico);

-- Criar tabela para armazenar modelos de advertência por escrito
CREATE TABLE IF NOT EXISTS modelos_advertencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo_infracao VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Habilitar RLS na tabela de modelos de advertência
ALTER TABLE modelos_advertencia ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam modelos de advertência
CREATE POLICY "Users can view advertencia models" ON modelos_advertencia
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid()
        )
    );

-- Política para permitir que administradores gerenciem modelos de advertência
CREATE POLICY "Admins can manage advertencia models" ON modelos_advertencia
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin')
        )
    );

-- Conceder permissões para roles
GRANT SELECT, INSERT, UPDATE ON modelos_advertencia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON modelos_advertencia TO service_role;
GRANT SELECT ON modelos_advertencia TO anon;

-- Função para atualizar automaticamente o updated_at na tabela modelos_advertencia
CREATE OR REPLACE FUNCTION update_modelos_advertencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_modelos_advertencia_updated_at
    BEFORE UPDATE ON modelos_advertencia
    FOR EACH ROW
    EXECUTE FUNCTION update_modelos_advertencia_updated_at();

-- Inserir modelo padrão de advertência por escrito
INSERT INTO modelos_advertencia (nome, titulo, conteudo, tipo_infracao, ativo)
VALUES (
    'Advertência Padrão - Multa Leve',
    'ADVERTÊNCIA POR ESCRITO',
    'ADVERTÊNCIA POR ESCRITO

Ao(À) Senhor(a): {NOME_CONDUTOR}
CPF: {CPF_CONDUTOR}

Em razão da infração de trânsito de natureza LEVE cometida em {DATA_INFRACAO}, no local {LOCAL_INFRACAO}, com o veículo de placa {PLACA_VEICULO}, e considerando que Vossa Senhoria não possui registro de infrações nos últimos 12 (doze) meses, conforme previsto no Código de Trânsito Brasileiro, fica Vossa Senhoria ADVERTIDO(A) por escrito sobre a necessidade de observar rigorosamente as normas de trânsito.

Esta advertência tem caráter educativo e visa conscientizar sobre a importância do cumprimento das regras de trânsito para a segurança de todos os usuários das vias públicas.

Infração cometida: {DESCRICAO_INFRACAO}
Código da Infração: {CODIGO_INFRACAO}
Auto de Infração nº: {NUMERO_AUTO}

Recomenda-se especial atenção às normas de trânsito para evitar futuras infrações que poderão resultar em penalidades mais severas.

{CIDADE}, {DATA_ADVERTENCIA}

_________________________________
Autoridade de Trânsito
{ORGAO_AUTUADOR}',
    'leve',
    true
) ON CONFLICT DO NOTHING;

-- Atualizar comentário da tabela multas
COMMENT ON TABLE multas IS 'Tabela de multas com campos expandidos e funcionalidade para multas leves com advertência por escrito';