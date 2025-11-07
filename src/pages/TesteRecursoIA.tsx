import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, MessageCircle, Eye, User, MapPin, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import DataExtraction from '../components/DataExtraction';
import RecursoPreview from '../components/RecursoPreview';
import GeminiOcrService from '../services/geminiOcrService';
import { multasService } from '../services/multasService';
import { chatService } from '../services/chatService';
import { multaLeveService, type MultaLeveAnalysis } from '../services/multaLeveService';
import AdvertenciaEscrita from '../components/AdvertenciaEscrita';
import recursosGeradosService, { type RecursoGeradoInsert } from '../services/recursosGeradosService';
import { recursosIniciadosService } from '../services/recursosIniciadosService';
import RecursosGerados from '../components/RecursosGerados';
import RecursosIniciados from '../components/RecursosIniciados';
import { useAuthStore } from '../stores/authStore';

// Função auxiliar para gerar UUIDs válidos
const generateValidUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para gerar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Função auxiliar para validar e obter UUID válido
const getValidUUID = (value: string | undefined | null, fallbackLabel: string): string => {
  if (value && value !== 'client-id-placeholder' && value !== 'company-id-placeholder' && value !== 'user-id-placeholder') {
    // Validar se é um UUID válido (formato básico)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      console.log(`✅ UUID válido encontrado para ${fallbackLabel}:`, value);
      return value;
    }
  }
  
  const newUUID = generateValidUUID();
  console.log(`🆔 UUID gerado para ${fallbackLabel}:`, newUUID);
  return newUUID;
};

// Função para buscar um company_id existente no banco
const getExistingCompanyId = async (): Promise<string | null> => {
  try {
    console.log('🔍 === BUSCANDO COMPANY_ID EXISTENTE (DEBUG) ===');
    
    const { supabase } = await import('../lib/supabase');
    
    // Buscar qualquer company (remover filtro de status se necessário)
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, nome, status')
      .limit(5);
    
    console.log('📋 Query executada - companies encontradas:', companies?.length || 0);
    console.log('❌ Erro na query:', error);
    
    if (error) {
      console.error('❌ Erro detalhado:', error);
      return null;
    }
    
    if (companies && companies.length > 0) {
      // Preferir companies ativas, mas aceitar qualquer uma se necessário
      const activeCompany = companies.find(c => c.status === 'ativo');
      const companyToUse = activeCompany || companies[0];
      
      console.log('✅ Company selecionada:', companyToUse);
      return companyToUse.id;
    }
    
    console.log('⚠️ Nenhuma company encontrada');
    return null;
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar company_id:', error);
    return null;
  }
};

// Função para buscar um client_id existente no banco
const getExistingClientId = async (): Promise<string | null> => {
  try {
    console.log('🔍 Buscando client_id existente no banco...');
    
    // Importar supabase client
    const { supabase } = await import('../lib/supabase');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id')
      .eq('status', 'ativo')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar clients:', error);
      // Tentar criar client de teste
      const companyId = await getExistingCompanyId();
      if (companyId) {
        return await createTestClient(companyId);
      }
      return null;
    }
    
    if (clients && clients.length > 0) {
      const clientId = clients[0].id;
      console.log('✅ Client_id existente encontrado:', clientId);
      return clientId;
    }
    
    console.log('⚠️ Nenhum client encontrado no banco, criando um de teste...');
    const companyId = await getExistingCompanyId();
    if (companyId) {
      return await createTestClient(companyId);
    }
    return null;
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar client_id existente:', error);
    return null;
  }
};

// Função para criar uma company de teste
const createTestCompany = async (): Promise<string | null> => {
  try {
    console.log('🆕 Criando company de teste...');
    
    const { supabase } = await import('../lib/supabase');
    
    // Primeiro, verificar se existe companies_master
    const { data: masterCompanies } = await supabase
      .from('companies_master')
      .select('id')
      .limit(1);
    
    let masterCompanyId = masterCompanies?.[0]?.id;
    
    if (!masterCompanyId) {
      // Criar companies_master se não existir
      const { data: newMaster, error: masterError } = await supabase
        .from('companies_master')
        .insert({
          nome: 'Empresa Master Teste',
          email: 'master@teste.com',
          telefone: '(11) 99999-9999',
          endereco: 'Endereço Master Teste'
        })
        .select('id')
        .single();
      
      if (masterError) {
        console.error('❌ Erro ao criar companies_master:', masterError);
        return generateValidUUID(); // Fallback para UUID gerado
      }
      
      masterCompanyId = newMaster.id;
    }
    
    // Verificar se existe plano
    const { data: plans } = await supabase
      .from('plans')
      .select('id')
      .limit(1);
    
    let planId = plans?.[0]?.id;
    
    if (!planId) {
      // Usar um UUID padrão para plano se não existir
      planId = generateValidUUID();
    }
    
    // Criar company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        master_company_id: masterCompanyId,
        plan_id: planId,
        nome: 'Empresa Teste LTDA',
        cnpj: '12.345.678/0001-90',
        email: 'empresa@teste.com',
        telefone: '(11) 88888-8888',
        endereco: 'Rua Teste, 123',
        data_inicio_assinatura: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (companyError) {
      console.error('❌ Erro ao criar company:', companyError);
      return generateValidUUID(); // Fallback para UUID gerado
    }
    
    console.log('✅ Company de teste criada:', newCompany.id);
    return newCompany.id;
    
  } catch (error: any) {
    console.error('❌ Erro ao criar company de teste:', error);
    return generateValidUUID(); // Fallback para UUID gerado
  }
};

// Função para criar um client de teste
const createTestClient = async (companyId: string): Promise<string | null> => {
  try {
    console.log('🆕 Criando client de teste...');
    
    const { supabase } = await import('../lib/supabase');
    
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        company_id: companyId,
        nome: 'Cliente Teste',
        cpf_cnpj: '123.456.789-00',
        email: 'cliente@teste.com',
        telefone: '(11) 77777-7777',
        endereco: 'Rua Cliente, 456',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar client:', error);
      return generateValidUUID(); // Fallback para UUID gerado
    }
    
    console.log('✅ Client de teste criado:', newClient.id);
    return newClient.id;
    
  } catch (error: any) {
    console.error('❌ Erro ao criar client de teste:', error);
    return generateValidUUID(); // Fallback para UUID gerado
  }
};

// Função para criar um cliente padrão se necessário
const createDefaultClient = async (companyId: string, clienteInfo: any): Promise<string | null> => {
  try {
    console.log('🆕 Criando cliente padrão...');
    
    // Importar supabase client
    const { supabase } = await import('../lib/supabase');
    
    // Usar dados do clienteInfo se disponível, senão usar dados padrão
    const newClientData = {
      nome: clienteInfo?.nome || 'Cliente Padrão',
      cpf_cnpj: clienteInfo?.cpf_cnpj || '00000000000',
      email: clienteInfo?.email || 'cliente@exemplo.com',
      telefone: clienteInfo?.telefone || '(00) 00000-0000',
      endereco: clienteInfo?.endereco || 'Endereço não informado',
      cidade: clienteInfo?.cidade || 'Cidade não informada',
      estado: clienteInfo?.estado || 'SP',
      cep: clienteInfo?.cep || '00000-000',
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

  // Função pollForN8nResponse movida para dentro do componente

  // Função removida - será definida dentro do componente
    
    console.log('📋 Dados do cliente padrão a ser criado:', newClientData);
    
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([newClientData])
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar cliente padrão:', error);
      return null;
    }
    
    console.log('✅ Cliente padrão criado com ID:', newClient.id);
    return newClient.id;
    
  } catch (error: any) {
    console.error('❌ Erro ao criar cliente padrão:', error);
    return null;
  }
};

interface MultaData {
  // Dados básicos
  numero?: string;
  infracao?: string;
  codigoInfracao?: string;
  local?: string;
  data?: string;
  valor?: string;
  veiculo?: string;
  condutor?: string;
  orgaoAutuador?: string;
  pontos?: string;
  observacoes?: string;
  
  // Dados do equipamento
  numeroEquipamento?: string;
  tipoEquipamento?: string;
  localizacaoEquipamento?: string;
  velocidadePermitida?: string;
  velocidadeAferida?: string;
  
  // Dados do proprietário
  nomeProprietario?: string;
  cpfCnpjProprietario?: string;
  enderecoProprietario?: string;
  
  // Observações detalhadas
  observacoesGerais?: string;
  observacoesCondutor?: string;
  observacoesVeiculo?: string;
  mensagemSenatran?: string;
  
  // Registro fotográfico
  transcricaoRegistroFotografico?: string;
  motivoNaoAbordagem?: string;
  
  // Dados do equipamento e notificação
  dadosEquipamento?: string;
  notificacaoAutuacao?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const TesteRecursoIA: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<'upload' | 'extraction' | 'recurso'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [multaData, setMultaData] = useState<MultaData>({});
  const [recursoText, setRecursoText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [multaId, setMultaId] = useState<string | null>(null);
  const [n8nChatMessages, setN8nChatMessages] = useState<ChatMessage[]>([]);
  const [n8nChatActive, setN8nChatActive] = useState(false);
  const [n8nInputValue, setN8nInputValue] = useState('');
  const [isN8nLoading, setIsN8nLoading] = useState(false);
  const [isProcessLocked, setIsProcessLocked] = useState(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [isDadosExtraidosOpen, setIsDadosExtraidosOpen] = useState(false); // Por padrão minimizado
  const [isUploadOpen, setIsUploadOpen] = useState(false); // Por padrão minimizado
  const [clienteData, setClienteData] = useState<{
    nome: string;
    cpf_cnpj: string;
    endereco: string;
    email: string;
    telefone: string;
    payment_id: string;
    amount_paid: string;
    multa_type: string;
    service_order_id?: string;
    cliente_id?: string;
  } | null>(null);
  
  // Estados para funcionalidade de multa leve
  const [analiseMultaLeve, setAnaliseMultaLeve] = useState<MultaLeveAnalysis | null>(null);
  const [showAdvertencia, setShowAdvertencia] = useState(false);
  
  // Estados para recursos gerados
  const [recursosGerados, setRecursosGerados] = useState<any[]>([]);
  const [showRecursosGerados, setShowRecursosGerados] = useState(false);
  
  // Ref para o container do chat para scroll automático
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Função para scroll automático do chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };
  
  // useEffect para scroll automático quando mensagens mudam
  useEffect(() => {
    scrollToBottom();
  }, [n8nChatMessages, isN8nLoading]);
  
  // useEffect para polling de recursos gerados
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    
    if (multaId && chatSessionId) {
      pollingInterval = setInterval(async () => {
        try {
          // Verificar se há novos recursos gerados
          const { supabase } = await import('../lib/supabase');
          const { data: recursos, error } = await supabase
            .from('recursos_gerados')
            .select('*')
            .eq('multa_id', multaId)
            .order('created_at', { ascending: false });
            
          if (!error && recursos && recursos.length > recursosGerados.length) {
            setRecursosGerados(recursos);
            // Mostrar notificação quando novo recurso for gerado
            if (recursos.length > recursosGerados.length) {
              toast.success('Novo recurso foi gerado automaticamente!');
            }
          }
        } catch (error) {
          console.error('Erro no polling de recursos:', error);
        }
      }, 5000); // Verificar a cada 5 segundos
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [multaId, chatSessionId, recursosGerados.length]);

  // Carregar histórico de mensagens do banco quando chatSessionId é definido
  // Debug: Monitor de estado do chat
  useEffect(() => {
    console.log('🔄 Estado do chat mudou:', {
      n8nChatActive,
      messagesCount: n8nChatMessages.length,
      multaId,
      chatSessionId
    });
  }, [n8nChatActive, n8nChatMessages.length, multaId, chatSessionId]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (chatSessionId) {
        try {
          console.log('📚 === CARREGANDO HISTÓRICO DO CHAT ===');
          console.log('🆔 Session ID:', chatSessionId);
          
          const messages = await chatService.getMessages(chatSessionId);
          console.log('📋 Mensagens carregadas do banco:', messages);
          
          if (messages && messages.length > 0) {
            // Converter mensagens do banco para o formato do chat
            const chatMessages: ChatMessage[] = messages.map(msg => ({
              id: msg.id,
              type: msg.message_type === 'user' ? 'user' : 'ai',
              content: msg.content,
              timestamp: new Date(msg.created_at)
            }));
            
            console.log('✅ Mensagens convertidas:', chatMessages);
            setN8nChatMessages(chatMessages);
            
            toast.success(`Histórico carregado: ${messages.length} mensagens recuperadas`);
          } else {
            console.log('ℹ️ Nenhuma mensagem encontrada no histórico');
          }
        } catch (error: any) {
          console.error('❌ Erro ao carregar histórico do chat:', error);
          toast.error('Erro ao carregar histórico do chat: ' + error.message);
        }
      }
    };
    
    loadChatHistory();
  }, [chatSessionId]);

  // Buscar histórico do chat n8n quando multaId é definido
  useEffect(() => {
    const loadExistingSession = async () => {
      if (multaId && !chatSessionId) {
        try {
          console.log('🔍 Carregando histórico do chat para multaId:', multaId);
          
          // Importar o serviço n8n dinamicamente
          const { loadN8nChatHistory } = await import('../services/n8nChatService');
          
          // Buscar histórico do chat n8n
          const chatHistory = await loadN8nChatHistory(multaId);
          
          if (chatHistory.messages.length > 0) {
            console.log('✅ Chat histórico carregado:', chatHistory.messages.length, 'mensagens');
            
            // Restaurar mensagens do chat
            setN8nChatMessages(chatHistory.messages);
            setN8nChatActive(true);
            
            // Se temos session_id, tentar encontrar a sessão correspondente
            if (chatHistory.sessionId) {
              const companyId = user?.company_id || await getExistingCompanyId();
              if (companyId) {
                const sessions = await chatService.getSessionsByCompany(companyId, 10);
                const existingSession = sessions.find(session => 
                  session.session_id === chatHistory.sessionId || session.multa_id === multaId
                );
                
                if (existingSession) {
                  setChatSessionId(existingSession.id);
                }
              }
            }
            
            toast.success(`Histórico do chat recuperado! ${chatHistory.messages.length} mensagens carregadas.`);
            
          } else {
            console.log('ℹ️ Nenhuma mensagem encontrada - tentando sessão tradicional...');
            
            // Fallback: buscar sessão tradicional
            const companyId = user?.company_id || await getExistingCompanyId();
            if (companyId) {
              const sessions = await chatService.getSessionsByCompany(companyId, 10);
              const existingSession = sessions.find(session => 
                session.multa_id === multaId && session.status === 'active'
              );
              
              if (existingSession) {
                setChatSessionId(existingSession.id);
                setN8nChatActive(true);
                toast.success('Sessão de chat anterior recuperada!');
              }
            }
          }
        } catch (error: any) {
          console.error('❌ Erro ao buscar histórico do chat:', error);
        }
      } else {
        console.log('ℹ️ Condições não atendidas para busca de histórico:');
        console.log('  - multaId:', multaId);
        console.log('  - chatSessionId:', chatSessionId);
      }
    };
    
    loadExistingSession();
  }, [multaId, chatSessionId]);

  // Função para limpar o texto do recurso removendo elementos extras
  const cleanRecursoText = (rawText: string): string => {
    let cleanedText = rawText;
    
    // Remover marcadores [RECURSO GERADO]
    cleanedText = cleanedText.replace(/\[RECURSO GERADO\]/g, '');
    
    // Remover símbolos especiais no início das linhas
    cleanedText = cleanedText.replace(/^[✕×✗]\s*/gm, '');
    
    // Remover comentários explicativos da IA no início
    cleanedText = cleanedText.replace(/^(Claro|Vou|Posso|Caso queira).*$/gm, '');
    
    // Remover linhas com traços separadores
    cleanedText = cleanedText.replace(/^\s*---\s*$/gm, '');
    
    // Remover perguntas no final (padrão: "Caso queira...Deseja?")
    cleanedText = cleanedText.replace(/Caso queira.*?Deseja\?/gs, '');
    
    // Remover outras perguntas comuns no final
    cleanedText = cleanedText.replace(/Deseja que.*?\?/gs, '');
    cleanedText = cleanedText.replace(/Precisa de.*?\?/gs, '');
    
    // Limpar linhas vazias excessivas
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Extrair apenas o conteúdo formal do recurso
    const lines = cleanedText.split('\n');
    let startIndex = -1;
    let endIndex = -1;
    
    // Procurar início do recurso (À, Autoridade, etc.)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('À') || line.includes('Autoridade') || line.includes('Ref.:') || line.includes('Requerente:')) {
        startIndex = i;
        break;
      }
    }
    
    // Procurar fim do recurso (Pede deferimento, assinatura, etc.)
    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Pede deferimento') || line.includes('Termos em que') || 
            (line.length > 10 && /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/.test(line))) {
          // Incluir mais algumas linhas após "Pede deferimento" para capturar assinatura
          endIndex = Math.min(i + 4, lines.length);
          break;
        }
      }
    }
    
    // Se encontrou início e fim, extrair apenas essa parte
    if (startIndex !== -1) {
      const finalEndIndex = endIndex !== -1 ? endIndex : lines.length;
      cleanedText = lines.slice(startIndex, finalEndIndex).join('\n');
    }
    
    // Limpeza final
    cleanedText = cleanedText.trim();
    
    // Remover linhas vazias no início e fim
    cleanedText = cleanedText.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
    
    return cleanedText;
  };

  // Função para detectar e salvar recursos gerados pelo n8n
  const detectarESalvarRecurso = async (responseContent: string, sessionId: string, multaIdParam: string) => {
    try {
      console.log('🔍 === INICIANDO DETECÇÃO DE RECURSO ===');
      console.log('📝 Conteúdo recebido (primeiros 100 chars):', responseContent.substring(0, 100));
      
      // Verificar se a resposta contém um recurso (apenas indicador específico)
      const indicadoresRecurso = [
        '[RECURSO GERADO]'  // APENAS este indicador exato
      ];
      
      const responseUpper = responseContent.toUpperCase();
      const indicadoresEncontrados = indicadoresRecurso.filter(indicador => 
        responseUpper.includes(indicador.toUpperCase())
      );
      
      console.log('🔍 Indicadores encontrados:', indicadoresEncontrados);
      
      const contemRecurso = indicadoresEncontrados.length > 0;
      
      // Verificar se tem estrutura de recurso (mais de 200 caracteres e contém indicadores)
      const isRecurso = contemRecurso && responseContent.length > 200;
      
      console.log('📊 Resultado da detecção:', {
        contemRecurso,
        tamanhoConteudo: responseContent.length,
        isRecurso,
        indicadoresEncontrados
      });
      
      if (isRecurso) {
        console.log('🎯 === RECURSO DETECTADO NA RESPOSTA N8N ===');
        console.log('📝 Conteúdo:', responseContent.substring(0, 200) + '...');
        console.log('🏷️ Indicadores que ativaram a detecção:', indicadoresEncontrados);
        
        // Limpar o conteúdo do recurso removendo elementos extras
        const conteudoLimpo = cleanRecursoText(responseContent);
        console.log('🧹 Conteúdo limpo (primeiros 200 chars):', conteudoLimpo.substring(0, 200));
        
        // Extrair informações do recurso usando o conteúdo limpo
        const infoRecurso = recursosGeradosService.extrairInformacoesRecurso(conteudoLimpo);
        console.log('📋 Informações extraídas:', infoRecurso);
        
        // Obter dados do usuário e empresa
        const companyId = user?.company_id || await getExistingCompanyId();
        const userId = user?.id;
        
        // Validar se temos dados obrigatórios
        if (!companyId || !userId) {
          console.error('❌ Dados obrigatórios não encontrados:', { companyId, userId, user });
          toast.error('Erro: Usuário não autenticado ou dados da empresa não encontrados');
          return null;
        }
        
        console.log('👤 Dados do usuário autenticado:', {
          userId,
          companyId,
          userEmail: user?.email
        });
        
        // Preparar dados para salvamento
        const recursoData: RecursoGeradoInsert = {
          company_id: companyId,
          user_id: userId,
          multa_id: multaIdParam,
          chat_session_id: sessionId,
          titulo: infoRecurso.titulo,
          conteudo_recurso: infoRecurso.conteudo,
          fundamentacao_legal: infoRecurso.fundamentacao,
          argumentos_principais: infoRecurso.argumentos,
          tipo_recurso: infoRecurso.tipo,
          status: 'gerado',
          metadata: {
            source: 'n8n_webhook',
            detectedAt: new Date().toISOString(),
            multaData: multaData,
            clienteData: clienteData
          }
        };
        
        console.log('💾 Salvando recurso gerado:', recursoData);
        
        // Salvar no banco de dados
        const recursoSalvo = await recursosGeradosService.salvarRecurso(recursoData);
        
        if (recursoSalvo) {
          console.log('✅ Recurso salvo com sucesso:', recursoSalvo.id);
          
          // Recurso salvo com sucesso - lista será atualizada automaticamente pelo componente RecursosGerados
          console.log('✅ Recurso salvo e será exibido na lista de recursos gerados');
          
          // Mostrar notificação de sucesso
          toast.success('🎉 Recurso detectado e salvo automaticamente!');
          
          return recursoSalvo;
        }
      } else {
        console.log('ℹ️ === RECURSO NÃO DETECTADO ===');
        console.log('❌ Motivos possíveis:');
        if (!contemRecurso) {
          console.log('  - Nenhum indicador encontrado no conteúdo');
          console.log('  - Indicadores procurados:', indicadoresRecurso);
        }
        if (responseContent.length <= 200) {
          console.log('  - Conteúdo muito curto:', responseContent.length, 'caracteres (mínimo: 200)');
        }
        console.log('📝 Conteúdo completo da resposta:', responseContent);
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao detectar/salvar recurso:', error);
      toast.error('Erro ao salvar recurso detectado: ' + error.message);
      return null;
    }
  };

  // Função para fazer polling da resposta do n8n
  const pollForN8nResponse = async (webhookData: any, type: 'initial' | 'message', maxAttempts: number = 10) => {
    console.log(`🔄 === INICIANDO POLLING PARA RESPOSTA N8N (${type.toUpperCase()}) ===`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxAttempts} - Aguardando resposta...`);
        
        // Aguardar um tempo antes de cada tentativa
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Aumentar o tempo a cada tentativa
        
        // Fazer nova requisição para verificar se há resposta
        const response = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...webhookData,
            action: 'check_response', // Indicar que é uma verificação
            attempt: attempt,
            company_id: user?.company_id || await getExistingCompanyId()
          })
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Tentativa ${attempt} falhou:`, response.status);
          continue;
        }
        
        const webhookResponse = await response.json();
        console.log(`📋 Resposta da tentativa ${attempt}:`, webhookResponse);
        
        // Verificar se recebemos uma resposta real (não apenas "Workflow was started")
        const isRealResponse = webhookResponse?.message !== 'Workflow was started' && 
                              (Array.isArray(webhookResponse) || 
                               (webhookResponse?.response && webhookResponse.response.length > 50));
        
        if (isRealResponse) {
          console.log(`✅ === RESPOSTA REAL RECEBIDA NA TENTATIVA ${attempt} ===`);
          
          // Processar resposta real
          let responseContent = '';
          if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
            const firstItem = webhookResponse[0];
            responseContent = firstItem.response || firstItem.message || JSON.stringify(firstItem);
          } else if (webhookResponse?.response) {
            responseContent = webhookResponse.response;
          } else {
            responseContent = JSON.stringify(webhookResponse);
          }
          
          // Atualizar o chat com a resposta real
          if (type === 'initial') {
            // Atualizar mensagem inicial
            setN8nChatMessages(prev => {
              const updated = [...prev];
              if (updated.length > 1) {
                updated[1] = {
                  ...updated[1],
                  content: responseContent,
                  timestamp: new Date()
                };
              }
              return updated;
            });
          } else {
            // Adicionar nova mensagem para mensagens subsequentes
            const aiMessage: ChatMessage = {
              id: `n8n_ai_${Date.now()}`,
              type: 'ai',
              content: responseContent,
              timestamp: new Date()
            };
            setN8nChatMessages(prev => [...prev, aiMessage]);
          }
          
          // Salvar no banco de dados se temos sessão ativa
          if (chatSessionId) {
            try {
              await chatService.addMessage({
                chatSessionId: chatSessionId,
                messageType: 'assistant',
                content: responseContent,
                metadata: { 
                  source: `n8n_polling_${type}`,
                  attempt: attempt,
                  webhookResponse: webhookResponse,
                  timestamp: new Date().toISOString()
                }
              });
              
              console.log(`✅ Resposta do polling salva no banco (tentativa ${attempt})`);
              
              // Detectar e salvar recurso se presente
              console.log('🔍 === VERIFICANDO DETECÇÃO DE RECURSO NO POLLING ===');
              console.log('📋 Dados disponíveis:', {
                multaId: multaId,
                chatSessionId: chatSessionId,
                responseContentLength: responseContent.length,
                responsePreview: responseContent.substring(0, 100)
              });
              
              if (multaId) {
                console.log('✅ MultaId disponível, iniciando detecção...');
                try {
                  const recursoDetectado = await detectarESalvarRecurso(responseContent, chatSessionId, multaId);
                  if (recursoDetectado) {
                    console.log('🎯 === RECURSO DETECTADO E SALVO COM SUCESSO ===');
                    console.log('📋 Recurso salvo:', {
                      id: recursoDetectado.id,
                      titulo: recursoDetectado.titulo,
                      tipo: recursoDetectado.tipo_recurso
                    });
                    toast.success('🎯 Resposta da IA recebida e recurso detectado!');
                  } else {
                    console.log('ℹ️ Nenhum recurso detectado na resposta');
                    toast.success('✅ Resposta da IA recebida!');
                  }
                } catch (recursoError: any) {
                  console.error('❌ === ERRO AO DETECTAR RECURSO NO POLLING ===');
                  console.error('📋 Detalhes do erro:', recursoError);
                  console.error('📋 Stack trace:', recursoError.stack);
                  toast.success('✅ Resposta da IA recebida!');
                }
              } else {
                console.warn('⚠️ MultaId não disponível, pulando detecção de recurso');
                toast.success('✅ Resposta da IA recebida!');
              }
              
            } catch (saveError: any) {
              console.warn('⚠️ Erro ao salvar resposta do polling:', saveError);
              toast.success('✅ Resposta da IA recebida!');
            }
          }
          
          return; // Sucesso, sair do loop
        }
        
      } catch (error: any) {
        console.warn(`⚠️ Erro na tentativa ${attempt}:`, error.message);
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.warn(`❌ Polling falhou após ${maxAttempts} tentativas`);
    toast.warning('⏳ O sistema está processando sua solicitação. A resposta pode demorar alguns minutos.');
  };

  // Função para carregar recurso existente baseado no serviceOrderId
  const loadExistingRecurso = async (serviceOrderId: string) => {
    try {
      console.log('🔄 === CARREGANDO RECURSO EXISTENTE ===');
      console.log('🆔 Service Order ID:', serviceOrderId);
      
      const { supabase } = await import('../lib/supabase');
      
      // 1. Buscar service_order - primeiro tentar por UUID, depois por asaas_payment_id
      let serviceOrder = null;
      let serviceOrderError = null;
      
      // Verificar se é um UUID válido
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceOrderId);
      
      if (isUUID) {
        // Buscar por ID (UUID)
        const { data, error } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', serviceOrderId)
          .single();
        serviceOrder = data;
        serviceOrderError = error;
      } else {
        // Buscar por asaas_payment_id - pode haver múltiplos, pegar o mais recente com multa_id
        console.log('🔍 Buscando por asaas_payment_id:', serviceOrderId);
        const { data, error } = await supabase
          .from('service_orders')
          .select('*')
          .eq('asaas_payment_id', serviceOrderId)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          // Priorizar service_order que tem multa_id, senão pegar o mais recente
          serviceOrder = data.find(order => order.multa_id) || data[0];
          console.log(`✅ Encontrados ${data.length} service_orders, selecionado:`, {
            id: serviceOrder.id,
            multa_id: serviceOrder.multa_id,
            created_at: serviceOrder.created_at
          });
        } else {
          serviceOrderError = error;
        }
      }
      
      if (serviceOrderError || !serviceOrder) {
        console.error('❌ Erro ao buscar service_order:', serviceOrderError);
        throw new Error('Service order não encontrado');
      }
      
      console.log('✅ Service order encontrado:', serviceOrder);
      
      // 2. Buscar multa associada
      let multaAssociada = null;
      if (serviceOrder.multa_id) {
        const { data: multa, error: multaError } = await supabase
          .from('multas')
          .select('*')
          .eq('id', serviceOrder.multa_id)
          .single();
        
        if (!multaError && multa) {
          multaAssociada = multa;
          console.log('✅ Multa associada encontrada:', multa);
        }
      }
      
      // 2.5. Buscar recurso associado na tabela recursos
      let recursoAssociado = null;
      if (multaAssociada) {
        const { data: recurso, error: recursoError } = await supabase
          .from('recursos')
          .select('*')
          .eq('multa_id', multaAssociada.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!recursoError && recurso) {
          recursoAssociado = recurso;
          console.log('✅ Recurso associado encontrado:', recurso);
          toast.success(`📄 Recurso existente encontrado: ${recurso.titulo}`);
        } else {
          console.log('ℹ️ Nenhum recurso encontrado para esta multa');
        }
      }
      
      // 3. Buscar sessão de chat ativa
       let chatSession = null;
       if (multaAssociada && serviceOrder.company_id) {
         try {
           console.log('🔍 Buscando sessões de chat para company_id:', serviceOrder.company_id);
           const sessions = await chatService.getSessionsByCompany(serviceOrder.company_id, 50);
           chatSession = sessions.find(session => 
             session.multa_id === multaAssociada.id && session.status === 'active'
           );
           
           if (chatSession) {
             console.log('✅ Sessão de chat encontrada:', chatSession);
           } else {
             console.log('ℹ️ Nenhuma sessão de chat ativa encontrada para esta multa');
           }
         } catch (chatError) {
           console.warn('⚠️ Erro ao buscar sessão de chat:', chatError);
         }
       }
      
      // 4. Restaurar estados dos componentes
      let multaDataRestaurada: MultaData | null = null;
      
      if (multaAssociada) {
        // Mapear dados da multa para o formato MultaData
        multaDataRestaurada = {
          numero: multaAssociada.numero_auto || '',
          infracao: multaAssociada.descricao_infracao || '',
          codigoInfracao: multaAssociada.codigo_infracao || '',
          local: multaAssociada.local_infracao || '',
          data: multaAssociada.data_infracao || '',
          valor: multaAssociada.valor_multa ? `R$ ${multaAssociada.valor_multa.toFixed(2).replace('.', ',')}` : '',
          veiculo: multaAssociada.placa_veiculo || '',
          condutor: multaAssociada.condutor || '',
          orgaoAutuador: multaAssociada.orgao_autuador || '',
          pontos: multaAssociada.pontos?.toString() || '',
          observacoes: multaAssociada.observacoes || '',
          
          // Dados do equipamento
          numeroEquipamento: multaAssociada.numero_equipamento || '',
          tipoEquipamento: multaAssociada.tipo_equipamento || '',
          localizacaoEquipamento: multaAssociada.local_infracao || '',
          velocidadePermitida: multaAssociada.velocidade_permitida?.toString() || '',
          velocidadeAferida: multaAssociada.velocidade_aferida?.toString() || '',
          
          // Dados do proprietário
          nomeProprietario: multaAssociada.nome_proprietario || '',
          cpfCnpjProprietario: multaAssociada.cpf_cnpj_proprietario || '',
          enderecoProprietario: multaAssociada.endereco_proprietario || '',
          
          // Observações detalhadas
          observacoesGerais: multaAssociada.observacoes_completas || multaAssociada.observacoes || '',
          observacoesCondutor: multaAssociada.observacoes_condutor || '',
          observacoesVeiculo: multaAssociada.caracteristicas_veiculo || '',
          mensagemSenatran: multaAssociada.mensagem_senatran || '',
          
          // Registro fotográfico
          transcricaoRegistroFotografico: multaAssociada.descricao_foto || '',
          motivoNaoAbordagem: multaAssociada.motivo_nao_abordagem || '',
          
          // Dados do equipamento e notificação
          dadosEquipamento: multaAssociada.dados_equipamento || '',
          notificacaoAutuacao: multaAssociada.protocolo_notificacao || ''
        };
        
        console.log('📋 Dados da multa restaurados:', multaDataRestaurada);
        setMultaData(multaDataRestaurada);
        setMultaId(multaAssociada.id);
        setCurrentStep('extraction');
        
        // Marcar processo como bloqueado (já foi processado)
        setIsProcessLocked(true);
        
        toast.success('✅ Dados da multa restaurados com sucesso!');
      }
      
      // 5. Restaurar sessão de chat se existir
      if (chatSession) {
        setChatSessionId(chatSession.id);
        setN8nChatActive(true);
        
        // O histórico será carregado automaticamente pelo useEffect do chatSessionId
        toast.success('💬 Sessão de chat restaurada!');
      }
      
      // 6. Atualizar localStorage com o recurso encontrado
      if (recursoAssociado && multaAssociada) {
        const processData = {
          id: recursoAssociado.id,
          multaData: multaDataRestaurada,
          multaId: multaAssociada.id,
          recursoId: recursoAssociado.id,
          clienteData,
          timestamp: recursoAssociado.created_at,
          locked: true,
          status: recursoAssociado.status
        };
        
        setProcessId(recursoAssociado.id);
        localStorage.setItem('recurso_process', JSON.stringify(processData));
        console.log('💾 Processo restaurado no localStorage:', processData);
      }
      
      return {
        serviceOrder,
        multa: multaAssociada,
        recurso: recursoAssociado,
        chatSession
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar recurso existente:', error);
      toast.error(`Erro ao carregar recurso: ${error.message}`);
      return null;
    }
  };

  // Carregar dados do cliente dos parâmetros de URL e verificar se é continuação
  useEffect(() => {
    console.log('🔍 === VERIFICANDO PARÂMETROS DA URL ===');
    console.log('📋 Todos os parâmetros da URL:', Object.fromEntries(searchParams));
    
    // Novos parâmetros do CobrancaDetalhes
    const serviceOrderId = searchParams.get('serviceOrderId');
    const clienteId = searchParams.get('clienteId');
    const nome = searchParams.get('nome');
    const cpfCnpj = searchParams.get('cpfCnpj');
    const endereco = searchParams.get('endereco');
    
    // Parâmetros antigos (para compatibilidade)
    const clientName = searchParams.get('client_name');
    const clientCpf = searchParams.get('client_cpf');
    const clientEndereco = searchParams.get('client_endereco');
    const clientEmail = searchParams.get('client_email');
    const clientTelefone = searchParams.get('client_telefone');
    const paymentId = searchParams.get('payment_id');
    const amountPaid = searchParams.get('amount_paid');
    const multaType = searchParams.get('multa_type');

    console.log('📥 Parâmetros novos capturados:');
    console.log('  - serviceOrderId:', serviceOrderId);
    console.log('  - clienteId:', clienteId);
    console.log('  - nome:', nome);
    console.log('  - cpfCnpj:', cpfCnpj);
    console.log('  - endereco:', endereco);
    
    console.log('📥 Parâmetros antigos capturados:');
    console.log('  - clientName:', clientName);
    console.log('  - clientCpf:', clientCpf);
    console.log('  - clientEndereco:', clientEndereco);

    // Priorizar novos parâmetros, usar antigos como fallback
    const nomeCliente = nome || clientName;
    const cpfCliente = cpfCnpj || clientCpf;
    const enderecoCliente = endereco || clientEndereco;

    console.log('🔄 Dados finais após fallback:');
    console.log('  - nomeCliente:', nomeCliente);
    console.log('  - cpfCliente:', cpfCliente);
    console.log('  - enderecoCliente:', enderecoCliente);

    // Criar dados do cliente mesmo se alguns campos estiverem vazios
    if (nomeCliente || cpfCliente || serviceOrderId) {
      const dadosCliente = {
        nome: nomeCliente || 'Nome não informado',
        cpf_cnpj: cpfCliente || 'CPF/CNPJ não informado',
        endereco: enderecoCliente || 'Endereço não informado',
        email: clientEmail || 'Email não informado',
        telefone: clientTelefone || 'Telefone não informado',
        payment_id: paymentId || serviceOrderId || '',
        amount_paid: amountPaid || '0',
        multa_type: multaType || 'Não especificado',
        service_order_id: serviceOrderId || '',
        cliente_id: clienteId || ''
      };
      
      setClienteData(dadosCliente);
      
      console.log('✅ Dados do cliente definidos:', dadosCliente);
      
      toast.success(`Dados do cliente carregados: ${nomeCliente || 'Cliente'}`);
      
      // 🔄 VERIFICAR SE É CONTINUAÇÃO DE RECURSO EXISTENTE
      if (serviceOrderId) {
        console.log('🔄 === DETECTADO SERVICE ORDER ID - TENTANDO CARREGAR RECURSO EXISTENTE ===');
        loadExistingRecurso(serviceOrderId);
      }
    } else {
      console.log('⚠️ Nenhum dado de cliente encontrado nos parâmetros');
      toast.info('Nenhum dado de cliente foi enviado. Você pode prosseguir com o upload do documento.');
    }
  }, [searchParams]);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      // Verificar se a API do Gemini está configurada
      if (!GeminiOcrService.isConfigured()) {
        toast.error('API do Gemini não configurada. Verifique a variável VITE_GEMINI_API_KEY no arquivo .env');
        setIsProcessing(false);
        return;
      }
      
      toast.info('Iniciando extração de dados do documento...');
      
      // Criar instância do serviço Gemini OCR
      const geminiService = new GeminiOcrService();
      
      // Processar documento com Gemini OCR
      const dadosExtraidos = await geminiService.extrairDadosAutoInfracao(file);
      
      console.log('✅ Dados extraídos do documento:', dadosExtraidos);
      
      // Mapear dados do DocumentoProcessado para MultaData
      const multaDataMapeada: MultaData = {
        // Dados básicos
        numero: dadosExtraidos.numeroAuto || '',
        infracao: dadosExtraidos.descricaoInfracao || '',
        codigoInfracao: dadosExtraidos.codigoInfracao || '',
        local: dadosExtraidos.localInfracao || '',
        data: dadosExtraidos.dataInfracao || '',
        valor: dadosExtraidos.valorMulta ? `R$ ${dadosExtraidos.valorMulta.toFixed(2).replace('.', ',')}` : '',
        veiculo: dadosExtraidos.placaVeiculo || '',
        condutor: dadosExtraidos.condutor || '',
        orgaoAutuador: dadosExtraidos.orgaoAutuador || '',
        pontos: '', // Campo não disponível no DocumentoProcessado
        observacoes: dadosExtraidos.observacoes || '',
        
        // Dados do equipamento
        numeroEquipamento: dadosExtraidos.numeroEquipamento || '',
        tipoEquipamento: dadosExtraidos.tipoEquipamento || '',
        localizacaoEquipamento: dadosExtraidos.localInfracao || '', // Usar localInfracao como localização do equipamento
        velocidadePermitida: '', // Campo não disponível diretamente
        velocidadeAferida: '', // Campo não disponível diretamente
        
        // Dados do proprietário
        nomeProprietario: dadosExtraidos.nomeProprietario || '',
        cpfCnpjProprietario: dadosExtraidos.cpfCnpjProprietario || '',
        enderecoProprietario: '', // Campo não disponível diretamente
        
        // Observações detalhadas
        observacoesGerais: dadosExtraidos.observacoesCompletas || dadosExtraidos.observacoes || '',
        observacoesCondutor: '', // Campo não disponível diretamente
        observacoesVeiculo: dadosExtraidos.caracteristicasVeiculo || '',
        mensagemSenatran: dadosExtraidos.mensagemSenatran || '',
        
        // Registro fotográfico
        transcricaoRegistroFotografico: dadosExtraidos.descricaoFoto || '',
        motivoNaoAbordagem: dadosExtraidos.motivoNaoAbordagem || '',
        
        // Dados do equipamento e notificação
        dadosEquipamento: dadosExtraidos.dadosEquipamento || '',
        notificacaoAutuacao: dadosExtraidos.protocoloNotificacao || dadosExtraidos.codigoAcesso || ''
      };
      
      setMultaData(multaDataMapeada);
      setCurrentStep('extraction');
      
      // Salvar dados extraídos automaticamente no banco de dados
      console.log('💾 === SALVANDO DADOS NO BANCO ===');
      const multaSalva = await handleSaveMultaAutomatically(multaDataMapeada);
      
      if (multaSalva) {
        console.log('✅ Multa salva com UUID:', multaSalva.id);
        setMultaId(multaSalva.id);
        
        // Atualizar service_orders com multa_id se temos serviceOrderId
        if (clienteData?.service_order_id) {
          await updateServiceOrderWithMultaId(clienteData.service_order_id, multaSalva.id);
        }
        
        // Bloquear o processo após salvamento bem-sucedido
        setIsProcessLocked(true);
        
        // Salvar processo no localStorage como backup
        const newProcessId = `processo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setProcessId(newProcessId);
        
        localStorage.setItem('recurso_process', JSON.stringify({
          id: newProcessId,
          multaData: multaDataMapeada,
          multaId: multaSalva.id,
          clienteData,
          timestamp: new Date().toISOString(),
          locked: true
        }));
        
        // Criar registro do recurso na tabela recursos
        try {
          console.log('📝 Criando registro de recurso na tabela recursos...');
          const recursoSalvo = await createRecursoRecord(multaSalva, multaDataMapeada);
          
          // Atualizar localStorage com recurso_id
          if (recursoSalvo) {
            const savedProcess = localStorage.getItem('recurso_process');
            if (savedProcess) {
              const processData = JSON.parse(savedProcess);
              processData.recursoId = recursoSalvo.id;
              localStorage.setItem('recurso_process', JSON.stringify(processData));
            }
            
            // Vincular recurso_id ao service_order
            console.log('🔗 Tentando vincular recurso_id à service_order...');
            console.log('📋 clienteData:', clienteData);
            console.log('📋 service_order_id:', clienteData?.service_order_id);
            console.log('📋 recurso_id:', recursoSalvo.id);
            
            if (clienteData?.service_order_id) {
              await updateServiceOrderWithRecursoId(clienteData.service_order_id, recursoSalvo.id);
            } else {
              console.warn('⚠️ service_order_id não disponível em clienteData');
            }
          }
        } catch (recursoError) {
          console.error('⚠️ Erro ao criar registro de recurso:', recursoError);
          // Não bloquear o fluxo se falhar
        }
        
        toast.success(`Dados extraídos e salvos com sucesso! Multa ID: ${multaSalva.id}`);
        
        // 🚀 INICIAR CHAT N8N AUTOMATICAMENTE APÓS SALVAMENTO
        console.log('🚀 === INICIANDO CHAT N8N AUTOMATICAMENTE ===');
        try {
          // Mensagem inicial fixa
          const mensagemInicial = "Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.";
          
          console.log('💬 Iniciando chat n8n com mensagem:', mensagemInicial);
          console.log('🆔 UUID da multa para chat:', multaSalva.id);
          
          // Garantir que o multaId seja válido antes de iniciar o chat
          if (!multaSalva.id || multaSalva.id.startsWith('temp_') || multaSalva.id.startsWith('pay_')) {
            throw new Error('UUID da multa inválido ou temporário. Não é possível iniciar o chat.');
          }
          
          // Usar o UUID diretamente da multa salva (não depender do estado)
          await startN8nChatWithValidUUID(mensagemInicial, multaSalva.id);
          
          console.log('✅ Chat n8n iniciado automaticamente com sucesso!');
          console.log('🔍 Verificando estado após início automático:', {
            n8nChatActive,
            n8nChatMessagesLength: n8nChatMessages.length,
            multaId: multaSalva.id
          });
          toast.success('🤖 Chat com IA iniciado automaticamente!');
        } catch (chatError: any) {
          console.error('❌ Erro ao iniciar chat n8n automaticamente:', chatError);
          toast.error(`Erro ao iniciar chat: ${chatError.message}`);
        }
      } else {
        console.warn('⚠️ Falha ao salvar multa no banco, continuando sem salvar');
        toast.warning('Dados extraídos com sucesso, mas não foi possível salvar no banco.');
      }
      
    } catch (error: any) {
      console.error('❌ Erro na extração OCR:', error);
      
      let errorMessage = 'Erro ao processar documento automaticamente. ';
      
      if (error.message?.includes('API key not valid') || error.message?.includes('API_KEY_INVALID')) {
        errorMessage = '⚠️ OCR não configurado. Preencha os dados manualmente.';
        toast.warning(errorMessage);
      } else if (error.message?.includes('sobrecarregado')) {
        errorMessage += 'Serviço temporariamente indisponível.';
        toast.error(errorMessage + ' Preencha os dados manualmente.');
      } else if (error.message?.includes('não contém os dados esperados')) {
        errorMessage += 'Documento pode estar ilegível.';
        toast.error(errorMessage + ' Preencha os dados manualmente.');
      } else {
        errorMessage += 'Erro inesperado.';
        toast.error(errorMessage + ' Preencha os dados manualmente.');
      }
      
      // Em caso de erro, permitir preenchimento manual
      // Inicializar com dados vazios para permitir edição
      setMultaData({
        numero: '',
        infracao: '',
        codigoInfracao: '',
        local: '',
        data: '',
        valor: '',
        veiculo: '',
        condutor: '',
        orgaoAutuador: '',
        pontos: '',
        observacoes: ''
      });
      
      // Avançar para a etapa de extração para permitir edição manual
      setCurrentStep('extraction');
      
      toast.info('💡 Preencha os dados do auto de infração manualmente nos campos abaixo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartChatClick = async () => {
    console.log('🚀 === INICIANDO CHATS ===');
    console.log('📊 Estado atual:', {
      currentStep,
      multaDataKeys: Object.keys(multaData),
      isProcessing,
      n8nChatActive,
      multaId: multaId
    });
    
    // Verificar se os dados estão disponíveis
    if (Object.keys(multaData).length === 0) {
      console.log('⚠️ Dados da multa não disponíveis');
      toast.error('Dados da multa não disponíveis. Faça o upload do documento primeiro.');
      return;
    }
    
    // VALIDAÇÃO CRÍTICA: Garantir que temos UUID real da multa
    console.log('🔍 === VALIDANDO UUID DA MULTA ANTES DO CHAT ===');
    console.log('🆔 multaId atual:', multaId);
    
    let validMultaId = multaId;
    
    // Se não temos multaId, tentar forçar salvamento
    if (!validMultaId) {
      console.log('⚠️ multaId não encontrado, forçando salvamento da multa...');
      try {
        const multaSalva = await handleSaveMultaAutomatically(multaData);
        if (multaSalva && multaSalva.id) {
          validMultaId = multaSalva.id;
          setMultaId(validMultaId);
          console.log('✅ Multa salva com UUID:', validMultaId);
          
          // Bloquear processo após salvamento manual bem-sucedido
          setIsProcessLocked(true);
          
          // Salvar processo no localStorage
          const newProcessId = `processo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setProcessId(newProcessId);
          
          localStorage.setItem('recurso_process', JSON.stringify({
            id: newProcessId,
            multaData: multaData,
            multaId: multaSalva.id,
            clienteData,
            timestamp: new Date().toISOString(),
            locked: true
          }));
          
          toast.success('Dados salvos com sucesso! Documento bloqueado para edição.');
        }
      } catch (error) {
        console.error('❌ Erro ao salvar multa:', error);
      }
    }
    
    // Validar se é um UUID válido (não temporário)
    const isValidUUID = validMultaId && 
                       !validMultaId.startsWith('temp_') && 
                       !validMultaId.startsWith('processo_') && 
                       !validMultaId.startsWith('pay_') &&
                       validMultaId.length > 10;
    
    if (!isValidUUID) {
      console.error('❌ UUID da multa inválido ou temporário:', validMultaId);
      toast.error('Erro: Não foi possível obter o ID válido da multa. Tente fazer upload do documento novamente.');
      return;
    }
    
    console.log('✅ UUID válido confirmado:', validMultaId);
    
    // Mensagem inicial fixa conforme solicitado
    const mensagemInicial = "Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.";
    
    console.log('💬 Mensagem inicial:', mensagemInicial);
    
    try {
      // Iniciar ambos os chats simultaneamente
      console.log('🔄 Iniciando chat n8n...');
      await startN8nChat(mensagemInicial);
      
      console.log('🔄 Chat local não implementado - usando apenas n8n');
      
      console.log('✅ Ambos os chats iniciados com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao iniciar chats:', error);
      toast.error(`Erro ao iniciar chats: ${error.message}`);
    }
  };

  // Função para buscar dados completos da multa no banco
  const buscarDadosCompletosMulta = async (multaUUID: string) => {
    console.log('🔍 === BUSCANDO DADOS COMPLETOS DA MULTA NO BANCO ===');
    console.log('🆔 UUID da multa:', multaUUID);
    
    try {
      // Importar supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Buscar dados da multa com informações do cliente (incluindo CNH)
      const { data: multaBanco, error } = await supabase
        .from('multas')
        .select(`
          *,
          clients!inner(
            id,
            nome,
            cpf_cnpj,
            cnh,
            endereco
          )
        `)
        .eq('id', multaUUID)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar multa no banco:', error);
        throw new Error(`Erro ao buscar dados da multa: ${error.message}`);
      }
      
      if (!multaBanco) {
        console.error('❌ Multa não encontrada no banco');
        throw new Error('Multa não encontrada no banco de dados');
      }
      
      console.log('✅ Dados da multa encontrados no banco:', multaBanco);
      console.log('👤 Dados do cliente encontrados:', multaBanco.clients);
      
      return {
        numero_auto: multaBanco.numero_auto || multaData.numero || '',
        placa_veiculo: multaBanco.placa_veiculo || multaData.veiculo || '',
        data_hora_infracao: multaBanco.data_infracao || multaData.data || '',
        local_infracao: multaBanco.local_infracao || multaData.local || '',
        codigo_infracao: multaBanco.codigo_infracao || multaData.codigoInfracao || '',
        orgao_autuador: multaBanco.orgao_autuador || multaData.orgaoAutuador || '',
        descricao_infracao: multaBanco.descricao_infracao || multaData.infracao || '',
        valor_multa: multaBanco.valor_original || multaBanco.valor_final || 0,
        pontos: multaBanco.pontos || 0,
        tipo_gravidade: multaBanco.tipo_gravidade || '',
        renavam_veiculo: multaBanco.renavam_veiculo || '', // Buscar do banco se disponível
        condutor: multaBanco.condutor || multaData.condutor || '',
        observacoes: multaBanco.observacoes || multaData.observacoes || '',
        cnh_requerente: multaBanco.clients?.cnh || 'CNH não informada' // NOVO CAMPO CNH
      };
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados da multa:', error);
      // Em caso de erro, usar dados extraídos como fallback
      console.log('⚠️ Usando dados extraídos como fallback');
      return {
        numero_auto: multaData.numero || '',
        placa_veiculo: multaData.veiculo || '',
        data_hora_infracao: multaData.data || '',
        local_infracao: multaData.local || '',
        codigo_infracao: multaData.codigoInfracao || '',
        orgao_autuador: multaData.orgaoAutuador || '',
        descricao_infracao: multaData.infracao || '',
        valor_multa: 0,
        pontos: 0,
        tipo_gravidade: '',
        renavam_veiculo: '',
        condutor: multaData.condutor || '',
        observacoes: multaData.observacoes || '',
        cnh_requerente: 'CNH não informada' // FALLBACK PARA CNH
      };
    }
  };

  // Nova função que recebe o UUID diretamente como parâmetro
  const startN8nChatWithValidUUID = async (mensagemInicial: string, validMultaUUID: string) => {
    console.log('🚀 === INICIANDO CHAT N8N COM UUID VÁLIDO ===');
    console.log('📊 Parâmetros recebidos:', {
      mensagemInicial,
      validMultaUUID,
      n8nChatActive,
      n8nChatMessagesLength: n8nChatMessages.length
    });
    
    try {
      console.log('🌐 Iniciando chat n8n...');
      setN8nChatActive(true);
      
      console.log('🔍 === USANDO UUID FORNECIDO DIRETAMENTE ===');
      console.log('🆔 UUID da multa (parâmetro):', validMultaUUID);
      
      // Verificação de segurança adicional
      if (!validMultaUUID || validMultaUUID.startsWith('temp_') || validMultaUUID.startsWith('pay_')) {
        throw new Error('UUID da multa inválido ou temporário. Não é possível iniciar o chat.');
      }
      
      console.log('✅ UUID final a ser enviado:', validMultaUUID);
      
      // 🔥 BUSCAR DADOS COMPLETOS DA MULTA NO BANCO
      console.log('📋 === BUSCANDO DADOS COMPLETOS NO BANCO ===');
      const dadosCompletosMulta = await buscarDadosCompletosMulta(validMultaUUID);
      
      console.log('📊 Dados completos obtidos:', dadosCompletosMulta);
      
      // Preparar dados para o webhook n8n - USAR DADOS COMPLETOS DO BANCO
      const webhookData = {
        nome_requerente: clienteData?.nome || multaData.nomeProprietario || '',
        cnh_requerente: dadosCompletosMulta.cnh_requerente, // NOVO CAMPO CNH
        cpf_cnpj: clienteData?.cpf_cnpj || multaData.cpfCnpjProprietario || '',
        endereco_requerente: clienteData?.endereco || multaData.enderecoProprietario || '',
        placa_veiculo: dadosCompletosMulta.placa_veiculo,
        renavam_veiculo: dadosCompletosMulta.renavam_veiculo,
        numero_auto: dadosCompletosMulta.numero_auto,
        data_hora_infracao: dadosCompletosMulta.data_hora_infracao,
        local_infracao: dadosCompletosMulta.local_infracao,
        codigo_infracao: dadosCompletosMulta.codigo_infracao,
        orgao_autuador: dadosCompletosMulta.orgao_autuador,
        descricao_infracao: dadosCompletosMulta.descricao_infracao,
        valor_multa: dadosCompletosMulta.valor_multa,
        pontos: dadosCompletosMulta.pontos,
        tipo_gravidade: dadosCompletosMulta.tipo_gravidade,
        condutor: dadosCompletosMulta.condutor,
        observacoes: dadosCompletosMulta.observacoes,
        idmultabancodedados: validMultaUUID, // UUID real da multa salva no banco
        mensagem_usuario: mensagemInicial,
        company_id: user?.company_id || await getExistingCompanyId()
      };
      
      // Validar campos obrigatórios
      const camposObrigatorios = {
        placa_veiculo: webhookData.placa_veiculo,
        numero_auto: webhookData.numero_auto,
        data_hora_infracao: webhookData.data_hora_infracao,
        local_infracao: webhookData.local_infracao,
        codigo_infracao: webhookData.codigo_infracao,
        orgao_autuador: webhookData.orgao_autuador
      };
      
      const camposVazios = Object.entries(camposObrigatorios)
        .filter(([key, value]) => !value || value.trim() === '')
        .map(([key]) => key);
      
      if (camposVazios.length > 0) {
        console.warn('⚠️ Campos obrigatórios vazios:', camposVazios);
        console.warn('📋 Dados que serão enviados mesmo assim:', webhookData);
        toast.warning(`Alguns dados da multa estão incompletos: ${camposVazios.join(', ')}. O chat será iniciado com os dados disponíveis.`);
      }
      
      console.log('📤 === ENVIANDO DADOS PARA WEBHOOK N8N ===');
      console.log('🆔 UUID da multa enviado:', validMultaUUID);
      console.log('🏢 Company ID enviado:', webhookData.company_id);
      console.log('🆔 CNH do requerente enviada:', webhookData.cnh_requerente);
      console.log('📋 Dados completos do webhook:', webhookData);
      console.log('🔍 Verificação final idmultabancodedados:', webhookData.idmultabancodedados);
      
      // Executar webhook n8n
       await executeN8nWebhook(webhookData, mensagemInicial, validMultaUUID);
       
    } catch (error: any) {
      console.error('❌ Erro ao iniciar chat n8n com UUID válido:', error);
      setN8nChatActive(false);
      throw error;
    }
  };

  // Função para executar o webhook n8n
  const executeN8nWebhook = async (webhookData: any, mensagemInicial: string, multaUUID: string) => {
    try {
      // Enviar dados para o webhook n8n
      const response = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });
      
      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.status} - ${response.statusText}`);
      }
      
      const webhookResponse = await response.json();
      console.log('✅ === RESPOSTA DO WEBHOOK N8N (INICIAL) ===');
      console.log('📋 Resposta completa:', webhookResponse);
      console.log('🔍 Tipo da resposta:', typeof webhookResponse);
      console.log('📊 É array?', Array.isArray(webhookResponse));
      
      // Verificar se é apenas confirmação de início do workflow
      let responseContent = '';
      const isWorkflowStartMessage = webhookResponse?.message === 'Workflow was started';
      
      if (isWorkflowStartMessage) {
        console.log('⏳ === WORKFLOW INICIADO - AGUARDANDO RESPOSTA ===');
        responseContent = `🔄 Workflow iniciado com sucesso! Aguardando processamento da IA...\n\nDados enviados:\n• Auto de Infração: ${multaData.numero}\n• Código: ${multaData.codigoInfracao}\n• Local: ${multaData.local}\n\nO sistema está analisando sua solicitação. A resposta aparecerá em breve.`;
        
        // Implementar verificação periódica para aguardar resposta real
        await handleN8nPolling(webhookData, multaUUID);
      } else {
        // Resposta direta
        if (Array.isArray(webhookResponse)) {
          responseContent = webhookResponse[0]?.response || webhookResponse[0]?.message || JSON.stringify(webhookResponse[0]);
        } else {
          responseContent = webhookResponse.response || webhookResponse.message || JSON.stringify(webhookResponse);
        }
      }
      
      // Criar mensagens do chat
      const initialUserMessage = {
        id: 'n8n_1',
        type: 'user' as const,
        content: mensagemInicial,
        timestamp: new Date()
      };
      
      const initialAiMessage = {
        id: 'n8n_2',
        type: 'ai' as const,
        content: responseContent,
        timestamp: new Date()
      };
      
      // Adicionar mensagens ao chat
      setN8nChatMessages([initialUserMessage, initialAiMessage]);
      
      // Criar sessão de chat no banco de dados
      try {
        const companyId = user?.company_id || await getExistingCompanyId();
        
        if (!companyId) {
          console.error('❌ Company ID não encontrado. Não é possível criar sessão de chat.');
          throw new Error('Company ID não encontrado');
        }
        
        console.log('✅ Company ID válido encontrado:', companyId);
        const userId = user?.id;
      
      if (!userId) {
        console.error('❌ Usuário não autenticado para criar sessão de chat');
        toast.error('Erro: Usuário não autenticado');
        return;
      }
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const chatSession = await chatService.createSession({
          sessionId: sessionId,
          webhookUrl: 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4',
          webhookPayload: webhookData,
          multaId: multaUUID,
          companyId: companyId,
          userId: userId
        });
        
        setChatSessionId(chatSession.id);
        console.log('✅ Sessão de chat criada:', chatSession);
        
        // Salvar mensagens iniciais no banco de dados
        try {
          await chatService.addMessage({
            chatSessionId: chatSession.id,
            messageType: 'user',
            content: mensagemInicial,
            metadata: { source: 'n8n_initial_user' }
          });
          
          await chatService.addMessage({
            chatSessionId: chatSession.id,
            messageType: 'assistant',
            content: responseContent,
            metadata: { source: 'n8n_initial_response' }
          });
          
          console.log('✅ Mensagens iniciais salvas no banco');
        } catch (messageError: any) {
          console.warn('⚠️ Erro ao salvar mensagens iniciais:', messageError);
        }
        
        // Criar recurso iniciado após chat bem-sucedido
        if (multaUUID) {
          try {
            const recursoIniciado = await recursosIniciadosService.criarRecursoAposChat(
              multaUUID,
              chatSession.id,
              multaData,
              clienteData,
              responseContent
            );
            
            console.log('✅ Recurso iniciado criado:', recursoIniciado);
            toast.success('✅ Recurso iniciado e salvo com sucesso!');
          } catch (recursoError: any) {
            console.warn('⚠️ Erro ao criar recurso iniciado:', recursoError);
            // Não falhar o chat por causa disso
          }
        }
        
      } catch (sessionError: any) {
        console.warn('⚠️ Erro ao salvar sessão de chat:', sessionError);
        // Continuar mesmo se não conseguir salvar a sessão
      }
      
      toast.success('Chat n8n iniciado com sucesso! Dados enviados para o sistema de IA.');
      
    } catch (error: any) {
      console.error('❌ Erro ao executar webhook n8n:', error);
      throw error;
    }
  };

  // Função para fazer polling da resposta do n8n
  const handleN8nPolling = async (webhookData: any, multaUUID: string) => {
    let pollAttempts = 0;
    const maxPollAttempts = 8;
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      console.log(`🔄 Verificação ${pollAttempts}/${maxPollAttempts} - Aguardando resposta do n8n...`);
      
      try {
        // Tentar uma abordagem diferente: usar um parâmetro de status
        const statusResponse = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...webhookData,
            action: 'get_status',
            session_id: chatSessionId || processId,
            check_attempt: pollAttempts,
            company_id: user?.company_id || await getExistingCompanyId()
          })
        });
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          console.log(`📋 Resposta da verificação ${pollAttempts}:`, statusResult);
          
          // Verificar se recebemos uma resposta real
          const hasRealResponse = statusResult && 
                                statusResult.message !== 'Workflow was started' &&
                                (Array.isArray(statusResult) || statusResult.response);
          
          if (hasRealResponse) {
            console.log('✅ Resposta real recebida!');
            clearInterval(pollInterval);
            
            // Processar e atualizar a resposta
            let realContent = '';
            if (Array.isArray(statusResult)) {
              realContent = statusResult[0]?.response || statusResult[0]?.message || JSON.stringify(statusResult[0]);
            } else {
              realContent = statusResult.response || statusResult.message || JSON.stringify(statusResult);
            }
            
            // Atualizar a mensagem no chat
            setN8nChatMessages(prev => {
              const updated = [...prev];
              if (updated.length > 1) {
                updated[1] = {
                  ...updated[1],
                  content: realContent,
                  timestamp: new Date()
                };
              }
              return updated;
            });
            
            // Salvar no banco se temos sessão
            if (chatSessionId) {
              try {
                await chatService.addMessage({
                  chatSessionId: chatSessionId,
                  messageType: 'assistant',
                  content: realContent,
                  metadata: { 
                    source: 'n8n_delayed_response',
                    attempt: pollAttempts,
                    timestamp: new Date().toISOString()
                  }
                });
                
                // Detectar recurso se presente
                if (multaUUID) {
                  try {
                    const recursoDetectado = await detectarESalvarRecurso(realContent, chatSessionId, multaUUID);
                    if (recursoDetectado) {
                      toast.success('🎯 Resposta da IA recebida e recurso detectado!');
                    } else {
                      toast.success('✅ Resposta da IA recebida!');
                    }
                  } catch (recursoError: any) {
                    console.error('❌ Erro ao detectar recurso:', recursoError);
                    toast.success('✅ Resposta da IA recebida!');
                  }
                } else {
                  toast.success('✅ Resposta da IA recebida!');
                }
              } catch (saveError: any) {
                console.warn('⚠️ Erro ao salvar resposta:', saveError);
                toast.success('✅ Resposta da IA recebida!');
              }
            }
            
            return;
          }
        }
      } catch (pollError: any) {
        console.warn(`⚠️ Erro na verificação ${pollAttempts}:`, pollError.message);
      }
      
      // Se atingiu o máximo de tentativas, parar
      if (pollAttempts >= maxPollAttempts) {
        console.log('⏰ Tempo limite atingido para resposta do n8n');
        clearInterval(pollInterval);
        
        // Atualizar mensagem para indicar que está processando em background
        setN8nChatMessages(prev => {
          const updated = [...prev];
          if (updated.length > 1) {
            updated[1] = {
              ...updated[1],
              content: `🔄 Sua solicitação está sendo processada pelo sistema de IA.\n\nDados enviados:\n• Auto de Infração: ${multaData.numero}\n• Código: ${multaData.codigoInfracao}\n• Local: ${multaData.local}\n\n⏰ O processamento pode levar alguns minutos. A resposta aparecerá automaticamente quando estiver pronta.\n\n💡 Você pode continuar enviando mensagens ou aguardar a resposta.`,
              timestamp: new Date()
            };
          }
          return updated;
        });
        
        toast.info('⏰ O sistema está processando sua solicitação. A resposta pode demorar alguns minutos.');
      }
    }, 5000); // Verificar a cada 5 segundos
  };

  const startN8nChat = async (mensagemInicial: string) => {
    console.log('🚀 === INICIANDO CHAT N8N (DETALHADO) ===');
    console.log('📊 Estado antes do início:', {
      n8nChatActive,
      multaId,
      mensagemInicial,
      n8nChatMessagesLength: n8nChatMessages.length
    });
    
    try {
      // Usar UUID validado da multa (já verificado em handleStartChatClick)
      const multaUUID = multaId;
      
      console.log('🔍 === USANDO UUID VALIDADO DA MULTA ===');
      console.log('🆔 UUID da multa (já validado):', multaUUID);
      
      // Verificação de segurança adicional
      if (!multaUUID || multaUUID.startsWith('temp_') || multaUUID.startsWith('pay_')) {
        throw new Error('UUID da multa inválido ou temporário. Não é possível iniciar o chat.');
      }
      
      console.log('✅ UUID final a ser enviado:', multaUUID);
      
      // Usar a nova função com UUID válido
      await startN8nChatWithValidUUID(mensagemInicial, multaUUID);
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar chat n8n:', error);
      setN8nChatActive(false);
      throw error;
    }
  };

  // Função detectarESalvarRecurso já definida acima no componente
  


  const sendN8nMessage = async (message: string) => {
    if (!message.trim() || isN8nLoading) return;
    
    try {
      setIsN8nLoading(true);
      
      // Adicionar mensagem do usuário ao chat
      const userMessage: ChatMessage = {
        id: `n8n_user_${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setN8nChatMessages(prev => [...prev, userMessage]);
      setN8nInputValue('');
      
      // Usar UUID validado da multa (deve estar disponível após inicialização do chat)
      const multaUUID = multaId;
      
      console.log('🔍 === USANDO UUID VALIDADO DA MULTA (MENSAGEM) ===');
      console.log('🆔 UUID da multa:', multaUUID);
      
      // Verificação de segurança: não permitir IDs inválidos
      if (!multaUUID || multaUUID.startsWith('temp_') || multaUUID.startsWith('pay_')) {
        console.error('❌ UUID da multa inválido para envio de mensagem:', multaUUID);
        throw new Error('UUID da multa inválido. Reinicie o chat.');
      }
      
      console.log('✅ UUID final a ser enviado:', multaUUID);
      
      // Buscar dados completos da multa incluindo CNH
      const dadosCompletosMulta = await buscarDadosCompletosMulta(multaUUID);
      
      // Preparar dados para o webhook n8n
      const webhookData = {
        nome_requerente: clienteData?.nome || multaData.condutor || multaData.nomeProprietario || '',
        cnh_requerente: dadosCompletosMulta.cnh_requerente, // NOVO CAMPO CNH
        cpf_cnpj: clienteData?.cpf_cnpj || multaData.cpfCnpjProprietario || '',
        endereco_requerente: clienteData?.endereco || multaData.enderecoProprietario || '',
        placa_veiculo: multaData.veiculo || '',
        renavam_veiculo: '',
        numero_auto: multaData.numero || '',
        data_hora_infracao: multaData.data || '',
        local_infracao: multaData.local || '',
        codigo_infracao: multaData.codigoInfracao || '',
        orgao_autuador: multaData.orgaoAutuador || '',
        idmultabancodedados: multaUUID, // UUID correto da multa
        mensagem_usuario: message,
        session_id: chatSessionId || processId,
        company_id: user?.company_id || await getExistingCompanyId()
      };
      
      console.log('📤 === ENVIANDO MENSAGEM PARA WEBHOOK N8N ===');
      console.log('💬 Mensagem do usuário:', message);
      console.log('🆔 UUID da multa enviado:', multaUUID);
      console.log('🏢 Company ID enviado:', webhookData.company_id);
      console.log('🆔 CNH do requerente enviada:', webhookData.cnh_requerente);
      console.log('📋 Dados completos do webhook:', webhookData);
      console.log('🔍 Verificação final idmultabancodedados:', webhookData.idmultabancodedados);
      
      // Enviar mensagem para o webhook n8n
      const response = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });
      
      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.status} - ${response.statusText}`);
      }
      
      const webhookResponse = await response.json();
      console.log('✅ === RESPOSTA DO WEBHOOK N8N (MENSAGEM) ===');
      console.log('📋 Resposta completa:', webhookResponse);
      console.log('🔍 Tipo da resposta:', typeof webhookResponse);
      console.log('📊 É array?', Array.isArray(webhookResponse));
      
      // Verificar se é apenas confirmação de início do workflow
      const isWorkflowStartMessage = webhookResponse?.message === 'Workflow was started';
      
      if (isWorkflowStartMessage) {
        console.log('⏳ === WORKFLOW INICIADO PARA MENSAGEM - AGUARDANDO RESPOSTA ===');
        
        // Adicionar mensagem temporária indicando processamento
        const processingMessage: ChatMessage = {
          id: `n8n_processing_${Date.now()}`,
          type: 'ai',
          content: '🔄 Processando sua mensagem... Aguarde a resposta da IA.',
          timestamp: new Date()
        };
        
        setN8nChatMessages(prev => [...prev, processingMessage]);
        
        // Implementar verificação periódica para mensagens subsequentes
         let messagePollAttempts = 0;
         const maxMessagePollAttempts = 6;
         const messagePollInterval = setInterval(async () => {
           messagePollAttempts++;
           console.log(`🔄 Verificação de mensagem ${messagePollAttempts}/${maxMessagePollAttempts}...`);
           
           try {
             const messageStatusResponse = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                 ...webhookData,
                 action: 'get_message_status',
                 session_id: chatSessionId || processId,
                 message_check_attempt: messagePollAttempts,
                 original_message: message,
                 company_id: user?.company_id || await getExistingCompanyId()
               })
             });
             
             if (messageStatusResponse.ok) {
               const messageStatusResult = await messageStatusResponse.json();
               console.log(`📋 Resposta da verificação de mensagem ${messagePollAttempts}:`, messageStatusResult);
               
               const hasMessageResponse = messageStatusResult && 
                                        messageStatusResult.message !== 'Workflow was started' &&
                                        (Array.isArray(messageStatusResult) || messageStatusResult.response);
               
               if (hasMessageResponse) {
                 console.log('✅ Resposta da mensagem recebida!');
                 clearInterval(messagePollInterval);
                 
                 // Processar resposta da mensagem
                 let messageContent = '';
                 if (Array.isArray(messageStatusResult)) {
                   messageContent = messageStatusResult[0]?.response || messageStatusResult[0]?.message || JSON.stringify(messageStatusResult[0]);
                 } else {
                   messageContent = messageStatusResult.response || messageStatusResult.message || JSON.stringify(messageStatusResult);
                 }
                 
                 // Remover mensagem de processamento e adicionar resposta real
                 setN8nChatMessages(prev => {
                   const filtered = prev.filter(msg => !msg.id.startsWith('n8n_processing_'));
                   return [...filtered, {
                     id: `n8n_ai_${Date.now()}`,
                     type: 'ai',
                     content: messageContent,
                     timestamp: new Date()
                   }];
                 });
                 
                 // Salvar no banco se temos sessão
                 if (chatSessionId) {
                   try {
                     // Salvar mensagem do usuário
                     await chatService.addMessage({
                       chatSessionId: chatSessionId,
                       messageType: 'user',
                       content: message,
                       metadata: { source: 'n8n_user_input' }
                     });
                     
                     // Salvar resposta da IA
                     await chatService.addMessage({
                       chatSessionId: chatSessionId,
                       messageType: 'assistant',
                       content: messageContent,
                       metadata: { 
                         source: 'n8n_delayed_message_response',
                         attempt: messagePollAttempts,
                         timestamp: new Date().toISOString()
                       }
                     });
                     
                     // Detectar recurso se presente
                     if (multaUUID) {
                       try {
                         const recursoDetectado = await detectarESalvarRecurso(messageContent, chatSessionId, multaUUID);
                         if (recursoDetectado) {
                           toast.success('🎯 Resposta recebida e recurso detectado!');
                         } else {
                           toast.success('✅ Resposta da IA recebida!');
                         }
                       } catch (recursoError: any) {
                         console.error('❌ Erro ao detectar recurso:', recursoError);
                         toast.success('✅ Resposta da IA recebida!');
                       }
                     } else {
                       toast.success('✅ Resposta da IA recebida!');
                     }
                   } catch (saveError: any) {
                     console.warn('⚠️ Erro ao salvar resposta da mensagem:', saveError);
                     toast.success('✅ Resposta da IA recebida!');
                   }
                 }
                 
                 return;
               }
             }
           } catch (pollError: any) {
             console.warn(`⚠️ Erro na verificação de mensagem ${messagePollAttempts}:`, pollError.message);
           }
           
           // Se atingiu o máximo de tentativas, parar e mostrar timeout
           if (messagePollAttempts >= maxMessagePollAttempts) {
             console.log('⏰ Tempo limite atingido para resposta da mensagem');
             clearInterval(messagePollInterval);
             
             // Remover mensagem de processamento e adicionar timeout
             setN8nChatMessages(prev => {
               const filtered = prev.filter(msg => !msg.id.startsWith('n8n_processing_'));
               return [...filtered, {
                 id: `n8n_timeout_${Date.now()}`,
                 type: 'ai',
                 content: '⏰ O sistema está processando sua mensagem em background. A resposta pode demorar alguns minutos. Você pode continuar enviando mensagens.',
                 timestamp: new Date()
               }];
             });
             
             toast.info('⏰ Sua mensagem está sendo processada. A resposta pode demorar alguns minutos.');
           }
         }, 4000); // Verificar a cada 4 segundos para mensagens
        
      } else {
        // Processar resposta imediata (caso o n8n retorne resposta direta)
        let responseContent = '';
        if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
          // Se for array, pegar o primeiro item e extrair a resposta
          const firstItem = webhookResponse[0];
          responseContent = firstItem.response || firstItem.message || JSON.stringify(firstItem);
          console.log('📋 Processando array - primeiro item:', firstItem);
          console.log('💬 Conteúdo extraído do array:', responseContent);
        } else if (webhookResponse && typeof webhookResponse === 'object') {
          // Se for objeto direto
          responseContent = webhookResponse.response || webhookResponse.message || JSON.stringify(webhookResponse);
          console.log('💬 Conteúdo extraído do objeto:', responseContent);
        } else {
          // Fallback
          responseContent = 'Mensagem recebida e processada pelo sistema n8n.';
          console.log('⚠️ Usando conteúdo fallback para mensagem');
        }
        
        // Adicionar resposta da IA ao chat
        const aiMessage: ChatMessage = {
          id: `n8n_ai_${Date.now()}`,
          type: 'ai',
          content: responseContent,
          timestamp: new Date()
        };
        
        setN8nChatMessages(prev => [...prev, aiMessage]);
        
        // Salvar mensagens no banco de dados se temos uma sessão ativa
        if (chatSessionId) {
          try {
            // Salvar mensagem do usuário
            await chatService.addMessage({
              chatSessionId: chatSessionId,
              messageType: 'user',
              content: message,
              metadata: { source: 'n8n_user_input' }
            });
            
            // Salvar resposta da IA
             await chatService.addMessage({
               chatSessionId: chatSessionId,
               messageType: 'assistant',
               content: responseContent,
               metadata: { 
                 source: 'n8n_webhook_response',
                 webhookResponse: webhookResponse,
                 responseContent: responseContent,
                 timestamp: new Date().toISOString()
               }
             });
            
            console.log('✅ === MENSAGENS DO CHAT SALVAS NO BANCO ===');
             console.log('🆔 Session ID:', chatSessionId);
             console.log('💬 Mensagem do usuário salva:', message);
             console.log('🤖 Resposta da IA salva:', responseContent);
             console.log('📋 Resposta original do webhook:', webhookResponse);
             console.log('📊 Metadata da resposta:', { source: 'n8n_webhook_response', timestamp: new Date().toISOString() });
             
             // Detectar e salvar recurso se presente na resposta
             if (multaUUID) {
               console.log('🔍 === INICIANDO DETECÇÃO DE RECURSO (MENSAGEM) ===');
               console.log('📋 Dados para detecção:', {
                 responseLength: responseContent.length,
                 chatSessionId: chatSessionId,
                 multaId: multaUUID,
                 userMessage: message.substring(0, 50) + '...'
               });
               
               try {
                 const recursoDetectado = await detectarESalvarRecurso(responseContent, chatSessionId, multaUUID);
                 if (recursoDetectado && typeof recursoDetectado === 'object' && recursoDetectado !== null && 'id' in recursoDetectado) {
                    console.log('✅ Recurso detectado e salvo na mensagem:', (recursoDetectado as any).id);
                   toast.success('🎯 Novo recurso detectado e salvo!');
                 } else {
                   console.log('ℹ️ Nenhum recurso detectado na mensagem');
                 }
               } catch (recursoError: any) {
                 console.error('❌ Erro ao detectar/salvar recurso da mensagem:', recursoError);
                 toast.warning('Erro ao processar recurso da resposta');
               }
             }
          } catch (messageError: any) {
            console.warn('⚠️ Erro ao salvar mensagens no banco:', messageError);
          }
        }
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem n8n:', error);
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
      
      // Adicionar mensagem de erro ao chat
      const errorMessage: ChatMessage = {
        id: `n8n_error_${Date.now()}`,
        type: 'ai',
        content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error.message}`,
        timestamp: new Date()
      };
      
      setN8nChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsN8nLoading(false);
    }
  };

  const handleN8nKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendN8nMessage(n8nInputValue);
    }
  };

  const handleNewProcess = () => {
    // Limpar todos os dados e reiniciar o processo
    setIsProcessLocked(false);
    setProcessId(null);
    setUploadedFile(null);
    setMultaData({});
    setN8nChatMessages([]);
    setN8nChatActive(false);
    setRecursoText('');
    setCurrentStep('upload');
    
    // Limpar localStorage
    localStorage.removeItem('recurso_process');
    
    toast.success('Novo processo iniciado! Você pode fazer upload de um novo documento.');
  };


  
  const handleRecursoChange = (newText: string) => {
    setRecursoText(newText);
  };
  
  // Função para converter data do formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
  const convertBrazilianDateToISO = (dateString: string): string => {
    if (!dateString) {
      console.log('⚠️ Data vazia, usando data atual como fallback');
      return new Date().toISOString().split('T')[0];
    }
    
    console.log('🔄 Convertendo data:', dateString);
    
    // Verificar se já está no formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log('✅ Data já está no formato ISO:', dateString);
      return dateString;
    }
    
    // Verificar formato brasileiro (DD/MM/YYYY)
    const brazilianDateMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brazilianDateMatch) {
      const [, day, month, year] = brazilianDateMatch;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('✅ Data convertida de', dateString, 'para', isoDate);
      return isoDate;
    }
    
    // Tentar outros formatos comuns
    const otherFormats = [
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
    ];
    
    for (const format of otherFormats) {
      const match = dateString.match(format);
      if (match) {
        const [, part1, part2, part3] = match;
        // Assumir que se o primeiro número tem 4 dígitos, é ano
        if (part1.length === 4) {
          const isoDate = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          console.log('✅ Data convertida de', dateString, 'para', isoDate);
          return isoDate;
        } else {
          const isoDate = `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
          console.log('✅ Data convertida de', dateString, 'para', isoDate);
          return isoDate;
        }
      }
    }
    
    console.warn('⚠️ Formato de data não reconhecido:', dateString, '- usando data atual como fallback');
     return new Date().toISOString().split('T')[0];
   };
   
   // Função para validar se uma data ISO é válida
   const validateISODate = (isoDateString: string): boolean => {
     if (!isoDateString || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateString)) {
       console.log('❌ Formato de data inválido:', isoDateString);
       return false;
     }
     
     const date = new Date(isoDateString + 'T00:00:00.000Z');
     
     // Verificar se a data é válida (não é NaN)
     if (isNaN(date.getTime())) {
       console.log('❌ Data inválida (NaN):', isoDateString);
       return false;
     }
     
     // Verificar se os componentes da data são válidos
     const [year, month, day] = isoDateString.split('-').map(Number);
     
     if (year < 1900 || year > 2100) {
       console.log('❌ Ano fora do intervalo válido:', year);
       return false;
     }
     
     if (month < 1 || month > 12) {
       console.log('❌ Mês inválido:', month);
       return false;
     }
     
     if (day < 1 || day > 31) {
       console.log('❌ Dia inválido:', day);
       return false;
     }
     
     console.log('✅ Data válida:', isoDateString);
     return true;
   };
  
  const createRecursoRecord = async (multaSalva: any, multaDataMapeada: MultaData) => {
    try {
      console.log('📝 Criando registro de recurso...');
      
      // Importar supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Obter company_id e client_id
      const companyId = user?.company_id || multaSalva.company_id;
      const clientId = multaSalva.client_id;
      
      console.log('🔍 [createRecursoRecord] Debug company_id:', {
        user_company_id: user?.company_id,
        multa_company_id: multaSalva.company_id,
        final_company_id: companyId,
        user_role: user?.role,
        multa_id: multaSalva.id
      });
      
      if (!companyId) {
        console.error('❌ Company ID não disponível para criar recurso');
        return;
      }
      
      // Preparar dados do recurso
      const recursoData = {
        company_id: companyId,
        client_id: clientId,
        multa_id: multaSalva.id,
        titulo: `Recurso - Auto ${multaDataMapeada.numero || 'S/N'}`,
        tipo_recurso: 'defesa_previa',
        status: 'em_analise',
        data_protocolo: new Date().toISOString().split('T')[0],
        fundamentacao: 'Fundamentação em elaboração via IA',
        numero_auto: multaDataMapeada.numero || null,
        placa_veiculo: multaDataMapeada.veiculo || null,
        codigo_infracao: multaDataMapeada.codigoInfracao || null,
        valor_multa: parseFloat(multaDataMapeada.valor?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
        nome_requerente: multaDataMapeada.nomeProprietario || clienteData?.nome || null,
        cpf_cnpj_requerente: multaDataMapeada.cpfCnpjProprietario || clienteData?.cpf_cnpj || null,
        endereco_requerente: multaDataMapeada.enderecoProprietario || null,
        data_prazo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias
        observacoes: 'Recurso iniciado via processamento de documento',
        metadata: {
          source: 'teste_recurso_ia',
          uploaded_file: uploadedFile?.name,
          process_id: processId,
          ocr_processed: true,
          created_via: 'document_upload'
        }
      };
      
      console.log('📋 Dados do recurso a serem salvos:', recursoData);
      
      // Inserir na tabela recursos
      const { data: recursoSalvo, error } = await supabase
        .from('recursos')
        .insert(recursoData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao salvar recurso:', error);
        throw error;
      }
      
      console.log('✅ Recurso salvo com sucesso:', recursoSalvo);
      console.log('🔍 [createRecursoRecord] Recurso salvo com company_id:', recursoSalvo.company_id);
      toast.success('Recurso registrado e visível na aba Recursos!');
      
      return recursoSalvo;
    } catch (error: any) {
      console.error('❌ Erro ao criar registro de recurso:', error);
      throw error;
    }
  };
  
  const handleSaveMultaAutomatically = async (multaDataMapeada: MultaData) => {
    try {
      console.log('💾 Salvando dados da multa automaticamente...');
      console.log('📋 Dados a serem salvos:', multaDataMapeada);
      console.log('👤 Dados do cliente:', clienteData);
      
      // Priorizar company_id do usuário autenticado
      let companyId = user?.company_id;
      
      // Se o usuário não tiver company_id, buscar uma empresa existente no banco
      if (!companyId) {
        console.log('⚠️ Usuário não possui company_id, buscando empresa existente...');
        companyId = await getExistingCompanyId();
        
        if (!companyId) {
          console.error('❌ Company ID não encontrado nem para usuário nem no banco');
          toast.error('Erro: Dados da empresa não encontrados');
          return;
        }
        console.log('✅ Usando company_id encontrado no banco:', companyId);
      } else {
        console.log('✅ Usando company_id do usuário autenticado:', companyId);
      }
      
      // Buscar client_id existente no banco
      let clientId = await getExistingClientId();
      
      // Se não encontrou client existente, tentar criar um cliente padrão
      if (!clientId && companyId) {
        console.log('⚠️ Nenhum client encontrado, tentando criar cliente padrão...');
        clientId = await createDefaultClient(companyId, clienteData);
      }
      
      // Se ainda não temos client_id, usar fallback com UUID
      if (!clientId) {
        console.log('⚠️ Não foi possível criar cliente padrão, usando fallback UUID...');
        clientId = getValidUUID(clienteData?.cliente_id, 'Client ID (multa)');
      }
      
      console.log('🏢 Company ID final a ser usado:', companyId);
      console.log('👤 Client ID final a ser usado:', clientId);
      
      // Converter data da infração do formato brasileiro para ISO
      let dataInfracaoISO = convertBrazilianDateToISO(multaDataMapeada.data || '');
      
      // Validar se a data convertida é válida
      if (!validateISODate(dataInfracaoISO)) {
        console.error('❌ Data convertida é inválida:', dataInfracaoISO);
        const fallbackDate = new Date().toISOString().split('T')[0];
        console.log('🔄 Usando data atual como fallback:', fallbackDate);
        dataInfracaoISO = fallbackDate;
      }
      
      console.log('📅 Data da infração processada:', {
        original: multaDataMapeada.data,
        convertida: dataInfracaoISO,
        valida: validateISODate(dataInfracaoISO)
      });
      
      // Preparar dados da multa com todos os campos expandidos
      const multaInsert = {
        company_id: companyId,
        client_id: clientId,
        numero_auto: multaDataMapeada.numero || '',
        placa_veiculo: multaDataMapeada.veiculo || '',
        data_infracao: dataInfracaoISO,
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
        valor_original: parseFloat(multaDataMapeada.valor?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
        valor_final: parseFloat(multaDataMapeada.valor?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
        codigo_infracao: multaDataMapeada.codigoInfracao || '',
        local_infracao: multaDataMapeada.local || '',
        descricao_infracao: multaDataMapeada.infracao || '',
        orgao_autuador: multaDataMapeada.orgaoAutuador || '',
        pontos: parseInt(multaDataMapeada.pontos || '0'),
        observacoes: multaDataMapeada.observacoes || '',
        
        // Campos expandidos - Dados do equipamento
        numero_equipamento: multaDataMapeada.numeroEquipamento || null,
        tipo_equipamento: multaDataMapeada.tipoEquipamento || null,
        localizacao_equipamento: multaDataMapeada.localizacaoEquipamento || null,
        velocidade_permitida: multaDataMapeada.velocidadePermitida || null,
        velocidade_aferida: multaDataMapeada.velocidadeAferida || null,
        
        // Campos expandidos - Dados do proprietário
        nome_proprietario: multaDataMapeada.nomeProprietario || null,
        cpf_cnpj_proprietario: multaDataMapeada.cpfCnpjProprietario || null,
        endereco_proprietario: multaDataMapeada.enderecoProprietario || null,
        
        // Campos expandidos - Observações detalhadas
        observacoes_gerais: multaDataMapeada.observacoesGerais || null,
        observacoes_condutor: multaDataMapeada.observacoesCondutor || null,
        observacoes_veiculo: multaDataMapeada.observacoesVeiculo || null,
        mensagem_senatran: multaDataMapeada.mensagemSenatran || null,
        
        // Campos expandidos - Registro fotográfico
        transcricao_registro_fotografico: multaDataMapeada.transcricaoRegistroFotografico || null,
        motivo_nao_abordagem: multaDataMapeada.motivoNaoAbordagem || null,
        
        // Campos expandidos - Dados do equipamento e notificação
        dados_equipamento: multaDataMapeada.dadosEquipamento || null,
        notificacao_autuacao: multaDataMapeada.notificacaoAutuacao || null
      };
      
      // Validar dados antes do salvamento
      console.log('🔍 === VALIDAÇÃO COMPLETA DOS DADOS ===');
      console.log('📊 Dados de identificação:');
      console.log('  - Company ID:', companyId, '(tipo:', typeof companyId, ')');
      console.log('  - Client ID:', clientId, '(tipo:', typeof clientId, ')');
      
      // Validar se os IDs são válidos antes de prosseguir
      if (!companyId || !clientId) {
        const errorMsg = `IDs inválidos - Company ID: ${companyId}, Client ID: ${clientId}`;
        console.error('❌ ERRO:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✅ Validação de IDs passou - ambos os IDs são válidos');
      console.log('📋 Dados da multa:');
      console.log('  - Número da multa:', multaInsert.numero_auto);
      console.log('  - Placa do veículo:', multaInsert.placa_veiculo);
      console.log('  - Código da infração:', multaInsert.codigo_infracao);
      console.log('  - Local da infração:', multaInsert.local_infracao);
      console.log('  - Descrição da infração:', multaInsert.descricao_infracao);
      console.log('  - Órgão autuador:', multaInsert.orgao_autuador);
      console.log('  - Pontos:', multaInsert.pontos);
      console.log('📅 Dados de data:');
      console.log('  - Data original:', multaDataMapeada.data);
      console.log('  - Data da infração (ISO):', multaInsert.data_infracao);
      console.log('  - Data de vencimento:', multaInsert.data_vencimento);
      console.log('💰 Dados financeiros:');
      console.log('  - Valor original string:', multaDataMapeada.valor);
      console.log('  - Valor original processado:', multaInsert.valor_original);
      console.log('  - Valor final:', multaInsert.valor_final);
      console.log('📝 Observações:', multaInsert.observacoes);
      
      console.log('💾 === INICIANDO SALVAMENTO NO BANCO ===');
      
      // Salvar multa usando o serviço
      const multaSalva = await multasService.createMulta(multaInsert);
      
      console.log('✅ === SALVAMENTO CONCLUÍDO ===');
      
      // === ANÁLISE DE MULTA LEVE ===
      if (multaSalva?.id && multaDataMapeada.codigoInfracao) {
        console.log('🔍 === INICIANDO ANÁLISE DE MULTA LEVE ===');
        
        try {
          // Obter CPF do condutor (priorizar proprietário, depois cliente)
        const cpfCondutor = multaDataMapeada.cpfCnpjProprietario || 
                           clienteData?.cpf_cnpj || 
                           '';
          
          if (cpfCondutor && cpfCondutor !== 'CPF/CNPJ não informado') {
            console.log('👤 CPF do condutor para análise:', cpfCondutor);
            
            // Realizar análise completa de multa leve
             const resultadoAnalise = await multaLeveService.analisarMultaLeve(
               multaDataMapeada.codigoInfracao,
               cpfCondutor,
               new Date(multaInsert.data_infracao)
             );
             
             // Determinar tipo de gravidade
             const tipoGravidade = multaLeveService.determinarTipoGravidade(
               multaDataMapeada.codigoInfracao
             );
             
             // Atualizar campos no banco de dados
             await multaLeveService.atualizarCamposMultaLeve(
               multaSalva.id,
               resultadoAnalise,
               tipoGravidade
             );
             
             // Armazenar resultado da análise no estado
             setAnaliseMultaLeve(resultadoAnalise);
             
             // Log dos resultados
             console.log('📊 === RESULTADOS DA ANÁLISE ===');
             console.log('🏷️ Tipo de gravidade:', tipoGravidade);
             console.log('📋 É multa leve:', resultadoAnalise.isMultaLeve);
             console.log('📈 Tem histórico 12m:', resultadoAnalise.historicoCondutor.temHistorico);
             console.log('📝 Sugerir advertência:', resultadoAnalise.advertencia.sugerirAdvertencia);
             console.log('💬 Motivo:', resultadoAnalise.advertencia.motivo);
             
             // Mostrar toast informativo e exibir advertência se aplicável
             if (resultadoAnalise.isMultaLeve) {
               if (resultadoAnalise.advertencia.sugerirAdvertencia) {
                 toast.success('✅ Multa leve identificada! Advertência por escrito sugerida.');
                 // Exibir componente de advertência automaticamente
                 setShowAdvertencia(true);
               } else {
                 toast.info(`ℹ️ Multa leve identificada. ${resultadoAnalise.advertencia.motivo}`);
               }
             } else {
               toast.info(`ℹ️ Multa classificada como: ${tipoGravidade}`);
             }
            
          } else {
            console.log('⚠️ CPF do proprietário/cliente não disponível para análise de multa leve');
        toast.warning('⚠️ CPF do proprietário/cliente não disponível - análise de multa leve não realizada');
          }
          
        } catch (error: any) {
          console.error('❌ Erro na análise de multa leve:', error);
          toast.error('❌ Erro na análise de multa leve: ' + error.message);
        }
        
        console.log('✅ === ANÁLISE DE MULTA LEVE CONCLUÍDA ===');
      }
      
      console.log('✅ Multa salva automaticamente:', multaSalva);
      console.log('🆔 UUID da multa salva:', multaSalva?.id);
      
      if (!multaSalva?.id) {
        console.error('❌ ERRO: Multa salva mas sem ID válido!');
        throw new Error('Multa salva mas sem ID válido');
      }
      
      return multaSalva;
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar multa automaticamente:', error);
      return null;
    }
  };
  
  const updateServiceOrderWithMultaId = async (serviceOrderId: string, multaId: string) => {
    try {
      console.log('🔗 Atualizando service_orders com multa_id...');
      console.log('📋 Service Order ID:', serviceOrderId);
      console.log('🆔 Multa ID:', multaId);
      
      // Importar supabase client
      const { supabase } = await import('../lib/supabase');
      
      const { data, error } = await supabase
        .from('service_orders')
        .update({ multa_id: multaId })
        .eq('asaas_payment_id', serviceOrderId)
        .select();
      
      if (error) {
        console.error('❌ Erro ao atualizar service_orders:', error);
        throw error;
      }
      
      console.log('✅ Service_orders atualizado com multa_id:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Erro ao relacionar service_orders com multa:', error);
      return null;
    }
  };
  
  const updateServiceOrderWithRecursoId = async (serviceOrderId: string, recursoId: string) => {
    try {
      console.log('🔗 Atualizando service_orders com recurso_id...');
      console.log('📋 Service Order ID:', serviceOrderId);
      console.log('🆔 Recurso ID:', recursoId);
      
      // Importar supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Verificar se é UUID ou asaas_payment_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceOrderId);
      
      let query = supabase
        .from('service_orders')
        .update({ 
          recurso_id: recursoId,
          recurso_status: 'em_analise',
          recurso_initiated_at: new Date().toISOString()
        });
      
      if (isUUID) {
        query = query.eq('id', serviceOrderId);
      } else {
        query = query.eq('asaas_payment_id', serviceOrderId);
      }
      
      const { data, error } = await query.select();
      
      if (error) {
        console.error('❌ Erro ao atualizar service_orders com recurso_id:', error);
        throw error;
      }
      
      console.log('✅ Service_orders atualizado com recurso_id:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Erro ao vincular service_orders com recurso:', error);
      return null;
    }
  };
  
  const handleSaveMulta = async () => {
    try {
      // Esta função mantém a funcionalidade original para compatibilidade
      return await handleSaveMultaAutomatically(multaData);
    } catch (error: any) {
      console.error('❌ Erro ao salvar multa:', error);
      toast.error('Erro ao salvar multa: ' + error.message);
      throw error;
    }
  };

  const handleFinalize = async () => {
    // Salvar multa no banco de dados
    await handleSaveMulta();
    
    // Aqui também poderia salvar o recurso gerado
    alert('Recurso finalizado e multa salva no banco de dados!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recurso Inteligente
          </h1>
          <p className="text-gray-600">Sistema para criação de recursos de multa com assistência de inteligência artificial</p>
          
          {/* Cabeçalho compacto de informações do cliente */}
          {clienteData && (clienteData.nome || clienteData.service_order_id) ? (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <User className="w-3 h-3 text-blue-600 mr-1" />
                    <span className="text-xs font-medium text-blue-900">Requerente:</span>
                  </div>
                  
                  {/* Informações principais em linha */}
                  <div className="flex items-center space-x-3 text-xs">
                    {clienteData.nome && (
                      <span className="text-gray-700 font-medium">{clienteData.nome}</span>
                    )}
                    
                    {clienteData.cpf_cnpj && (
                       <span className="text-gray-600">{clienteData.cpf_cnpj}</span>
                     )}
                    
                    {clienteData.service_order_id && (
                      <span className="text-blue-600 font-mono">{clienteData.service_order_id}</span>
                    )}
                  </div>
                </div>
                
                {/* Indicador de status */}
                <div className="text-xs text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Dados carregados
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-2">
              <div className="flex items-center text-gray-500 text-xs">
                <User className="w-3 h-3 mr-1" />
                <span>Nenhum dado de cliente carregado</span>
              </div>
            </div>
          )}
          
          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'upload' ? 'text-blue-600' :
                ['extraction', 'recurso'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'extraction' ? 'text-blue-600' :
                currentStep === 'recurso' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <FileText className="w-5 h-5" />
              <span className="font-medium">Extração</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              n8nChatActive ? 'text-green-600' : 'text-gray-400'
            }`}>
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Chat IA</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'recurso' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <Eye className="w-5 h-5" />
              <span className="font-medium">Recurso</span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Seção 1: Upload de Documento */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              onClick={() => setIsUploadOpen(!isUploadOpen)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-50 -m-6 p-6 rounded-lg transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload de Documento
              </h2>
              {isUploadOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {isUploadOpen && (
              <div className="mt-4">
                {isProcessLocked ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Processo Protegido</h3>
                        <p className="text-gray-600 mb-2">
                          Os dados foram extraídos com sucesso e o processo está salvo.
                        </p>
                        <p className="text-sm text-gray-500">
                          ID do Processo: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{processId}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Documento processado e protegido contra alterações</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FileUpload
                    onFileSelect={handleFileUpload}
                    acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                    maxSize={10}
                  />
                )}
              </div>
            )}
          </div>

          {/* Seção 2: Dados Extraídos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              onClick={() => setIsDadosExtraidosOpen(!isDadosExtraidosOpen)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-50 -m-6 p-6 rounded-lg transition-colors"
            >
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Dados Extraídos
              </h2>
              {isDadosExtraidosOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {isDadosExtraidosOpen && (
              <div className="mt-4">
                <DataExtraction
                  data={multaData}
                  onDataChange={setMultaData}
                  onStartChat={() => {}} // Função vazia já que o chat inicia automaticamente
                  isLoading={isProcessing}
                />
              </div>
            )}
            
            {/* Botão para exibir advertência se disponível */}
            {analiseMultaLeve?.advertencia.sugerirAdvertencia && !showAdvertencia && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">
                        Advertência por Escrito Sugerida
                      </h4>
                      <p className="text-sm text-yellow-700">
                        Esta multa leve é elegível para advertência por escrito
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdvertencia(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Ver Advertência
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Seção 2.5: Advertência por Escrito (quando aplicável) */}
          {showAdvertencia && analiseMultaLeve?.advertencia.sugerirAdvertencia && (
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-yellow-500">
              <AdvertenciaEscrita
                analiseMultaLeve={analiseMultaLeve}
                dadosMulta={{
                  nomeCondutor: multaData.nomeProprietario || clienteData?.nome || 'Proprietário não identificado',
                  cpfCondutor: multaData.cpfCnpjProprietario || clienteData?.cpf_cnpj || 'CPF não informado',
                  dataInfracao: multaData.data || 'Data não informada',
                  localInfracao: multaData.local || 'Local não informado',
                  placaVeiculo: multaData.veiculo || 'Placa não informada',
                  descricaoInfracao: multaData.infracao || 'Infração não especificada',
                  codigoInfracao: multaData.codigoInfracao || 'Código não informado',
                  numeroAuto: multaData.numero || 'Número não informado',
                  orgaoAutuador: multaData.orgaoAutuador || 'Órgão Autuador'
                }}
                onClose={() => setShowAdvertencia(false)}
              />
            </div>
          )}

          {/* Seção 3: Chat com IA n8n */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
              Chat ICETRAN
              {n8nChatActive && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Ativo
                </span>
              )}
            </h2>
            
            <div className="flex-1">
              {n8nChatActive ? (
                <div className="h-full flex flex-col">
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg mb-4 max-h-96">
                    {n8nChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words overflow-wrap-anywhere ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 shadow-sm border'
                          }`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">
                            {message.content.split('\n').map((line, index, array) => (
                              <span key={index}>
                                {line}
                                {index < array.length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                          <p className="text-xs mt-1 opacity-70">
                            {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isN8nLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white text-gray-900 shadow-sm border px-4 py-2 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Icetran está pensando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input para enviar mensagens */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={n8nInputValue}
                      onChange={(e) => setN8nInputValue(e.target.value)}
                      onKeyPress={handleN8nKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isN8nLoading}
                    />
                    <button
                      onClick={() => sendN8nMessage(n8nInputValue)}
                      disabled={isN8nLoading || !n8nInputValue.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                  </div>
                  
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 Este chat está conectado ao sistema de IA para processamento avançado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-500">Complete a extração de dados para ativar o chat</p>
                </div>
              )}
            </div>
          </div>



          {/* Seção 3.6: Recursos Gerados pelo n8n */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <RecursosGerados
              multaId={multaId || undefined}
              chatSessionId={chatSessionId || undefined}
              companyId={clienteData?.cliente_id}
              onRecursoSelect={(recurso) => {
                console.log('📋 Recurso selecionado:', recurso);
                toast.success(`Recurso "${recurso.titulo}" selecionado`);
              }}
            />
          </div>

          {/* Seção 4: Recurso Gerado */}

        </div>
      </div>
      

    </div>
  );
};

export default TesteRecursoIA;