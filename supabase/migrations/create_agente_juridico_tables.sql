-- Migração para Sistema de Agente Jurídico Inteligente
-- Criação das tabelas para base de conhecimento e aprendizado contínuo

-- Tabela de perfis de usuário (estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos de conhecimento jurídico
CREATE TABLE public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('lei', 'jurisprudencia', 'recurso', 'doutrina')),
    file_path VARCHAR(1000),
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de embeddings dos documentos
CREATE TABLE public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    pinecone_id VARCHAR(255) UNIQUE NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de tags dos documentos
CREATE TABLE public.document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de recursos gerados pelo agente
CREATE TABLE public.generated_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    resource_text TEXT NOT NULL,
    infraction_type VARCHAR(200) NOT NULL,
    context_data JSONB,
    confidence_score DECIMAL(3,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'successful', 'failed')),
    ai_model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de links entre recursos e documentos de conhecimento
CREATE TABLE public.resource_knowledge_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.generated_resources(id) ON DELETE CASCADE,
    knowledge_document_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de feedback dos recursos
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES public.generated_resources(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('success', 'partial', 'failed')),
    feedback_text TEXT,
    improvement_suggestions TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_knowledge_documents_category ON public.knowledge_documents(category);
CREATE INDEX idx_knowledge_documents_success_rate ON public.knowledge_documents(success_rate DESC);
CREATE INDEX idx_knowledge_documents_created_at ON public.knowledge_documents(created_at DESC);
CREATE INDEX idx_knowledge_documents_is_validated ON public.knowledge_documents(is_validated);

CREATE INDEX idx_document_embeddings_document_id ON public.document_embeddings(document_id);
CREATE INDEX idx_document_embeddings_pinecone_id ON public.document_embeddings(pinecone_id);

CREATE INDEX idx_document_tags_document_id ON public.document_tags(document_id);
CREATE INDEX idx_document_tags_tag_name ON public.document_tags(tag_name);

CREATE INDEX idx_generated_resources_user_id ON public.generated_resources(user_id);
CREATE INDEX idx_generated_resources_infraction_type ON public.generated_resources(infraction_type);
CREATE INDEX idx_generated_resources_status ON public.generated_resources(status);
CREATE INDEX idx_generated_resources_created_at ON public.generated_resources(created_at DESC);

CREATE INDEX idx_resource_knowledge_links_resource_id ON public.resource_knowledge_links(resource_id);
CREATE INDEX idx_resource_knowledge_links_knowledge_document_id ON public.resource_knowledge_links(knowledge_document_id);
CREATE INDEX idx_resource_knowledge_links_similarity_score ON public.resource_knowledge_links(similarity_score DESC);

CREATE INDEX idx_feedback_resource_id ON public.feedback(resource_id);
CREATE INDEX idx_feedback_outcome ON public.feedback(outcome);
CREATE INDEX idx_feedback_rating ON public.feedback(rating DESC);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para knowledge_documents
CREATE POLICY "Public documents are viewable by all" ON public.knowledge_documents
    FOR SELECT USING (is_validated = true);
CREATE POLICY "Users can view own documents" ON public.knowledge_documents
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.knowledge_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.knowledge_documents
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can validate documents" ON public.knowledge_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'expert')
        )
    );

-- Políticas RLS para document_embeddings
CREATE POLICY "Embeddings follow document access" ON public.document_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_documents kd 
            WHERE kd.id = document_id 
            AND (kd.is_validated = true OR kd.user_id = auth.uid())
        )
    );

-- Políticas RLS para document_tags
CREATE POLICY "Tags follow document access" ON public.document_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.knowledge_documents kd 
            WHERE kd.id = document_id 
            AND (kd.is_validated = true OR kd.user_id = auth.uid())
        )
    );

-- Políticas RLS para generated_resources
CREATE POLICY "Users can view own resources" ON public.generated_resources
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resources" ON public.generated_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources" ON public.generated_resources
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para resource_knowledge_links
CREATE POLICY "Links follow resource access" ON public.resource_knowledge_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.generated_resources gr 
            WHERE gr.id = resource_id AND gr.user_id = auth.uid()
        )
    );

-- Políticas RLS para feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Dados iniciais para teste
INSERT INTO public.knowledge_documents (title, content, category, is_validated, success_rate, user_id)
VALUES 
    ('CTB Art. 165 - Dirigir sob influência de álcool', 
     'Art. 165. Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência: Infração - gravíssima; Penalidade - multa (dez vezes) e suspensão do direito de dirigir por 12 (doze) meses; Medida administrativa - retenção do veículo até a apresentação de condutor habilitado e recolhimento do documento de habilitação.', 
     'lei', true, 0.85, NULL),
    ('Modelo de Recurso - Excesso de Velocidade', 
     'EXCELENTÍSSIMO SENHOR DIRETOR DO DETRAN... Venho, respeitosamente, interpor RECURSO DE PRIMEIRA INSTÂNCIA contra o Auto de Infração nº [NÚMERO], lavrado em [DATA], por suposta infração ao art. 218 do CTB...', 
     'recurso', true, 0.75, NULL),
    ('Jurisprudência STJ - Recurso Especial sobre Velocidade', 
     'RECURSO ESPECIAL. DIREITO ADMINISTRATIVO. MULTA DE TRÂNSITO. EXCESSO DE VELOCIDADE. EQUIPAMENTO DE MEDIÇÃO NÃO AFERIDO. NULIDADE. A ausência de aferição do equipamento de medição de velocidade torna nula a autuação...', 
     'jurisprudencia', true, 0.90, NULL);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_documents_updated_at BEFORE UPDATE ON public.knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_resources_updated_at BEFORE UPDATE ON public.generated_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE public.user_profiles IS 'Perfis de usuário com roles para controle de acesso';
COMMENT ON TABLE public.knowledge_documents IS 'Base de conhecimento jurídico com leis, jurisprudências e recursos';
COMMENT ON TABLE public.document_embeddings IS 'Embeddings dos documentos para busca semântica';
COMMENT ON TABLE public.document_tags IS 'Tags para categorização e busca de documentos';
COMMENT ON TABLE public.generated_resources IS 'Recursos gerados pelo agente IA';
COMMENT ON TABLE public.resource_knowledge_links IS 'Links entre recursos gerados e documentos de conhecimento utilizados';
COMMENT ON TABLE public.feedback IS 'Feedback dos usuários sobre eficácia dos recursos gerados';

-- Grants para roles anônimos e autenticados
GRANT SELECT ON public.knowledge_documents TO anon;
GRANT SELECT ON public.knowledge_documents TO authenticated;
GRANT ALL PRIVILEGES ON public.knowledge_documents TO authenticated;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.user_profiles TO authenticated;

GRANT SELECT ON public.document_embeddings TO authenticated;
GRANT ALL PRIVILEGES ON public.document_embeddings TO authenticated;

GRANT SELECT ON public.document_tags TO authenticated;
GRANT ALL PRIVILEGES ON public.document_tags TO authenticated;

GRANT SELECT ON public.generated_resources TO authenticated;
GRANT ALL PRIVILEGES ON public.generated_resources TO authenticated;

GRANT SELECT ON public.resource_knowledge_links TO authenticated;
GRANT ALL PRIVILEGES ON public.resource_knowledge_links TO authenticated;

GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL PRIVILEGES ON public.feedback TO authenticated;