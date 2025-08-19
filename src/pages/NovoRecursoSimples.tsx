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
import { useClientsStore } from '@/stores/clientsStore';
import { useMultasStore, type MultaInsert, type RecursoInsert } from '@/stores/multasStore';
import AiRecursoService, { default as aiRecursoService } from '@/services/aiRecursoService';
import { useAuthStore } from '@/stores/authStore';
import HistoricoMultasModal from '@/components/HistoricoMultasModal';
import { isMultaLeve, podeConverterEmAdvertencia, getTextoConversaoAdvertencia, type MultaData } from '@/utils/multaUtils';

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  status: 'ativo' | 'inativo';
}

export default function NovoRecursoSimples() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients, isLoading: loadingClientes } = useClientsStore();
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
  
  // Estados para modal de histórico de multas
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [tipoRecurso, setTipoRecurso] = useState<'normal' | 'conversao'>('normal');
  
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
      // Carregar clientes reais da empresa do usuário logado
      await fetchClients({ status: 'ativo', companyId: user.company_id });
      
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
    
    // Mapear descrições comuns para códigos conhecidos
    const mapeamentoCodigos: { [key: string]: string } = {
      'velocidade': 'VEL001',
      'estacionamento': 'EST001', 
      'sinalização': 'SIN001',
      'ultrapassagem': 'ULT001',
      'conversão': 'CON001',
      'parada': 'PAR001',
      'faixa': 'FAI001',
      'semáforo': 'SEM001',
      'preferencial': 'PRE001',
      'cinto': 'CIN001',
      'celular': 'CEL001',
      'álcool': 'ALC001'
    };
    
    const descricaoLower = descricao.toLowerCase();
    
    // Procurar por palavras-chave na descrição
    for (const [palavra, codigo] of Object.entries(mapeamentoCodigos)) {
      if (descricaoLower.includes(palavra)) {
        return codigo;
      }
    }
    
    // Se não encontrar correspondência, gerar código baseado nas primeiras letras
    const palavras = descricaoLower.split(' ').filter(p => p.length > 2);
    if (palavras.length > 0) {
      const iniciais = palavras.slice(0, 3).map(p => p.charAt(0).toUpperCase()).join('');
      return `${iniciais}001`.substring(0, 6);
    }
    
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
    if (!user?.company_id) {
      toast.error('Empresa do usuário não encontrada. Faça login novamente.');
      return;
    }
    
    setIsGeneratingRecurso(true);
    
    try {
      // 1. Criar a multa no banco de dados
      toast.info('Criando multa no sistema...');
      
      const valorNormalizado = typeof extractedData.valorMulta === 'number'
        ? extractedData.valorMulta
        : parseFloat(String(extractedData.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;

      const multaData: MultaInsert = {
        company_id: user.company_id,
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
        company_id: user.company_id,
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
    if (!extractedData) return;
    
    const valorNormalizado = typeof extractedData.valorMulta === 'number'
      ? extractedData.valorMulta
      : parseFloat(String(extractedData.valorMulta).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    const multaData: MultaData = {
      valor_original: valorNormalizado,
      valor_final: valorNormalizado,
      codigo_infracao: gerarCodigoInfracao(extractedData.descricaoInfracao),
      descricao_infracao: extractedData.descricaoInfracao || ''
    };
    
    if (!temHistorico && podeConverterEmAdvertencia(multaData, false)) {
      setTipoRecurso('conversao');
      toast.success('Multa pode ser convertida em advertência! O documento será gerado automaticamente.');
    } else {
      setTipoRecurso('normal');
      if (temHistorico) {
        toast.info('Como há histórico de multas, será gerado recurso de defesa prévia normal.');
      } else {
        toast.info('Será gerado recurso de defesa prévia normal.');
      }
    }
    
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
              Valor da Multa
            </label>
            <input
              type="text"
              value={extractedData?.valorMulta ? `R$ ${extractedData.valorMulta.toFixed(2)}` : ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
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
            setCurrentStep(3);
            toast.success('Dados confirmados! Selecione o requerente.');
          }}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Próximo: Selecionar Requerente
        </button>
      </div>
    </div>
  );
  
  const renderClientSelectionStep = () => {
    const filteredClientes = clients.filter(cliente => 
      cliente.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
      cliente.cpf_cnpj.includes(searchCliente)
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
              >
                Cadastrar primeiro cliente
              </button>
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
                          <p className="text-sm text-gray-600">{cliente.cpf_cnpj}</p>
                          {cliente.email && (
                            <p className="text-sm text-gray-500">{cliente.email}</p>
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
                  {clienteSelecionado.cpf_cnpj}
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
    </div>
  );
}
