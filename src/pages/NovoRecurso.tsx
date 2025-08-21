import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle,
  Loader2,
  Eye,
  User,
  Search,
  AlertCircle,
  FileText,
  Brain,
  Scale,
  Sparkles,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import RecursoService, { DadosInfracao, DadosCliente, DadosVeiculo, ContextoJuridico } from '@/services/recursoService';
import FeedbackRecurso from '@/components/FeedbackRecurso';
import HistoricoMultasModal from '@/components/HistoricoMultasModal';
import { isMultaLeve, podeConverterEmAdvertencia, getTextoConversaoAdvertencia, MultaData } from '@/utils/multaUtils';
import { useClientsStore } from '@/stores/clientsStore';
import { useAuthStore } from '@/stores/authStore';

interface DocumentoProcessado {
  numeroAuto: string;
  dataInfracao: string;
  horaInfracao: string;
  localInfracao: string;
  codigoInfracao: string;
  descricaoInfracao: string;
  valorMulta: number;
  placaVeiculo: string;
  condutor?: string;
  orgaoAutuador: string;
  agente?: string;
  observacoes?: string;
}

// Mock data
interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  status: 'ativo' | 'inativo';
}

interface Veiculo {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
}

// Dados mockados removidos - agora usando dados reais do store

const veiculosMock: Veiculo[] = [
  { id: '1', marca: 'Toyota', modelo: 'Corolla', placa: 'ABC-1234', ano: 2020 },
  { id: '2', marca: 'Honda', modelo: 'Civic', placa: 'XYZ-5678', ano: 2019 },
];

// Modal simples para cadastro de cliente
interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: any) => void;
}

function NovoClienteModal({ isOpen, onClose, onSave }: NovoClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cpf_cnpj) {
      toast.error('Nome e CPF/CNPJ são obrigatórios');
      return;
    }
    
    onSave(formData);
    setFormData({ nome: '', cpf_cnpj: '', email: '', telefone: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Novo Cliente</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nome completo"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF/CNPJ *
            </label>
            <input
              type="text"
              value={formData.cpf_cnpj}
              onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="000.000.000-00"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NovoRecurso() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clients, fetchClients, addClient, isLoading: loadingClientes } = useClientsStore();
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [processandoOCR, setProcessandoOCR] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null);
  const [documentoUpload, setDocumentoUpload] = useState<File | null>(null);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosInfracao | null>(null);
  const [contextoJuridico, setContextoJuridico] = useState<ContextoJuridico | null>(null);
  const [gerandoRecurso, setGerandoRecurso] = useState(false);
  const [recursoGerado, setRecursoGerado] = useState<string>('');
  const [recursoId, setRecursoId] = useState<string>('');
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [tipoRecurso, setTipoRecurso] = useState<'normal' | 'conversao'>('normal');
  
  const recursoService = RecursoService.getInstance();

  // Carregar clientes quando acessar etapa 1
  useEffect(() => {
    if (etapaAtual === 1 && (user?.company_id || user?.role === 'admin_master')) {
      loadClientes();
    }
  }, [etapaAtual, user?.company_id, user?.role]);
  
  const loadClientes = async () => {
    // Super admin pode acessar sem company_id específico
    if (!user?.company_id && user?.role !== 'admin_master') {
      toast.error('Empresa do usuário não encontrada. Faça login novamente.');
      return;
    }

    try {
      // Para admin_master, não passar filtro de companyId para ver todos os clientes
      // Para outros usuários, filtrar pela empresa
      const filters = user?.role === 'admin_master' 
        ? { status: 'ativo' as const }
        : { status: 'ativo' as const, companyId: user.company_id };
      
      await fetchClients(filters);
      
      if (clients.length === 0) {
        const message = user?.role === 'admin_master' 
          ? 'Nenhum cliente encontrado no sistema. Cadastre clientes primeiro.'
          : 'Nenhum cliente encontrado para esta empresa. Cadastre clientes primeiro.';
        toast.info(message);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes. Verifique sua conexão e tente novamente.');
    }
  };
  
  const clientesFiltrados = clients.filter(cliente =>
    cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    cliente.cpf_cnpj.includes(buscaCliente)
  );
  
  // Função para salvar novo cliente
  const handleSalvarNovoCliente = async (dadosCliente: any) => {
    try {
      if (!user?.company_id) {
        toast.error('Empresa do usuário não encontrada');
        return;
      }
      
      const novoCliente = {
        ...dadosCliente,
        company_id: user.company_id,
        status: 'ativo' as const
      };
      
      await addClient(novoCliente);
      toast.success('Cliente cadastrado com sucesso!');
      setShowNovoClienteModal(false);
      
      // Recarregar clientes
      await fetchClients({ status: 'ativo', companyId: user.company_id });
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setEtapaAtual(2);
  };

  const handleSelecionarVeiculo = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo);
    setEtapaAtual(3);
  };

  const handleUploadDocumento = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!tiposPermitidos.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use PDF, JPG ou PNG.');
        return;
      }

      // Validar tamanho (máximo 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 50MB.');
        return;
      }

      setDocumentoUpload(file);
      toast.success('Documento carregado com sucesso!');
    }
  };

  const handleProcessarOCR = async () => {
    if (!documentoUpload) {
      toast.error('Nenhum documento selecionado');
      return;
    }

    setProcessandoOCR(true);
    try {
      // Simular extração de dados (aqui seria integração com Gemini OCR)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Dados mockados extraídos do documento
      const dadosMock: DadosInfracao = {
        numeroAuto: '123456789',
        dataInfracao: '15/01/2024',
        horaInfracao: '14:30',
        localInfracao: 'Av. Paulista, 1000 - São Paulo/SP',
        codigoInfracao: '554-10',
        descricaoInfracao: 'Estacionar em local proibido pela sinalização',
        valorMulta: 195.23,
        placaVeiculo: veiculoSelecionado?.placa || '',
        orgaoAutuador: 'CET - São Paulo',
        agente: 'João Silva',
        observacoes: 'Veículo estacionado em vaga para deficientes'
      };
      
      setDadosExtraidos(dadosMock);
      
      // Verifica se é multa leve
      const multaData: MultaData = {
        valor_original: dadosMock.valorMulta,
        valor_final: dadosMock.valorMulta,
        codigo_infracao: dadosMock.codigoInfracao,
        descricao_infracao: dadosMock.descricaoInfracao
      };
      
      if (isMultaLeve(multaData)) {
        toast.info('Multa leve detectada! Verificando possibilidade de conversão em advertência...');
        setShowHistoricoModal(true);
        return; // Para aqui e aguarda resposta do modal
      }
      
      // Busca contexto jurídico relevante
      toast.info('Buscando fundamentação jurídica...');
      const contexto = await recursoService.buscarContextoJuridico(dadosMock);
      setContextoJuridico(contexto);
      
      toast.success('Documento processado e contexto jurídico carregado!');
      setEtapaAtual(4);
    } catch (error) {
      console.error('Erro ao processar OCR:', error);
      toast.error('Erro ao processar documento');
    } finally {
      setProcessandoOCR(false);
    }
  };
  
  const handleHistoricoResponse = async (possuiHistorico: boolean) => {
    if (!dadosExtraidos) return;
    
    const multaData: MultaData = {
      valor_original: dadosExtraidos.valorMulta,
      valor_final: dadosExtraidos.valorMulta,
      codigo_infracao: dadosExtraidos.codigoInfracao,
      descricao_infracao: dadosExtraidos.descricaoInfracao
    };
    
    if (podeConverterEmAdvertencia(multaData, possuiHistorico)) {
      setTipoRecurso('conversao');
      toast.success('Será gerado pedido de conversão em advertência!');
    } else {
      setTipoRecurso('normal');
      if (possuiHistorico) {
        toast.info('Como há histórico de multas, seguirá o fluxo normal de recurso.');
      }
    }
    
    // Continua com a busca do contexto jurídico
    try {
      toast.info('Buscando fundamentação jurídica...');
      const contexto = await recursoService.buscarContextoJuridico(dadosExtraidos);
      setContextoJuridico(contexto);
      
      toast.success('Documento processado e contexto jurídico carregado!');
      setEtapaAtual(4);
    } catch (error) {
      console.error('Erro ao buscar contexto jurídico:', error);
      toast.error('Erro ao buscar fundamentação jurídica');
    }
  };

  const handleGerarRecurso = async () => {
    if (!clienteSelecionado || !veiculoSelecionado || !dadosExtraidos) {
      toast.error('Dados incompletos para gerar recurso');
      return;
    }
    
    setGerandoRecurso(true);
    try {
      const dadosCliente: DadosCliente = {
        id: clienteSelecionado.id,
        nome: clienteSelecionado.nome,
        cpf: clienteSelecionado.cpf_cnpj,
        email: clienteSelecionado.email
      };
      
      const dadosVeiculo: DadosVeiculo = {
        id: veiculoSelecionado.id,
        marca: veiculoSelecionado.marca,
        modelo: veiculoSelecionado.modelo,
        placa: veiculoSelecionado.placa,
        ano: veiculoSelecionado.ano
      };
      
      // Determina o tipo de documento a ser gerado
      const tipoDocumento = tipoRecurso === 'conversao' ? 'defesa_previa' : 'defesa_previa';
      
      const recurso = await recursoService.gerarRecurso(
        dadosCliente,
        dadosVeiculo,
        dadosExtraidos,
        tipoDocumento
      );
      
      setRecursoGerado(recurso.conteudo_recurso);
      setRecursoId(recurso.id);
      toast.success('Recurso gerado com sucesso!');
      setEtapaAtual(5);
    } catch (error) {
      console.error('Erro ao gerar recurso:', error);
      toast.error('Erro ao gerar recurso');
    } finally {
      setGerandoRecurso(false);
    }
  };

  const renderEtapa1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <User className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecionar Cliente</h2>
        <p className="text-gray-600">Escolha o cliente para o qual será gerado o recurso</p>
      </div>

      {/* Busca de Cliente e Botão Novo Cliente */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={() => setShowNovoClienteModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {loadingClientes ? (
          <div className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Carregando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {buscaCliente ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
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
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => handleSelecionarCliente(cliente)}
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600">CPF/CNPJ: {cliente.cpf_cnpj}</p>
                    {cliente.email && (
                      <p className="text-sm text-gray-600">Email: {cliente.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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


    </div>
  );

  const renderEtapa2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecionar Veículo</h2>
        <p className="text-gray-600">Escolha o veículo relacionado à multa</p>
      </div>

      {/* Cliente Selecionado */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Cliente Selecionado:</h3>
        <p className="text-blue-800">{clienteSelecionado?.nome}</p>
        <p className="text-sm text-blue-700">CPF/CNPJ: {clienteSelecionado?.cpf_cnpj}</p>
      </div>

      {/* Lista de Veículos */}
      <div className="space-y-3">
        {veiculosMock.map((veiculo) => (
          <div
            key={veiculo.id}
            onClick={() => handleSelecionarVeiculo(veiculo)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{veiculo.marca} {veiculo.modelo}</h3>
                <p className="text-sm text-gray-600">Placa: {veiculo.placa}</p>
                <p className="text-sm text-gray-600">Ano: {veiculo.ano}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setEtapaAtual(1)}
        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        Voltar para Seleção de Cliente
      </button>
    </div>
  );

  const renderEtapa3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload do Documento</h2>
        <p className="text-gray-600">Faça upload do auto de infração ou notificação</p>
      </div>

      {/* Resumo da Seleção */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 mb-2">Resumo:</h3>
        <p className="text-sm"><strong>Cliente:</strong> {clienteSelecionado?.nome}</p>
        <p className="text-sm"><strong>Veículo:</strong> {veiculoSelecionado?.marca} {veiculoSelecionado?.modelo} - {veiculoSelecionado?.placa}</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          id="documento"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUploadDocumento}
          className="hidden"
        />
        <label htmlFor="documento" className="cursor-pointer">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Clique para selecionar o documento
          </p>
          <p className="text-sm text-gray-600">
            Formatos aceitos: PDF, JPG, PNG (máximo 50MB)
          </p>
        </label>
      </div>

      {documentoUpload && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">{documentoUpload.name}</p>
              <p className="text-sm text-green-700">
                {(documentoUpload.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setEtapaAtual(2)}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          onClick={handleProcessarOCR}
          disabled={!documentoUpload || processandoOCR}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {processandoOCR ? 'Processando...' : 'Processar Documento'}
        </button>
      </div>
    </div>
  );

  const renderEtapa4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Documento Processado</h2>
        <p className="text-gray-600">Dados extraídos e contexto jurídico identificado</p>
      </div>

      {/* Dados Extraídos */}
      {dadosExtraidos && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Dados Extraídos:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Número do Auto</label>
              <p className="text-gray-900">{dadosExtraidos.numeroAuto}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data da Infração</label>
              <p className="text-gray-900">{dadosExtraidos.dataInfracao}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Valor da Multa</label>
              <p className="text-gray-900">R$ {dadosExtraidos.valorMulta.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Local</label>
              <p className="text-gray-900">{dadosExtraidos.localInfracao}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Descrição da Infração</label>
              <p className="text-gray-900">{dadosExtraidos.descricaoInfracao}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contexto Jurídico */}
      {contextoJuridico && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Contexto Jurídico Identificado</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-blue-800">Fundamentação Principal:</label>
              <p className="text-blue-900 text-sm">{contextoJuridico.fundamentacao_principal}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <Scale className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">{contextoJuridico.leis_aplicaveis.length}</p>
                <p className="text-xs text-blue-700">Leis Aplicáveis</p>
              </div>
              <div className="text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">{contextoJuridico.jurisprudencias.length}</p>
                <p className="text-xs text-blue-700">Jurisprudências</p>
              </div>
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">{contextoJuridico.precedentes.length}</p>
                <p className="text-xs text-blue-700">Precedentes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setEtapaAtual(3)}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          disabled={gerandoRecurso}
        >
          Voltar
        </button>
        <button
          onClick={handleGerarRecurso}
          disabled={gerandoRecurso}
          className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {gerandoRecurso ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando Recurso...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Gerar Recurso com IA
            </>
          )}
        </button>
      </div>
    </div>
  );
  
  const renderEtapa5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recurso Gerado</h2>
        <p className="text-gray-600">Recurso criado com base na fundamentação jurídica</p>
      </div>

      {/* Recurso Gerado */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Conteúdo do Recurso:</h3>
          <button
            onClick={() => navigator.clipboard.writeText(recursoGerado)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Copiar Texto
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
            {recursoGerado}
          </pre>
        </div>
      </div>

      <div className="flex gap-3">
         <button
           onClick={() => setEtapaAtual(4)}
           className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
         >
           Voltar
         </button>
         <button
           onClick={() => setMostrarFeedback(true)}
           className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
         >
           Avaliar Recurso
         </button>
         <button
           onClick={() => {
             toast.success('Recurso salvo com sucesso!');
             navigate('/recursos');
           }}
           className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
         >
           Salvar e Finalizar
         </button>
       </div>
       
       {/* Sistema de Feedback */}
       {mostrarFeedback && recursoId && (
         <div className="mt-6">
           <FeedbackRecurso 
             recursoId={recursoId}
             onFeedbackSubmitted={() => {
               setMostrarFeedback(false);
               toast.success('Obrigado pelo seu feedback!');
             }}
           />
         </div>
       )}
    </div>
  );

  const etapas = [
    { numero: 1, titulo: 'Cliente', ativo: etapaAtual >= 1, completo: etapaAtual > 1 },
    { numero: 2, titulo: 'Veículo', ativo: etapaAtual >= 2, completo: etapaAtual > 2 },
    { numero: 3, titulo: 'Documento', ativo: etapaAtual >= 3, completo: etapaAtual > 3 },
    { numero: 4, titulo: 'Análise IA', ativo: etapaAtual >= 4, completo: etapaAtual > 4 },
    { numero: 5, titulo: 'Recurso', ativo: etapaAtual >= 5, completo: false }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/recursos')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Recurso de Multa</h1>
            <p className="text-gray-600">Processo guiado para criação de recurso</p>
          </div>
        </div>
      </div>

      {/* Indicador de Etapas */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {etapas.map((etapa, index) => (
            <div key={etapa.numero} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                etapa.completo 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : etapa.ativo 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-400'
              }`}>
                {etapa.completo ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{etapa.numero}</span>
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                etapa.ativo ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {etapa.titulo}
              </span>
              {index < etapas.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  etapa.completo ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo da Etapa */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {etapaAtual === 1 && renderEtapa1()}
        {etapaAtual === 2 && renderEtapa2()}
        {etapaAtual === 3 && renderEtapa3()}
        {etapaAtual === 4 && renderEtapa4()}
        {etapaAtual === 5 && renderEtapa5()}
      </div>
      
      {/* Modal de Histórico de Multas */}
      {showHistoricoModal && dadosExtraidos && (
        <HistoricoMultasModal
          isOpen={showHistoricoModal}
          onClose={() => setShowHistoricoModal(false)}
          onResponse={handleHistoricoResponse}
          multa={{
            valor_original: dadosExtraidos.valorMulta,
            valor_final: dadosExtraidos.valorMulta,
            codigo_infracao: dadosExtraidos.codigoInfracao,
            descricao_infracao: dadosExtraidos.descricaoInfracao
          }}
        />
      )}
      
      {/* Modal de Novo Cliente */}
      {showNovoClienteModal && (
        <NovoClienteModal
          isOpen={showNovoClienteModal}
          onClose={() => setShowNovoClienteModal(false)}
          onSave={handleSalvarNovoCliente}
        />
      )}
    </div>
  );
}
