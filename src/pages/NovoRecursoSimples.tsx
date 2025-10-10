import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle,
  Loader2,
  Eye,
  AlertTriangle,
  User,
  Search,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import GeminiOcrService, { type DocumentoProcessado } from '../services/geminiOcrService';
import { useClientsStore, type ClientInsert } from '@/stores/clientsStore';
import { useMultasStore, type MultaInsert, type RecursoInsert } from '@/stores/multasStore';
import AiRecursoService, { default as aiRecursoService } from '@/services/aiRecursoService';
import { useAuthStore } from '@/stores/authStore';
import { clientsService } from '@/services/clientsService';
import HistoricoMultasModal from '@/components/HistoricoMultasModal';
import { ClienteModal } from '@/components/ClienteModal';
import { isMultaLeve, podeConverterEmAdvertencia, getTextoConversaoAdvertencia, type MultaData } from '@/utils/multaUtils';
import { asaasService } from '@/services/asaasService';

// Interfaces para compatibilidade com ClienteModal
interface Email {
  id: string;
  tipo: 'pessoal' | 'comercial' | 'alternativo';
  endereco: string;
  principal: boolean;
}

interface Contato {
  id: string;
  tipo: 'celular' | 'residencial' | 'comercial' | 'whatsapp';
  numero: string;
  principal: boolean;
}

interface Endereco {
  id: string;
  tipo: 'residencial' | 'comercial' | 'correspondencia';
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  principal: boolean;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  renavam: string;
  dataCadastro: string;
}

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  emails: Email[];
  telefones: Contato[];
  enderecos: Endereco[];
  dataNascimento: string;
  cnh: string;
  veiculos: Veiculo[];
  multas: number;
  recursosAtivos: number;
  valorEconomizado: number;
  dataCadastro: string;
  status: 'ativo' | 'inativo';
}

export default function NovoRecursoSimples() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients, addClient, isLoading: loadingClientes } = useClientsStore();
  const { addMulta, addRecurso } = useMultasStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingRecurso, setIsGeneratingRecurso] = useState(false);
  const [extractedData, setExtractedData] = useState<DocumentoProcessado | null>(null);
  
  // Estados para seleção de cliente
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [searchCliente, setSearchCliente] = useState('');
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  
  // Estados para modal de histórico
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [tipoRecurso, setTipoRecurso] = useState<'normal' | 'conversao'>('normal');
  
  // Função auxiliar para formatar valor da multa de forma robusta
  const formatarValorMulta = (valor: any): string => {
    console.log('🔍 Formatando valor da multa:', { valor, tipo: typeof valor });
    
    if (!valor && valor !== 0) {
      console.warn('⚠️ Valor da multa é null/undefined');
      return 'R$ 0,00';
    }
    
    let valorNumerico: number;
    
    if (typeof valor === 'number') {
      valorNumerico = valor;
    } else if (typeof valor === 'string') {
      // Remover caracteres não numéricos exceto vírgula e ponto
      const valorLimpo = valor.replace(/[^\d,.]/g, '').replace(',', '.');
      valorNumerico = parseFloat(valorLimpo) || 0;
    } else {
      console.warn('⚠️ Tipo de valor não reconhecido:', typeof valor);
      valorNumerico = 0;
    }
    
    if (valorNumerico <= 0) {
      console.warn('⚠️ Valor da multa é zero ou negativo:', valorNumerico);
      return 'R$ 0,00';
    }
    
    const valorFormatado = `R$ ${valorNumerico.toFixed(2).replace('.', ',')}`;
    console.log('✅ Valor formatado:', valorFormatado);
    return valorFormatado;
  };
  
  // Função para salvar novo cliente
  const handleSalvarNovoCliente = async (novoCliente: Partial<Cliente>) => {
    try {
      // Determinar company_id para o novo cliente
      const clientCompanyId = user?.company_id || 'default-company';
      
      // Extrair dados do primeiro email, telefone e endereço
      const primeiroEmail = novoCliente.emails?.[0]?.endereco || null;
      const primeiroTelefone = novoCliente.telefones?.[0]?.numero || null;
      const primeiroEndereco = novoCliente.enderecos?.[0];
      
      const clienteData: ClientInsert = {
        nome: novoCliente.nome || '',
        cpf_cnpj: novoCliente.cpf || '',
        email: primeiroEmail,
        telefone: primeiroTelefone,
        company_id: clientCompanyId,
        status: 'ativo' as const,
        endereco: primeiroEndereco?.logradouro || null,
        cidade: primeiroEndereco?.cidade || null,
        estado: primeiroEndereco?.estado || null,
        cep: primeiroEndereco?.cep || null
      };
      
      // Salvar através do store
      const clienteCriado = await addClient(clienteData);
      
      // Criar customer no Asaas
      if (clienteCriado?.id) {
        try {
          const asaasCustomerData = {
            name: novoCliente.nome || '',
            cpfCnpj: novoCliente.cpf || '',
            email: primeiroEmail,
            phone: primeiroTelefone,
            address: primeiroEndereco?.logradouro,
            addressNumber: primeiroEndereco?.numero,
            complement: primeiroEndereco?.complemento,
            province: primeiroEndereco?.bairro,
            city: primeiroEndereco?.cidade,
            state: primeiroEndereco?.estado,
            postalCode: primeiroEndereco?.cep?.replace(/\D/g, '')
          };

          const asaasCustomer = await asaasService.createCustomer(asaasCustomerData);
          
          // Atualizar cliente com asaas_customer_id através do clientsService
          await clientsService.updateClient(clienteCriado.id, {
            asaas_customer_id: asaasCustomer.id
          });

          console.log('Customer criado no Asaas:', asaasCustomer.id);
          toast.success('Cliente cadastrado com sucesso! Customer Asaas: ' + asaasCustomer.id);
        } catch (asaasError) {
          console.error('Erro ao criar customer no Asaas:', asaasError);
          toast.warning('Cliente criado, mas houve erro na integração com Asaas.');
        }
      } else {
        toast.success('Cliente cadastrado com sucesso!');
      }
      
      setShowNovoClienteModal(false);
      
      // Recarregar lista de clientes
      await loadClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao cadastrar cliente. Tente novamente.');
    }
  };
  
  // Carregar clientes do store
  useEffect(() => {
    if (currentStep === 3) {
      loadClientes();
    }
  }, [currentStep, user?.company_id]);
  
  const loadClientes = async () => {
    if (!user?.company_id) {
      toast.error('Empresa do usuário não encontrada. Faça login novamente.');
      return;
    }

    try {
      // Carregar clientes da empresa do usuário
      const filters = { status: 'ativo' as const, companyId: user.company_id };
      await fetchClients(filters);
      
      if (clients.length === 0) {
        toast.info('Nenhum cliente encontrado para esta empresa. Cadastre clientes primeiro.');
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes. Verifique sua conexão e tente novamente.');
    }
  };
  
  // Função para gerar código de infração baseado na descrição
  const gerarCodigoInfracao = (descricao: string | null | undefined): string => {
    if (!descricao) return 'OUTRAS';
    
    const descricaoLower = descricao.toLowerCase();
    
    // Mapear descrições para códigos reais do CTB (priorizando infrações leves)
    const mapeamentoCodigos: { [key: string]: string } = {
      // Infrações LEVES (Art. 161 a 169 do CTB)
      'dirigir sem atenção': '50110',
      'sem atenção': '50110',
      'cuidados indispensáveis': '50110',
      'distância de segurança': '50120',
      'distância lateral': '50120',
      'distância frontal': '50120',
      'preferência de passagem': '50130',
      'preferência pedestre': '50130',
      'pedestre': '50130',
      'estacionar em desacordo': '50140',
      'estacionamento irregular': '50140',
      'estacionar': '74580',
      'parar em local proibido': '50150',
      'parada proibida': '74560',
      'equipamento obrigatório': '50160',
      'equipamento ineficiente': '50160',
      'sem equipamento': '50170',
      'som ou ruído': '50180',
      'descarga livre': '50190',
      'silenciador defeituoso': '50190',
      'buzina': '50200',
      'afastado da guia': '74570',
      'contramão': '74590',
      
      // Outras infrações comuns
      'velocidade': '60630', // Excesso de velocidade até 20%
      'sinalização': '55410',
      'ultrapassagem': '60310',
      'conversão': '60420',
      'faixa': '60710',
      'semáforo': '60810',
      'cinto': '76830',
      'celular': '73890',
      'álcool': '70290'
    };
    
    console.log('🔍 Analisando descrição para código:', descricaoLower);
    
    // Procurar por palavras-chave na descrição (busca mais específica primeiro)
    for (const [frase, codigo] of Object.entries(mapeamentoCodigos)) {
      if (descricaoLower.includes(frase)) {
        console.log(`✅ Código encontrado: ${codigo} para "${frase}"`);
        return codigo;
      }
    }
    
    // Se não encontrar correspondência específica, tentar palavras individuais
    const palavrasChave = [
      'estacion', 'parar', 'parada', 'equipamento', 'atenção', 
      'distância', 'preferência', 'buzina', 'som', 'ruído'
    ];
    
    for (const palavra of palavrasChave) {
      if (descricaoLower.includes(palavra)) {
        // Retornar um código genérico de infração leve
        console.log(`⚠️ Palavra-chave encontrada: ${palavra}, usando código genérico leve`);
        return '50110'; // Código genérico para infração leve
      }
    }
    
    // Se não encontrar correspondência, gerar código baseado nas primeiras letras
    const palavras = descricaoLower.split(' ').filter(p => p.length > 2);
    if (palavras.length > 0) {
      const iniciais = palavras.slice(0, 3).map(p => p.charAt(0).toUpperCase()).join('');
      const codigoGerado = `${iniciais}001`.substring(0, 6);
      console.log(`🔧 Código gerado: ${codigoGerado}`);
      return codigoGerado;
    }
    
    console.log('❌ Nenhum código encontrado, usando OUTRAS');
    return 'OUTRAS';
  };

  // Função para converter data do formato brasileiro (DD/MM/AAAA) para formato ISO (YYYY-MM-DD)
  const converterDataParaISO = (dataBrasileira: string | null | undefined): string => {
    if (!dataBrasileira || dataBrasileira.trim() === '') {
      // Se não há data, usar data atual
      return new Date().toISOString().split('T')[0];
    }
    
    try {
      // Verificar se já está no formato ISO (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataBrasileira)) {
        return dataBrasileira;
      }
      
      // Converter do formato brasileiro DD/MM/AAAA
      const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = dataBrasileira.match(regex);
      
      if (!match) {
        console.warn('Formato de data inválido:', dataBrasileira);
        return new Date().toISOString().split('T')[0];
      }
      
      const [, dia, mes, ano] = match;
      const diaFormatado = dia.padStart(2, '0');
      const mesFormatado = mes.padStart(2, '0');
      
      // Validar se a data é válida
      const dataISO = `${ano}-${mesFormatado}-${diaFormatado}`;
      const dataValidacao = new Date(dataISO);
      
      if (isNaN(dataValidacao.getTime()) || 
          dataValidacao.getFullYear() != parseInt(ano) ||
          dataValidacao.getMonth() + 1 != parseInt(mes) ||
          dataValidacao.getDate() != parseInt(dia)) {
        console.warn('Data inválida:', dataBrasileira);
        return new Date().toISOString().split('T')[0];
      }
      
      return dataISO;
    } catch (error) {
      console.error('Erro ao converter data:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  const gerarRecursoCompleto = async () => {
    if (!clienteSelecionado || !extractedData || !uploadedFile) {
      toast.error('Dados incompletos para gerar recurso');
      return;
    }
    
    // Validação crítica do valor da multa antes de gerar recurso
    const valorNormalizado = typeof extractedData.valorMulta === 'number'
      ? extractedData.valorMulta
      : parseFloat(String(extractedData.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    if (valorNormalizado <= 0) {
      console.error('❌ ERRO CRÍTICO: Tentativa de gerar recurso com valor de multa inválido:', {
        valorOriginal: extractedData.valorMulta,
        valorNormalizado,
        clienteSelecionado: clienteSelecionado.nome
      });
      toast.error('Erro: Não é possível gerar recurso com valor de multa zero ou inválido. Verifique os dados extraídos.');
      return;
    }
    
    console.log('✅ Validação final aprovada. Gerando recurso com valor:', valorNormalizado);
    if (!user?.company_id) {
      toast.error('Empresa do usuário não encontrada. Faça login novamente.');
      return;
    }
    
    const companyId = user.company_id;
    
    setIsGeneratingRecurso(true);
    
    try {
      // 1. Criar a multa no banco de dados
      toast.info('Criando multa no sistema...');
      
      const valorNormalizado = typeof extractedData.valorMulta === 'number'
        ? extractedData.valorMulta
        : parseFloat(String(extractedData.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;

      const multaData: MultaInsert = {
        company_id: companyId,
        client_id: clienteSelecionado.id,
        numero_auto: (extractedData.numeroAuto || '').substring(0, 50), // VARCHAR(50)
        placa_veiculo: (extractedData.placaVeiculo || '').substring(0, 10), // VARCHAR(10)
        data_infracao: converterDataParaISO(extractedData.dataInfracao),
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valor_original: valorNormalizado,
        valor_final: valorNormalizado,
        status: 'pendente' as const,
        codigo_infracao: gerarCodigoInfracao(extractedData.descricaoInfracao), // VARCHAR(20) - já tratado
        local_infracao: extractedData.localInfracao || null, // TEXT - sem limite
        descricao_infracao: extractedData.descricaoInfracao || null, // TEXT - sem limite
        // orgao_autuador removido - não existe na interface MultaInsert
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const novaMulta = await addMulta(multaData);
      
      // 2. Gerar recurso usando IA
      toast.info('Gerando recurso com IA...');
      
      // Verificar se o serviço de IA está configurado
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        toast.error('Serviço de IA não configurado. Verifique a variável VITE_GEMINI_API_KEY');
        return;
      }
      
      // Determinar tipo de documento baseado na resposta do modal
      const tipoDocumento = tipoRecurso === 'conversao' ? 'conversao_advertencia' : 'defesa_previa';
      const aiService = aiRecursoService;
      const recursoGerado = await aiService.gerarRecurso(extractedData, clienteSelecionado.nome, tipoDocumento);
      
      // 3. Criar o recurso no banco de dados
      toast.info('Salvando recurso no sistema...');
      
      const recursoData: RecursoInsert = {
        multa_id: novaMulta.id,
        company_id: companyId,
        numero_processo: `REC-${Date.now()}`, // Gerar número de processo único
        data_protocolo: new Date().toISOString().split('T')[0], // Formato DATE (YYYY-MM-DD)
        tipo_recurso: recursoGerado.tipo || 'defesa_previa',
        fundamentacao: `${recursoGerado.argumentacao}\n\nFundamentação legal:\n${recursoGerado.fundamentacao_legal}\n\nPedido:\n${recursoGerado.pedido}`,
        documentos_anexos: [],
        status: 'em_analise' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await addRecurso(recursoData);
      
      // 4. Sucesso - redirecionar para detalhes da multa
      toast.success('Recurso gerado com sucesso!');
      
      // Redirecionar para a página de detalhes da multa criada
      navigate(`/multas/${novaMulta.id}`);
      
    } catch (error) {
      console.error('Erro ao gerar recurso completo:', error);
      toast.error('Erro ao gerar recurso. Tente novamente.');
    } finally {
      setIsGeneratingRecurso(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use JPG, PNG ou PDF.');
        return;
      }
      
      // Validar tamanho (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 50MB.');
        return;
      }
      
      setUploadedFile(file);
      toast.success('Arquivo carregado com sucesso!');
    }
  };
  
  const processDocument = async () => {
    if (!uploadedFile) return;
    
    // Verificar se a API do Gemini está configurada
    if (!GeminiOcrService.isConfigured()) {
      toast.error('API do Gemini não configurada. Verifique a variável VITE_GEMINI_API_KEY no arquivo .env');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Criar instância do serviço Gemini OCR
      const geminiService = new GeminiOcrService();
      
      // Processar documento com Gemini OCR
      const dadosExtraidos = await geminiService.extrairDadosAutoInfracao(uploadedFile);
      
      // Validação crítica dos dados extraídos
      console.log('🔍 Dados extraídos do OCR:', dadosExtraidos);
      
      if (!dadosExtraidos) {
        throw new Error('Nenhum dado foi extraído do documento');
      }
      
      // Validar valor da multa
      const valorValidado = typeof dadosExtraidos.valorMulta === 'number' 
        ? dadosExtraidos.valorMulta 
        : parseFloat(String(dadosExtraidos.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      if (valorValidado <= 0) {
        console.warn('⚠️ Valor da multa extraído é inválido:', dadosExtraidos.valorMulta);
        // Tentar extrair valor de outros campos ou usar valor padrão
        dadosExtraidos.valorMulta = 100; // Valor padrão para teste
        toast.warning('Valor da multa não foi detectado corretamente. Verifique os dados extraídos.');
      }
      
      // Garantir que o valor seja numérico
      dadosExtraidos.valorMulta = valorValidado > 0 ? valorValidado : 100;
      
      console.log('✅ Dados validados e prontos para uso:', {
        valorMulta: dadosExtraidos.valorMulta,
        numeroAuto: dadosExtraidos.numeroAuto,
        placaVeiculo: dadosExtraidos.placaVeiculo
      });
      
      setExtractedData(dadosExtraidos);
      
      // Verificar se é multa leve para mostrar pergunta sobre histórico
      const valorNormalizado = typeof dadosExtraidos.valorMulta === 'number'
        ? dadosExtraidos.valorMulta
        : parseFloat(String(dadosExtraidos.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const multaData: MultaData = {
        valor_original: valorNormalizado,
        valor_final: valorNormalizado,
        codigo_infracao: gerarCodigoInfracao(dadosExtraidos.descricaoInfracao),
        descricao_infracao: dadosExtraidos.descricaoInfracao || ''
      };
      
      if (isMultaLeve(multaData)) {
        toast.info('Multa leve detectada! Verificando possibilidade de conversão em advertência...');
        setShowHistoricoModal(true);
        // Não avança para próxima etapa ainda - aguarda resposta do modal
      } else {
        setCurrentStep(2);
      }
      
      toast.success('Documento processado com sucesso pela IA!');
      
    } catch (error) {
      console.error('Erro no processamento OCR:', error);
      
      if (error instanceof Error) {
        toast.error(`Erro ao processar documento: ${error.message}`);
      } else {
        toast.error('Erro desconhecido ao processar documento. Tente novamente.');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleHistoricoResponse = (temHistorico: boolean) => {
    if (!extractedData) {
      console.error('❌ extractedData não encontrado no handleHistoricoResponse');
      return;
    }
    
    // Debug: Log do estado antes do processamento
    console.log('🔍 Estado do extractedData ANTES do processamento:', {
      valorMulta: extractedData.valorMulta,
      tipo: typeof extractedData.valorMulta,
      numeroAuto: extractedData.numeroAuto,
      placaVeiculo: extractedData.placaVeiculo
    });
    
    const valorNormalizado = typeof extractedData.valorMulta === 'number'
      ? extractedData.valorMulta
      : parseFloat(String(extractedData.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    // Validação crítica: garantir que o valor não seja zero
    if (valorNormalizado <= 0) {
      console.error('❌ ERRO CRÍTICO: Valor da multa é zero ou inválido!', {
        valorOriginal: extractedData.valorMulta,
        valorNormalizado,
        extractedData
      });
      toast.error('Erro: Valor da multa não pode ser zero. Verifique o documento.');
      return;
    }
    
    const multaData: MultaData = {
      valor_original: valorNormalizado,
      valor_final: valorNormalizado,
      codigo_infracao: gerarCodigoInfracao(extractedData.descricaoInfracao),
      descricao_infracao: extractedData.descricaoInfracao || ''
    };
    
    // Debug logs para rastrear a lógica de conversão
    console.log('🔍 Análise de conversão em advertência:');
    console.log('- Tem histórico:', temHistorico);
    console.log('- Valor da multa:', valorNormalizado);
    console.log('- Código infração:', multaData.codigo_infracao);
    console.log('- É multa leve:', isMultaLeve(multaData));
    console.log('- Pode converter:', podeConverterEmAdvertencia(multaData, temHistorico));
    
    // CORREÇÃO: Passar temHistorico em vez de false
    if (!temHistorico && podeConverterEmAdvertencia(multaData, temHistorico)) {
      setTipoRecurso('conversao');
      toast.success(
        `✅ Multa pode ser convertida em advertência por escrito!\n\n` +
        `📋 Conforme Art. 267 do CTB:\n` +
        `• Infração LEVE (R$ ${valorNormalizado.toFixed(2)})\n` +
        `• Sem histórico de multas nos últimos 12 meses\n\n` +
        `O documento será gerado automaticamente.`,
        { duration: 6000 }
      );
    } else {
      setTipoRecurso('normal');
      if (temHistorico) {
        toast.info(
          `ℹ️ Recurso de defesa prévia normal será gerado.\n\n` +
          `❌ Não é possível converter em advertência:\n` +
          `• Condutor possui histórico de multas nos últimos 12 meses`,
          { duration: 5000 }
        );
      } else if (!isMultaLeve(multaData)) {
        toast.info(
          `ℹ️ Recurso de defesa prévia normal será gerado.\n\n` +
          `❌ Não é possível converter em advertência:\n` +
          `• Infração não é classificada como LEVE (R$ ${valorNormalizado.toFixed(2)})`,
          { duration: 5000 }
        );
      } else {
        toast.info('Será gerado recurso de defesa prévia normal.');
      }
    }
    
    // Debug: Log do estado APÓS o processamento
    console.log('🔍 Estado do extractedData APÓS o processamento:', {
      valorMulta: extractedData.valorMulta,
      tipo: typeof extractedData.valorMulta,
      valorNormalizado,
      numeroAuto: extractedData.numeroAuto
    });
    
    setShowHistoricoModal(false);
    setCurrentStep(2);
  };
  
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload do Auto de Infração
        </h2>
        <p className="text-gray-600">
          Faça o upload do documento para que nossa IA extraia automaticamente as informações
        </p>
      </div>
      
      {/* Aviso sobre configuração da API */}
      {!GeminiOcrService.isConfigured() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">
                API do Gemini não configurada
              </p>
              <p className="text-sm text-yellow-700">
                Para usar o OCR real, configure a variável VITE_GEMINI_API_KEY no arquivo .env
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        {!uploadedFile ? (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Clique para fazer upload ou arraste o arquivo
              </p>
              <p className="text-sm text-gray-500">
                Formatos aceitos: JPG, PNG, PDF (máx. 50MB)
              </p>
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileUpload}
              className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Arquivo carregado: {uploadedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                Tamanho: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setUploadedFile(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Remover
              </button>
              
              <button
                onClick={processDocument}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Processar Documento
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="font-medium text-blue-900">
                Processando documento...
              </p>
              <p className="text-sm text-blue-700">
                Nossa IA está extraindo as informações do auto de infração
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderExtractedDataStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dados Extraídos do Documento
        </h2>
        <p className="text-gray-600">
          Verifique se as informações extraídas estão corretas
        </p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do Auto
            </label>
            <input
              type="text"
              value={extractedData?.numeroAuto || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa do Veículo
            </label>
            <input
              type="text"
              value={extractedData?.placaVeiculo || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data da Infração
            </label>
            <input
              type="text"
              value={extractedData?.dataInfracao || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora da Infração
            </label>
            <input
              type="text"
              value={extractedData?.horaInfracao || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Local da Infração
            </label>
            <input
              type="text"
              value={extractedData?.localInfracao || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código da Infração
            </label>
            <input
              type="text"
              value={extractedData?.codigoInfracao || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor da Multa *
            </label>
            <input
              type="text"
              value={formatarValorMulta(extractedData?.valorMulta)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !extractedData?.valorMulta || extractedData.valorMulta <= 0 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              readOnly
            />
            {(!extractedData?.valorMulta || extractedData.valorMulta <= 0) && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ Valor da multa é obrigatório e deve ser maior que zero
              </p>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição da Infração
            </label>
            <textarea
              value={extractedData?.descricaoInfracao || ''}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Órgão Autuador
            </label>
            <input
              type="text"
              value={extractedData?.orgaoAutuador || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condutor
            </label>
            <input
              type="text"
              value={extractedData?.condutor || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Voltar
        </button>
        
        <button
          onClick={() => {
            // Validar dados antes de prosseguir
            if (!extractedData?.valorMulta || extractedData.valorMulta <= 0) {
              toast.error('Erro: Valor da multa é obrigatório e deve ser maior que zero.');
              return;
            }
            
            if (!extractedData?.numeroAuto) {
              toast.error('Erro: Número do auto de infração é obrigatório.');
              return;
            }
            
            if (!extractedData?.placaVeiculo) {
              toast.error('Erro: Placa do veículo é obrigatória.');
              return;
            }
            
            console.log('✅ Validação dos dados extraídos passou. Prosseguindo para seleção de cliente.');
            setCurrentStep(3);
            toast.success('Dados confirmados! Selecione o requerente.');
          }}
          className={`px-6 py-2 rounded-lg ${
            !extractedData?.valorMulta || extractedData.valorMulta <= 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
          disabled={!extractedData?.valorMulta || extractedData.valorMulta <= 0}
        >
          Próximo: Selecionar Requerente
        </button>
      </div>
    </div>
  );
  
  const renderClientSelectionStep = () => {
    // Converter clientes do store para o formato local
    const clientesConvertidos: Cliente[] = clients.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf_cnpj,
      emails: [{
        id: '1',
        tipo: 'pessoal' as const,
        endereco: cliente.email || '',
        principal: true
      }],
      telefones: [{
        id: '1',
        tipo: 'celular' as const,
        numero: cliente.telefone || '',
        principal: true
      }],
      enderecos: [{
        id: '1',
        tipo: 'residencial' as const,
        logradouro: cliente.endereco || '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        cep: cliente.cep || '',
        principal: true
      }],
      dataNascimento: '',
      cnh: '',
      veiculos: [],
      multas: 0,
      recursosAtivos: 0,
      valorEconomizado: 0,
      dataCadastro: cliente.created_at || new Date().toISOString(),
      status: cliente.status
    }));
    
    const filteredClientes = clientesConvertidos.filter(cliente => 
      cliente.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
      cliente.cpf.includes(searchCliente)
    );
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Selecionar Requerente do Recurso
          </h2>
          <p className="text-gray-600">
            Escolha o cliente que será o requerente deste recurso de multa
          </p>
        </div>
        
        {/* Barra de busca e botão novo cliente */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={searchCliente}
              onChange={(e) => setSearchCliente(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowNovoClienteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </button>
        </div>
        
        {/* Lista de clientes */}
        <div className="bg-white border border-gray-200 rounded-lg">
          {loadingClientes ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Carregando clientes...</p>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="p-8 text-center">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                {searchCliente ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
              <button
                onClick={() => setShowNovoClienteModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >Cadastrar primeiro cliente</button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredClientes.map((cliente) => (
                <div
                  key={cliente.id}
                  onClick={() => setClienteSelecionado(cliente)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    clienteSelecionado?.id === cliente.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          clienteSelecionado?.id === cliente.id ? 'bg-blue-600' : 'bg-gray-300'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{cliente.nome}</h3>
                          <p className="text-sm text-gray-600">{cliente.cpf}</p>
                          {cliente.emails[0]?.endereco && (
                            <p className="text-sm text-gray-500">{cliente.emails[0].endereco}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cliente.status === 'ativo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cliente.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Cliente selecionado */}
        {clienteSelecionado && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  Cliente selecionado: {clienteSelecionado.nome}
                </p>
                <p className="text-sm text-blue-700">
                  {clienteSelecionado.cpf}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Botões de navegação */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Voltar
          </button>
          
          <button
            onClick={gerarRecursoCompleto}
            disabled={!clienteSelecionado || isGeneratingRecurso}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingRecurso ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando Recurso...
              </>
            ) : (
              'Gerar Recurso'
            )}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/recursos')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Voltar
              </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <h1 className="text-xl font-semibold text-gray-900">
                Novo Recurso de Multa
              </h1>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Passo {currentStep} de 3</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center">
              <div className={`flex items-center ${
                currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">
                  Upload do Documento
                </span>
              </div>
              
              <div className={`flex-1 h-1 mx-4 ${
                currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
              
              <div className={`flex items-center ${
                currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">
                  Verificar Dados
                </span>
              </div>
              
              <div className={`flex-1 h-1 mx-4 ${
                currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
              
              <div className={`flex items-center ${
                currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">
                  Selecionar Requerente
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 1 && renderUploadStep()}
        {currentStep === 2 && renderExtractedDataStep()}
        {currentStep === 3 && renderClientSelectionStep()}
      </div>
      
      {/* Modal de Histórico de Multas */}
      {showHistoricoModal && extractedData && (
        <HistoricoMultasModal
          isOpen={showHistoricoModal}
          onClose={() => setShowHistoricoModal(false)}
          multa={{
            valor_original: parseFloat(extractedData.valorMulta?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0'),
            valor_final: parseFloat(extractedData.valorMulta?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0'),
            codigo_infracao: extractedData.codigoInfracao || '',
            descricao_infracao: extractedData.descricaoInfracao || ''
          }}
          onResponse={handleHistoricoResponse}
        />
      )}
      
      {/* Modal de Novo Cliente */}
      <ClienteModal
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        onSave={handleSalvarNovoCliente}
      />
    </div>
  );
}
