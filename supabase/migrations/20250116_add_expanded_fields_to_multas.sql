-- Migração para adicionar campos expandidos na tabela multas
-- Adiciona os 18 novos campos extraídos pelo OCR expandido

-- Adicionar campos de dados do equipamento
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS numero_equipamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS tipo_equipamento VARCHAR(100),
ADD COLUMN IF NOT EXISTS localizacao_equipamento TEXT,
ADD COLUMN IF NOT EXISTS velocidade_permitida VARCHAR(20),
ADD COLUMN IF NOT EXISTS velocidade_aferida VARCHAR(20);

-- Adicionar campos de dados do proprietário
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS nome_proprietario VARCHAR(255),
ADD COLUMN IF NOT EXISTS cpf_cnpj_proprietario VARCHAR(18),
ADD COLUMN IF NOT EXISTS endereco_proprietario TEXT;

-- Adicionar campos de observações detalhadas
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT,
ADD COLUMN IF NOT EXISTS observacoes_condutor TEXT,
ADD COLUMN IF NOT EXISTS observacoes_veiculo TEXT,
ADD COLUMN IF NOT EXISTS mensagem_senatran TEXT;

-- Adicionar campos de registro fotográfico
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS transcricao_registro_fotografico TEXT,
ADD COLUMN IF NOT EXISTS motivo_nao_abordagem TEXT;

-- Adicionar campos de dados do equipamento e notificação
ALTER TABLE multas 
ADD COLUMN IF NOT EXISTS dados_equipamento TEXT,
ADD COLUMN IF NOT EXISTS notificacao_autuacao TEXT;

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN multas.numero_equipamento IS 'Número do equipamento de fiscalização';
COMMENT ON COLUMN multas.tipo_equipamento IS 'Tipo do equipamento utilizado na autuação';
COMMENT ON COLUMN multas.localizacao_equipamento IS 'Localização específica do equipamento';
COMMENT ON COLUMN multas.velocidade_permitida IS 'Velocidade permitida no local';
COMMENT ON COLUMN multas.velocidade_aferida IS 'Velocidade aferida pelo equipamento';
COMMENT ON COLUMN multas.nome_proprietario IS 'Nome do proprietário do veículo';
COMMENT ON COLUMN multas.cpf_cnpj_proprietario IS 'CPF ou CNPJ do proprietário';
COMMENT ON COLUMN multas.endereco_proprietario IS 'Endereço completo do proprietário';
COMMENT ON COLUMN multas.observacoes_gerais IS 'Observações gerais sobre a autuação';
COMMENT ON COLUMN multas.observacoes_condutor IS 'Observações específicas sobre o condutor';
COMMENT ON COLUMN multas.observacoes_veiculo IS 'Observações específicas sobre o veículo';
COMMENT ON COLUMN multas.mensagem_senatran IS 'Mensagem do sistema Senatran';
COMMENT ON COLUMN multas.transcricao_registro_fotografico IS 'Transcrição do registro fotográfico';
COMMENT ON COLUMN multas.motivo_nao_abordagem IS 'Motivo da não abordagem do condutor';
COMMENT ON COLUMN multas.dados_equipamento IS 'Dados técnicos do equipamento';
COMMENT ON COLUMN multas.notificacao_autuacao IS 'Informações da notificação de autuação';

-- Criar índices para campos que podem ser consultados frequentemente
CREATE INDEX IF NOT EXISTS idx_multas_numero_equipamento ON multas(numero_equipamento);
CREATE INDEX IF NOT EXISTS idx_multas_cpf_cnpj_proprietario ON multas(cpf_cnpj_proprietario);
CREATE INDEX IF NOT EXISTS idx_multas_nome_proprietario ON multas(nome_proprietario);

-- Atualizar comentário da tabela
COMMENT ON TABLE multas IS 'Tabela de multas com campos expandidos para dados detalhados extraídos por OCR';