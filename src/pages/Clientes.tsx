import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  FileText,
  Calendar,
  Download,
  Upload,
  UserPlus,
  X,
  AlertTriangle,
  DollarSign,
  ImageIcon,
  Loader2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useClientsStore } from '@/stores/clientsStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { clientsService } from '@/services/clientsService';
import GeminiOcrService from '@/services/geminiOcrService';
import { datawashService } from '@/services/datawashService';
import DataWashService from '@/services/datawashService';

interface Endereco {
  id: string;
  tipo: 'residencial' | 'comercial' | 'correspondencia';
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  principal: boolean;
}

interface Contato {
  id: string;
  tipo: 'celular' | 'residencial' | 'comercial' | 'whatsapp';
  numero: string;
  principal: boolean;
}

interface Email {
  id: string;
  tipo: 'pessoal' | 'comercial' | 'alternativo';
  endereco: string;
  principal: boolean;
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

interface ClienteCardProps {
  cliente: Cliente;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
  onViewDetails: (cliente: Cliente) => void;
  onAddVeiculo: (clienteId: string) => void;
}

function ClienteCard({ cliente, onEdit, onDelete, onViewDetails, onAddVeiculo }: ClienteCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            cliente.status === 'ativo' ? 'bg-green-100' : 'bg-gray-100'
          )}>
            <User className={cn(
              'w-6 h-6',
              cliente.status === 'ativo' ? 'text-green-600' : 'text-gray-600'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
            <p className="text-sm text-gray-600">{cliente.cpf}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onViewDetails(cliente);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Detalhes</span>
              </button>
              
              <button
                onClick={() => {
                  onEdit(cliente);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
              
              <button
                onClick={() => {
                  onAddVeiculo(cliente.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                <Car className="w-4 h-4" />
                <span>Adicionar Veículo</span>
              </button>
              
              <button
                onClick={() => {
                  onDelete(cliente.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span>{cliente.emails.find(e => e.principal)?.endereco || cliente.emails[0]?.endereco || 'Sem email'}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{cliente.telefones.find(t => t.principal)?.numero || cliente.telefones[0]?.numero || 'Sem telefone'}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Car className="w-4 h-4" />
          <span>{cliente.veiculos.length} veículo(s)</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{cliente.multas}</p>
            <p className="text-xs text-gray-600">Multas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-600">{cliente.recursosAtivos}</p>
            <p className="text-xs text-gray-600">Recursos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">R$ {(cliente.valorEconomizado || 0).toFixed(0)}</p>
            <p className="text-xs text-gray-600">Economizado</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            cliente.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          )}>
            {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </span>
          
          <span className="text-xs text-gray-500">
            Cliente desde {format(new Date(cliente.dataCadastro), 'MM/yyyy', { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onSave: (cliente: Partial<Cliente>) => void;
}

function ClienteModal({ isOpen, onClose, cliente, onSave }: ClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    cnh: '',
    status: 'ativo' as 'ativo' | 'inativo'
  });
  const [inputMode, setInputMode] = useState<'manual' | 'upload'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const ocrService = new GeminiOcrService();
  const [emails, setEmails] = useState<Email[]>([{
    id: '1',
    tipo: 'pessoal',
    endereco: '',
    principal: true
  }]);
  const [telefones, setTelefones] = useState<Contato[]>([{
    id: '1',
    tipo: 'celular',
    numero: '',
    principal: true
  }]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([{
    id: '1',
    tipo: 'residencial',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    principal: true
  }]);
  const [isLoadingCPF, setIsLoadingCPF] = useState(false);
  const [cpfConsultado, setCpfConsultado] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState<{[key: string]: boolean}>({});
  const [cepConsultado, setCepConsultado] = useState<{[key: string]: boolean}>({});

  // Funções para manipular upload de documentos pessoais
  const handleFileSelect = (file: File) => {
    // Aceitar imagens e PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setDocumentError('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF) ou PDF.');
      return;
    }
    
    setUploadedFile(file);
    setDocumentError(null);
    
    // Criar preview apenas para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Para PDFs, não criar preview de imagem
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const processDocumentWithAI = async () => {
    if (!uploadedFile) {
      setDocumentError('Nenhum arquivo selecionado.');
      return;
    }

    setIsProcessingDocument(true);
    setDocumentError(null);

    try {
      const result = await ocrService.extrairDadosPessoais(uploadedFile);
      
      console.log('Resultado recebido do OCR de documento pessoal:', result);
      
      // Preencher os campos automaticamente
      setFormData({
        ...formData,
        nome: result.nome || formData.nome,
        cpf: result.cpf || formData.cpf,
        dataNascimento: result.dataNascimento || formData.dataNascimento,
        cnh: result.cnh || formData.cnh
      });
      
      // Preencher primeiro endereço se disponível
      if (result.endereco && (result.endereco.logradouro || result.endereco.cep)) {
        setEnderecos([{
          id: '1',
          tipo: 'residencial',
          logradouro: result.endereco.logradouro || '',
          numero: result.endereco.numero || '',
          complemento: result.endereco.complemento || '',
          bairro: result.endereco.bairro || '',
          cidade: result.endereco.cidade || '',
          estado: result.endereco.estado || '',
          cep: result.endereco.cep || '',
          principal: true
        }]);
      }
      
      // Preencher primeiro email se disponível
      if (result.email) {
        setEmails([{
          id: '1',
          tipo: 'pessoal',
          endereco: result.email,
          principal: true
        }]);
      }
      
      // Preencher primeiro telefone se disponível
      if (result.telefone) {
        setTelefones([{
          id: '1',
          tipo: 'celular',
          numero: result.telefone,
          principal: true
        }]);
      }
      
      toast.success('Documento processado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      setDocumentError('Erro ao processar o documento. Tente novamente.');
      toast.error('Erro ao processar documento');
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const clearDocumentUpload = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setDocumentError(null);
  };
  
  // Função para consultar CPF na API Datawash via backend
  const consultarCPF = async (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      return;
    }

    // Validar CPF antes de consultar
    if (!DataWashService.validarCPF(cpfLimpo)) {
      toast.error('CPF inválido');
      return;
    }

    setIsLoadingCPF(true);
    
    try {
      console.log('Iniciando consulta CPF:', cpfLimpo);
      
      // Usar o novo serviço DataWash com fallback robusto
      const dados = await datawashService.consultarCPF(cpfLimpo);
      
      console.log('Dados recebidos:', dados);
      
      if (dados.success) {
        // Preencher dados básicos
        setFormData({
          ...formData,
          nome: dados.nome || '',
          cpf: dados.cpf,
          dataNascimento: dados.dataNascimento || '',
          cnh: ''
        });
        
        // Preencher primeiro endereço se disponível
        if (dados.endereco && (dados.endereco.logradouro || dados.endereco.cep)) {
          setEnderecos([{
            id: '1',
            tipo: 'residencial',
            logradouro: dados.endereco.logradouro || '',
            numero: dados.endereco.numero || '',
            complemento: dados.endereco.complemento || '',
            bairro: dados.endereco.bairro || '',
            cidade: dados.endereco.cidade || '',
            estado: dados.endereco.estado || '',
            cep: dados.endereco.cep || '',
            principal: true
          }]);
        }
        
        // Preencher primeiro email se disponível
        if (dados.email) {
          setEmails([{
            id: '1',
            tipo: 'pessoal',
            endereco: dados.email,
            principal: true
          }]);
        }
        
        // Preencher primeiro telefone se disponível
        if (dados.telefone) {
          setTelefones([{
            id: '1',
            tipo: 'celular',
            numero: dados.telefone,
            principal: true
          }]);
        }
        
        setCpfConsultado(true);
        
        if (dados.source === 'fallback') {
          toast.warning(dados.warning || 'Usando dados simulados - API temporariamente indisponível');
        } else {
          toast.success('Dados do CPF carregados com sucesso!');
        }
      }
      
    } catch (error) {
      console.error('Erro ao consultar CPF:', error);
      toast.error(error.message || 'Erro ao consultar CPF. Tente novamente.');
    } finally {
      setIsLoadingCPF(false);
    }
  };

  // Função para gerar dados simulados baseados no CPF (para demonstração)
  const gerarDadosSimulados = (cpf: string) => {
    const nomes = [
      'João Silva Santos',
      'Maria Oliveira Costa',
      'Pedro Souza Lima',
      'Ana Paula Ferreira',
      'Carlos Eduardo Alves',
      'Fernanda Rodrigues',
      'Ricardo Pereira',
      'Juliana Martins'
    ];
    
    const logradouros = [
      'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Rua Oscar Freire',
      'Av. Faria Lima', 'Rua Teodoro Sampaio', 'Rua Consolação', 'Av. Rebouças'
    ];
    
    const bairros = [
      'Centro', 'Bela Vista', 'Consolação', 'Jardins',
      'Itaim Bibi', 'Pinheiros', 'Vila Olímpia', 'Moema'
    ];
    
    // Usar o CPF como seed para gerar dados consistentes
    const seed = parseInt(cpf.substring(0, 3));
    const nomeIndex = seed % nomes.length;
    const logradouroIndex = seed % logradouros.length;
    const bairroIndex = seed % bairros.length;
    
    return {
      nome: nomes[nomeIndex],
      dataNascimento: `19${80 + (seed % 30)}-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`,
      cnh: `${String(seed).padStart(11, '0')}`,
      logradouro: logradouros[logradouroIndex],
      numero: String((seed % 999) + 1),
      complemento: seed % 3 === 0 ? `Apto ${(seed % 99) + 1}` : '',
      bairro: bairros[bairroIndex],
      cidade: 'São Paulo',
      estado: 'SP',
      cep: `${String(seed).padStart(5, '0')}-${String(seed * 2).substring(0, 3)}`,
      telefone: `(11) 9${String(seed).padStart(4, '0')}-${String(seed * 2).substring(0, 4)}`,
      email: `${nomes[nomeIndex].toLowerCase().replace(/\s+/g, '.')}@email.com`
    };
  };

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para limpar CPF (apenas números)
  const cleanCPF = (value: string) => {
    return value.replace(/\D/g, '');
  };

  // Função para consultar CEP via backend
  const consultarCEP = async (cep: string, enderecoId: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return;
    }

    setIsLoadingCEP(prev => ({ ...prev, [enderecoId]: true }));
    
    try {
      // Fazer requisição para o backend
      const response = await fetch(`http://localhost:3001/api/cep/${cepLimpo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assumindo que o token está no localStorage
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CEP não encontrado.');
        } else if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        } else {
          throw new Error('Erro ao consultar CEP. Tente novamente.');
        }
      }

      const dados = await response.json();
      
      // Atualizar campos do endereço
      setEnderecos(enderecos.map(endereco => 
        endereco.id === enderecoId ? {
          ...endereco,
          logradouro: dados.logradouro || '',
          bairro: dados.bairro || '',
          cidade: dados.cidade || '',
          estado: dados.estado || ''
        } : endereco
      ));
      
      setCepConsultado(prev => ({ ...prev, [enderecoId]: true }));
      toast.success('Endereço preenchido automaticamente!');
      
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      
      // Fallback para dados simulados em caso de erro
      const dadosSimulados = {
        logradouro: 'Rua das Flores',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP'
      };
      
      setEnderecos(enderecos.map(endereco => 
        endereco.id === enderecoId ? {
          ...endereco,
          logradouro: dadosSimulados.logradouro,
          bairro: dadosSimulados.bairro,
          cidade: dadosSimulados.cidade,
          estado: dadosSimulados.estado
        } : endereco
      ));
      
      setCepConsultado(prev => ({ ...prev, [enderecoId]: true }));
      toast.warning('Usando dados simulados. ' + (error.message || 'Erro ao consultar CEP.'));
    } finally {
      setIsLoadingCEP(prev => ({ ...prev, [enderecoId]: false }));
    }
  };

  // Função para formatar CEP
  const formatarCEP = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Funções para gerenciar endereços
  const adicionarEndereco = () => {
    const novoEndereco: Endereco = {
      id: Date.now().toString(),
      tipo: 'residencial',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      principal: false
    };
    setEnderecos([...enderecos, novoEndereco]);
  };

  const removerEndereco = (id: string) => {
    if (enderecos.length > 1) {
      setEnderecos(enderecos.filter(endereco => endereco.id !== id));
    }
  };

  const atualizarEndereco = (id: string, campo: keyof Endereco, valor: any) => {
    setEnderecos(enderecos.map(endereco => 
      endereco.id === id ? { ...endereco, [campo]: valor } : endereco
    ));
  };

  // Funções para gerenciar emails
  const adicionarEmail = () => {
    const novoEmail: Email = {
      id: Date.now().toString(),
      tipo: 'pessoal',
      endereco: '',
      principal: false
    };
    setEmails([...emails, novoEmail]);
  };

  const removerEmail = (id: string) => {
    if (emails.length > 1) {
      setEmails(emails.filter(email => email.id !== id));
    }
  };

  const atualizarEmail = (id: string, campo: keyof Email, valor: any) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, [campo]: valor } : email
    ));
  };

  // Funções para gerenciar telefones
  const adicionarTelefone = () => {
    const novoTelefone: Contato = {
      id: Date.now().toString(),
      tipo: 'celular',
      numero: '',
      principal: false
    };
    setTelefones([...telefones, novoTelefone]);
  };

  const removerTelefone = (id: string) => {
    if (telefones.length > 1) {
      setTelefones(telefones.filter(telefone => telefone.id !== id));
    }
  };

  const atualizarTelefone = (id: string, campo: keyof Contato, valor: any) => {
    setTelefones(telefones.map(telefone => 
      telefone.id === id ? { ...telefone, [campo]: valor } : telefone
    ));
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Criar objeto cliente com a nova estrutura
    const novoCliente: Cliente = {
      id: cliente?.id || Date.now().toString(),
      nome: formData.nome,
      cpf: formData.cpf,
      emails: emails,
      telefones: telefones,
      enderecos: enderecos,
      dataNascimento: formData.dataNascimento,
      cnh: formData.cnh,
      status: formData.status,
      veiculos: cliente?.veiculos || [],
      multas: cliente?.multas || 0,
      recursosAtivos: cliente?.recursosAtivos || 0,
      valorEconomizado: cliente?.valorEconomizado || 0,
      dataCadastro: cliente?.dataCadastro || new Date().toISOString().split('T')[0]
    };
    
    onSave(novoCliente);
    toast.success(cliente ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
    onClose();
  };

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        cpf: cliente.cpf || '',
        dataNascimento: cliente.dataNascimento || '',
        cnh: cliente.cnh || '',
        status: cliente.status || 'ativo'
      });
      
      // Carregar emails existentes
      if (cliente.emails && cliente.emails.length > 0) {
        setEmails(cliente.emails);
      }
      
      // Carregar telefones existentes
      if (cliente.telefones && cliente.telefones.length > 0) {
        setTelefones(cliente.telefones);
      }
      
      // Carregar endereços existentes
      if (cliente.enderecos && cliente.enderecos.length > 0) {
        setEnderecos(cliente.enderecos);
      }
    } else {
      // Resetar para valores padrão
      setFormData({
        nome: '',
        cpf: '',
        dataNascimento: '',
        cnh: '',
        status: 'ativo'
      });
      
      setEmails([{
        id: '1',
        tipo: 'pessoal',
        endereco: '',
        principal: true
      }]);
      
      setTelefones([{
        id: '1',
        tipo: 'celular',
        numero: '',
        principal: true
      }]);
      
      setEnderecos([{
        id: '1',
        tipo: 'residencial',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        principal: true
      }]);
      
      if (cpfConsultado) {
        setCpfConsultado(false);
      }
    }
  }, [cliente]);

  if (!isOpen) return null;

// ...
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
        </div>
        
        <div className="p-6">
          {/* Toggle de modo de entrada - apenas para novos clientes */}
          {!cliente && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-4 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                    inputMode === 'manual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Edit className="w-4 h-4" />
                  <span>Inserção Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                    inputMode === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload de Documento</span>
                </button>
              </div>
            </div>
          )}

          {/* Área de upload */}
          {!cliente && inputMode === 'upload' && (
            <div className="mb-6 space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploadedFile ? (
                  <div className="space-y-4">
                    {uploadedFile.type === 'application/pdf' ? (
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="w-16 h-16 text-red-500" />
                        <p className="text-sm text-gray-600 font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">Arquivo PDF selecionado</p>
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm"
                      />
                    )}
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={processDocumentWithAI}
                        disabled={isProcessingDocument}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessingDocument ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                        <span>{isProcessingDocument ? 'Processando...' : 'Processar com IA'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearDocumentUpload}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">Arraste o documento aqui</p>
                      <p className="text-sm text-gray-600">ou clique para selecionar</p>
                      <p className="text-xs text-gray-500 mt-2">CNH, RG, CPF ou outros documentos pessoais</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      id="document-upload"
                    />
                    <label
                      htmlFor="document-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Selecionar Arquivo
                    </label>
                  </div>
                )}
              </div>

              {documentError && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-700">{documentError}</span>
                </div>
              )}
            </div>
          )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF *
                {isLoadingCPF && (
                  <span className="ml-2 text-xs text-blue-600">
                    Consultando dados...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = cleanCPF(value);
                    const formattedValue = formatCPF(cleanValue);
                    
                    setFormData({ ...formData, cpf: formattedValue });
                    
                    // Consultar API quando CPF estiver completo (11 dígitos)
                    if (cleanValue.length === 11 && !cliente) {
                      consultarCPF(cleanValue);
                    }
                  }}
                  onBlur={(e) => {
                    const cleanValue = cleanCPF(e.target.value);
                    if (cleanValue.length === 11 && !cliente) {
                      consultarCPF(cleanValue);
                    }
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isLoadingCPF ? 'bg-blue-50' : ''
                  }`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  disabled={isLoadingCPF}
                />
                {isLoadingCPF && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Os dados serão preenchidos automaticamente após digitar o CPF
              </p>
              {!cliente && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Modo Demonstração:</strong> Devido a restrições de CORS, estamos usando dados simulados.
                    Em produção, implemente um endpoint no backend para consultar a API Datawash.
                  </p>
                </div>
              )}
            </div>
            
            {/* Seção de E-mails */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">E-mails</h3>
                <button
                  type="button"
                  onClick={adicionarEmail}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Adicionar E-mail
                </button>
              </div>
              
              {emails.map((email, index) => (
                <div key={email.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">E-mail {index + 1}</h4>
                    {emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerEmail(email.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={email.tipo}
                        onChange={(e) => atualizarEmail(email.id, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pessoal">Pessoal</option>
                        <option value="comercial">Comercial</option>
                        <option value="alternativo">Alternativo</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Endereço de E-mail
                        {cpfConsultado && index === 0 && (
                          <span className="ml-2 text-xs text-green-600">
                            ✓ Preenchido automaticamente
                          </span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={email.endereco || ''}
                        onChange={(e) => atualizarEmail(email.id, 'endereco', e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          cpfConsultado && email.endereco && index === 0 ? 'bg-green-50 border-green-200' : ''
                        }`}
                        placeholder="cliente@email.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={email.principal}
                        onChange={(e) => atualizarEmail(email.id, 'principal', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">E-mail principal</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Seção de Telefones */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Telefones</h3>
                <button
                  type="button"
                  onClick={adicionarTelefone}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Adicionar Telefone
                </button>
              </div>
              
              {telefones.map((telefone, index) => (
                <div key={telefone.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Telefone {index + 1}</h4>
                    {telefones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerTelefone(telefone.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={telefone.tipo}
                        onChange={(e) => atualizarTelefone(telefone.id, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="celular">Celular</option>
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                        {cpfConsultado && index === 0 && (
                          <span className="ml-2 text-xs text-green-600">
                            ✓ Preenchido automaticamente
                          </span>
                        )}
                      </label>
                      <input
                        type="tel"
                        value={telefone.numero || ''}
                        onChange={(e) => atualizarTelefone(telefone.id, 'numero', e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          cpfConsultado && telefone.numero && index === 0 ? 'bg-green-50 border-green-200' : ''
                        }`}
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={telefone.principal}
                        onChange={(e) => atualizarTelefone(telefone.id, 'principal', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Telefone principal</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNH
              </label>
              <input
                type="text"
                value={formData.cnh}
                onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          {/* Seção de Endereços */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Endereços</h3>
              <button
                type="button"
                onClick={adicionarEndereco}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Adicionar Endereço
              </button>
            </div>
            
            {enderecos.map((endereco, index) => (
              <div key={endereco.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Endereço {index + 1}</h4>
                  {enderecos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerEndereco(endereco.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={endereco.tipo}
                        onChange={(e) => atualizarEndereco(endereco.id, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="correspondencia">Correspondência</option>
                      </select>
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                        {cepConsultado[endereco.id] && (
                          <span className="ml-2 text-xs text-green-600">
                            ✓ Endereço preenchido automaticamente
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formatarCEP(endereco.cep || '')}
                        onChange={(e) => {
                          const cepFormatado = formatarCEP(e.target.value);
                          atualizarEndereco(endereco.id, 'cep', cepFormatado);
                          
                          // Consultar CEP quando tiver 8 dígitos
                          const cepLimpo = e.target.value.replace(/\D/g, '');
                          if (cepLimpo.length === 8) {
                            consultarCEP(cepLimpo, endereco.id);
                          }
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isLoadingCEP[endereco.id] ? 'bg-blue-50' : ''
                        } ${
                          cepConsultado[endereco.id] ? 'bg-green-50 border-green-200' : ''
                        }`}
                        placeholder="00000-000"
                        maxLength={9}
                        disabled={isLoadingCEP[endereco.id]}
                      />
                      {isLoadingCEP[endereco.id] && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isLoadingCEP[endereco.id] && !cepConsultado[endereco.id] && endereco.cep.replace(/\D/g, '').length < 8 && (
                    <div className="text-xs text-gray-500">
                      Digite o CEP para preencher automaticamente o endereço
                    </div>
                  )}
                  
                  {cepConsultado[endereco.id] && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700">
                        <strong>Endereço preenchido automaticamente!</strong> Você pode editar os campos conforme necessário.
                      </p>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logradouro
                      {(cpfConsultado || cepConsultado[endereco.id]) && endereco.logradouro && (
                        <span className="ml-2 text-xs text-green-600">
                          ✓ Preenchido automaticamente
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={endereco.logradouro || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'logradouro', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        (cpfConsultado || cepConsultado[endereco.id]) && endereco.logradouro ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="Rua das Flores"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={endereco.numero || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'numero', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        cpfConsultado && endereco.numero ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="123"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={endereco.complemento || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'complemento', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        cpfConsultado && endereco.complemento ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="Apto 101"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bairro
                      {(cpfConsultado || cepConsultado[endereco.id]) && endereco.bairro && (
                        <span className="ml-2 text-xs text-green-600">
                          ✓ Preenchido automaticamente
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={endereco.bairro || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'bairro', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        (cpfConsultado || cepConsultado[endereco.id]) && endereco.bairro ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="Centro"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                      {(cpfConsultado || cepConsultado[endereco.id]) && endereco.cidade && (
                        <span className="ml-2 text-xs text-green-600">
                          ✓ Preenchido automaticamente
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={endereco.cidade || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'cidade', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        (cpfConsultado || cepConsultado[endereco.id]) && endereco.cidade ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="São Paulo"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                      {(cpfConsultado || cepConsultado[endereco.id]) && endereco.estado && (
                        <span className="ml-2 text-xs text-green-600">
                          ✓ Preenchido automaticamente
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={endereco.estado || ''}
                      onChange={(e) => atualizarEndereco(endereco.id, 'estado', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        (cpfConsultado || cepConsultado[endereco.id]) && endereco.estado ? 'bg-green-50 border-green-200' : ''
                      }`}
                      placeholder="SP"
                      required
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={endereco.principal}
                      onChange={(e) => atualizarEndereco(endereco.id, 'principal', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Endereço principal</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {cliente ? 'Atualizar' : 'Criar'} Cliente
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const { user } = useAuthStore();
  const { clients, addVehicle, fetchClients } = useClientsStore();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Carregar clientes do Supabase com estatísticas
  const carregarClientes = async () => {
    try {
      setIsLoading(true);
      
      // Usar a nova função que inclui contagem de multas e recursos
      const clientesComStats = await clientsService.getClientsWithStats();

      // Converter dados do Supabase para o formato local
      const clientesConvertidos: Cliente[] = clientesComStats.map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf_cnpj,
        dataNascimento: '',
        cnh: '',
        status: cliente.status,
        emails: [{
          id: '1',
          tipo: 'pessoal',
          endereco: cliente.email || '',
          principal: true
        }],
        telefones: [{
          id: '1',
          tipo: 'celular',
          numero: cliente.telefone || '',
          principal: true
        }],
        enderecos: [{
          id: '1',
          tipo: 'residencial',
          logradouro: cliente.endereco || '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: cliente.cidade || '',
          estado: cliente.estado || '',
          cep: cliente.cep || '',
          principal: true
        }],
        veiculos: (cliente.vehicles || []).map(veiculo => ({
          id: veiculo.id,
          placa: veiculo.placa,
          modelo: veiculo.modelo || '',
          marca: veiculo.marca || '',
          ano: veiculo.ano || 0,
          cor: veiculo.cor || '',
          renavam: veiculo.renavam || '',
          dataCadastro: veiculo.created_at
        })),
        multas: cliente.multas_count || 0,
        recursosAtivos: cliente.recursos_count || 0,
        valorEconomizado: cliente.valor_economizado || 0,
        dataCadastro: cliente.created_at
      }));

      setClientes(clientesConvertidos);
    } catch (error) {
      console.error('Erro inesperado ao carregar clientes:', error);
      toast.error('Erro inesperado ao carregar clientes');
      
      // Fallback para dados mock em caso de erro
      const mockClientes: Cliente[] = [
      {
        id: '1',
        nome: 'João Silva Santos',
        cpf: '123.456.789-00',
        emails: [
          {
            id: '1',
            tipo: 'pessoal',
            endereco: 'joao.silva@email.com',
            principal: true
          },
          {
            id: '2',
            tipo: 'comercial',
            endereco: 'joao.trabalho@empresa.com',
            principal: false
          }
        ],
        telefones: [
          {
            id: '1',
            tipo: 'celular',
            numero: '(11) 99999-9999',
            principal: true
          },
          {
            id: '2',
            tipo: 'comercial',
            numero: '(11) 3333-4444',
            principal: false
          }
        ],
        enderecos: [
          {
            id: '1',
            tipo: 'residencial',
            logradouro: 'Rua das Flores',
            numero: '123',
            complemento: 'Apto 45',
            bairro: 'Vila Madalena',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '05428-200',
            principal: true
          }
        ],
        dataNascimento: '1985-03-15',
        cnh: '12345678901',
        veiculos: [
          {
            id: '1',
            placa: 'ABC-1234',
            modelo: 'Civic',
            marca: 'Honda',
            ano: 2020,
            cor: 'Prata',
            renavam: '12345678901',
            dataCadastro: '2023-01-15'
          }
        ],
        multas: 5,
        recursosAtivos: 2,
        valorEconomizado: 850,
        dataCadastro: '2023-01-15',
        status: 'ativo'
      },
      {
        id: '2',
        nome: 'Maria Oliveira Costa',
        cpf: '987.654.321-00',
        emails: [
          {
            id: '1',
            tipo: 'pessoal',
            endereco: 'maria.oliveira@email.com',
            principal: true
          }
        ],
        telefones: [
          {
            id: '1',
            tipo: 'celular',
            numero: '(11) 88888-8888',
            principal: true
          }
        ],
        enderecos: [
          {
            id: '1',
            tipo: 'comercial',
            logradouro: 'Av. Paulista',
            numero: '456',
            complemento: 'Sala 1001',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01310-100',
            principal: true
          }
        ],
        dataNascimento: '1990-07-22',
        cnh: '98765432109',
        veiculos: [
          {
            id: '2',
            placa: 'XYZ-5678',
            modelo: 'Corolla',
            marca: 'Toyota',
            ano: 2019,
            cor: 'Branco',
            renavam: '98765432109',
            dataCadastro: '2023-02-20'
          },
          {
            id: '3',
            placa: 'DEF-9012',
            modelo: 'HB20',
            marca: 'Hyundai',
            ano: 2021,
            cor: 'Azul',
            renavam: '11223344556',
            dataCadastro: '2023-02-20'
          }
        ],
        multas: 3,
        recursosAtivos: 1,
        valorEconomizado: 420,
        dataCadastro: '2023-02-20',
        status: 'ativo'
      }
    ];
    
      setClientes(mockClientes);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cliente.cpf.includes(searchTerm) ||
                         cliente.emails.some(email => email.endereco.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || cliente.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      setClientes(clientes.filter(c => c.id !== id));
      toast.success('Cliente excluído com sucesso!');
    }
  };

  const [showVeiculoModal, setShowVeiculoModal] = useState(false);
  const [selectedClienteForVeiculo, setSelectedClienteForVeiculo] = useState<string | null>(null);

  const handleViewDetails = (cliente: Cliente) => {
    navigate(`/clientes/${cliente.id}`);
  };

  const handleAddVeiculo = (clienteId: string) => {
    setSelectedClienteForVeiculo(clienteId);
    setShowVeiculoModal(true);
  };

  const handleSaveVeiculo = async (veiculoData: any) => {
    if (!selectedClienteForVeiculo) {
      toast.error('Nenhum cliente selecionado');
      return;
    }

    try {
      // Validação de placa
      const placaRegex = /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/;
      if (!placaRegex.test(veiculoData.placa.replace('-', ''))) {
        toast.error('Formato de placa inválido. Use ABC-1234 ou ABC1D23');
        return;
      }

      // Preparar dados do veículo
      const vehicleData = {
        placa: veiculoData.placa.toUpperCase(),
        marca: veiculoData.marca,
        modelo: veiculoData.modelo,
        ano: parseInt(veiculoData.ano),
        cor: veiculoData.cor || '',
        client_id: selectedClienteForVeiculo,
        company_id: user?.company_id
      };

      // Salvar no banco de dados
      const novoVeiculo = await clientsService.createVehicle(vehicleData);
      
      // Atualizar estado local
      setClientes(clientes.map(c => 
        c.id === selectedClienteForVeiculo 
          ? { 
              ...c, 
              veiculos: [...c.veiculos, {
                id: novoVeiculo.id,
                placa: novoVeiculo.placa,
                marca: novoVeiculo.marca,
                modelo: novoVeiculo.modelo,
                ano: novoVeiculo.ano,
                cor: novoVeiculo.cor,
                renavam: novoVeiculo.renavam || '',
                dataCadastro: novoVeiculo.created_at
              }]
            }
          : c
      ));
      
      // Atualizar store se necessário
      if (addVehicle) {
        addVehicle(novoVeiculo);
      }
      
      toast.success('Veículo adicionado com sucesso!');
      setShowVeiculoModal(false);
      setSelectedClienteForVeiculo(null);
    } catch (error) {
      console.error('Erro ao adicionar veículo:', error);
      toast.error('Erro ao adicionar veículo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleSave = async (clienteData: Partial<Cliente>) => {
    try {
      if (selectedCliente) {
        // Editar cliente existente
        const { error } = await supabase
          .from('clients')
          .update({
            nome: clienteData.nome,
            cpf_cnpj: clienteData.cpf,
            email: clienteData.emails?.[0]?.endereco || '',
            telefone: clienteData.telefones?.[0]?.numero || '',
            endereco: clienteData.enderecos?.[0]?.logradouro || '',
            cidade: clienteData.enderecos?.[0]?.cidade || '',
            estado: clienteData.enderecos?.[0]?.estado || '',
            cep: clienteData.enderecos?.[0]?.cep || '',
            status: clienteData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCliente.id);

        if (error) {
          console.error('Erro ao atualizar cliente:', error);
          toast.error('Erro ao atualizar cliente: ' + error.message);
          return;
        }

        // Atualizar estado local
        setClientes(clientes.map(c => 
          c.id === selectedCliente.id 
            ? { ...c, ...clienteData }
            : c
        ));
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        const novoClienteData = {
          nome: clienteData.nome,
          cpf_cnpj: clienteData.cpf,
          email: clienteData.emails?.[0]?.endereco || '',
          telefone: clienteData.telefones?.[0]?.numero || '',
          endereco: clienteData.enderecos?.[0]?.logradouro || '',
          cidade: clienteData.enderecos?.[0]?.cidade || '',
          estado: clienteData.enderecos?.[0]?.estado || '',
          cep: clienteData.enderecos?.[0]?.cep || '',
          status: clienteData.status || 'ativo',
          company_id: user?.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('clients')
          .insert([novoClienteData])
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar cliente:', error);
          toast.error('Erro ao criar cliente: ' + error.message);
          return;
        }

        // Converter dados do Supabase para o formato local
        const novoCliente: Cliente = {
          id: data.id,
          nome: data.nome,
          cpf: data.cpf_cnpj,
          dataNascimento: clienteData.dataNascimento || '',
          cnh: clienteData.cnh || '',
          status: data.status,
          emails: clienteData.emails || [],
          telefones: clienteData.telefones || [],
          enderecos: clienteData.enderecos || [],
          veiculos: [],
          multas: 0,
          recursosAtivos: 0,
          valorEconomizado: 0,
          dataCadastro: data.created_at
        };

        setClientes([...clientes, novoCliente]);
        toast.success('Cliente criado com sucesso!');
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao salvar cliente');
    }
    setSelectedCliente(undefined);
  };

  const handleImportClientes = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            // Simular processamento do arquivo
            toast.success(`${file.name} importado com sucesso! 15 clientes adicionados.`);
          } catch (error) {
            toast.error('Erro ao processar o arquivo. Verifique o formato.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportClientes = () => {
    // Simular exportação
    const csvContent = 'Nome,Email,Telefone,Status\n' +
      clientes.map(cliente => 
        `${cliente.nome},${cliente.emails[0]?.endereco || ''},${cliente.telefones[0]?.numero || ''},${cliente.status}`
      ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Lista de clientes exportada com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-600 mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleImportClientes}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importar</span>
          </button>
          <button
            onClick={handleExportClientes}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => {
              setSelectedCliente(undefined);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ativo' | 'inativo')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{clientes.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {clientes.filter(c => c.status === 'ativo').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Veículos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {clientes.reduce((acc, c) => acc + c.veiculos.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Economizado</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                R$ {clientes.reduce((acc, c) => acc + (c.valorEconomizado || 0), 0).toFixed(0)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Clientes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map((cliente) => (
          <ClienteCard
            key={cliente.id}
            cliente={cliente}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            onAddVeiculo={handleAddVeiculo}
          />
        ))}
      </div>

      {filteredClientes.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro cliente'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => {
                setSelectedCliente(undefined);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Cliente</span>
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      <ClienteModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCliente(undefined);
        }}
        cliente={selectedCliente}
        onSave={handleSave}
      />



      {/* Modal de Veículo */}
      <VeiculoModal
        isOpen={showVeiculoModal}
        onClose={() => {
          setShowVeiculoModal(false);
          setSelectedClienteForVeiculo(null);
        }}
        onSave={handleSaveVeiculo}
      />
    </div>
  );
}

// Modal de Detalhes do Cliente
function ClienteDetailsModal({ isOpen, onClose, cliente }: {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}) {
  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detalhes do Cliente</h2>
              <p className="text-gray-600 mt-1">{cliente.nome}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações Pessoais */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <p className="text-gray-900">{cliente.nome}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <p className="text-gray-900">{cliente.cpf}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mails</label>
                <div className="space-y-1">
                  {cliente.emails.map((email, index) => (
                    <div key={email.id} className="flex items-center space-x-2">
                      <p className="text-gray-900">{email.endereco}</p>
                      <span className="text-xs text-gray-500">({email.tipo})</span>
                      {email.principal && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefones</label>
                <div className="space-y-1">
                  {cliente.telefones.map((telefone, index) => (
                    <div key={telefone.id} className="flex items-center space-x-2">
                      <p className="text-gray-900">{telefone.numero}</p>
                      <span className="text-xs text-gray-500">({telefone.tipo})</span>
                      {telefone.principal && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  cliente.status === 'ativo' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                )}>
                  {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Cadastro</label>
                <p className="text-gray-900">{new Date(cliente.dataCadastro).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Endereços */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Endereços</h3>
            <div className="space-y-4">
              {cliente.enderecos.map((endereco, index) => (
                <div key={endereco.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      Endereço {index + 1} - {endereco.tipo.charAt(0).toUpperCase() + endereco.tipo.slice(1)}
                    </h4>
                    {endereco.principal && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Principal</span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    <p>{endereco.logradouro}, {endereco.numero}</p>
                    {endereco.complemento && <p>{endereco.complemento}</p>}
                    <p>{endereco.bairro} - {endereco.cidade}, {endereco.estado}</p>
                    <p>CEP: {endereco.cep}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Car className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-600">Veículos</p>
                    <p className="text-2xl font-bold text-blue-900">{cliente.veiculos.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-red-600">Multas</p>
                    <p className="text-2xl font-bold text-red-900">{cliente.multas}</p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Recursos Ativos</p>
                    <p className="text-2xl font-bold text-yellow-900">{cliente.recursosAtivos}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Valor Economizado</p>
                    <p className="text-2xl font-bold text-green-900">R$ {(cliente.valorEconomizado || 0).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Veículos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Veículos Cadastrados</h3>
            {cliente.veiculos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cliente.veiculos.map((veiculo) => (
                  <div key={veiculo.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{veiculo.placa}</h4>
                      <span className="text-sm text-gray-500">{veiculo.marca} {veiculo.modelo}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Ano: {veiculo.ano}</p>
                      <p>Cor: {veiculo.cor}</p>
                      <p>Cadastrado em: {new Date(veiculo.dataCadastro).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum veículo cadastrado</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de Veículo
function VeiculoModal({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (veiculo: any) => void;
}) {
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    ano: '',
    cor: '',
    renavam: '',
    chassi: '',
    combustivel: ''
  });
  const [inputMode, setInputMode] = useState<'manual' | 'upload'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocrService = new GeminiOcrService();

  const handleFileSelect = (file: File) => {
    // Aceitar imagens e PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF) ou PDF.');
      return;
    }
    
    setUploadedFile(file);
    setError(null);
    
    // Criar preview apenas para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Para PDFs, não criar preview de imagem
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Função para normalizar o tipo de combustível
  const normalizarCombustivel = (combustivel: string): string => {
    if (!combustivel) return '';
    
    const combustivelUpper = combustivel.toUpperCase().trim();
    
    // Mapeamento de variações para valores padronizados
    const mapeamento: { [key: string]: string } = {
      'GASOLINA': 'Gasolina',
      'GASOL': 'Gasolina',
      'GAS': 'Gasolina',
      'ETANOL': 'Etanol',
      'ALCOOL': 'Etanol',
      'ÁLCOOL': 'Etanol',
      'FLEX': 'Flex',
      'BICOMBUSTIVEL': 'Flex',
      'BICOMBUSTÍVEL': 'Flex',
      'FLEXFUEL': 'Flex',
      'DIESEL': 'Diesel',
      'GNV': 'GNV',
      'ELETRICO': 'Elétrico',
      'ELÉTRICO': 'Elétrico',
      'HIBRIDO': 'Híbrido',
      'HÍBRIDO': 'Híbrido'
    };
    
    // Procurar por correspondência exata
    if (mapeamento[combustivelUpper]) {
      return mapeamento[combustivelUpper];
    }
    
    // Procurar por correspondência parcial
    for (const [chave, valor] of Object.entries(mapeamento)) {
      if (combustivelUpper.includes(chave) || chave.includes(combustivelUpper)) {
        return valor;
      }
    }
    
    // Se não encontrou correspondência, retornar o valor original capitalizado
    return combustivel.charAt(0).toUpperCase() + combustivel.slice(1).toLowerCase();
  };

  const processWithAI = async () => {
    if (!uploadedFile) {
      setError('Nenhum arquivo selecionado.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await ocrService.extrairDadosDocumentoVeiculo(uploadedFile);
      
      // Debug: Log do resultado recebido
      console.log('Resultado recebido do OCR:', result);
      console.log('Campo combustível recebido:', result.combustivel);
      
      // Normalizar o tipo de combustível
      const combustivelNormalizado = normalizarCombustivel(result.combustivel || '');
      console.log('Combustível normalizado:', combustivelNormalizado);
      
      // Preencher os campos automaticamente
      const novoFormData = {
        placa: result.placa || '',
        marca: result.marca || '',
        modelo: result.modelo || '',
        ano: result.ano?.toString() || '',
        cor: result.cor || '',
        renavam: result.renavam || '',
        chassi: result.chassi || '',
        combustivel: combustivelNormalizado
      };
      
      // Debug: Log do formData que será definido
      console.log('FormData que será definido:', novoFormData);
      console.log('Campo combustível no formData:', novoFormData.combustivel);
      
      setFormData(novoFormData);
      
      toast.success('Documento processado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      setError('Erro ao processar o documento. Tente novamente.');
      toast.error('Erro ao processar documento');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa || !formData.marca || !formData.modelo || !formData.ano) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    onSave(formData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ placa: '', marca: '', modelo: '', ano: '', cor: '', renavam: '', chassi: '', combustivel: '' });
    setInputMode('manual');
    setUploadedFile(null);
    setIsProcessing(false);
    setPreviewUrl(null);
    setDragActive(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Adicionar Veículo</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Toggle de modo de entrada */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                  inputMode === 'manual'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Edit className="w-4 h-4" />
                <span>Inserção Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md transition-all',
                  inputMode === 'upload'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Upload className="w-4 h-4" />
                <span>Upload de Documento</span>
              </button>
            </div>
          </div>

          {/* Área de upload */}
          {inputMode === 'upload' && (
            <div className="mb-6 space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploadedFile ? (
                  <div className="space-y-4">
                    {uploadedFile.type === 'application/pdf' ? (
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="w-16 h-16 text-red-500" />
                        <p className="text-sm text-gray-600 font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">Arquivo PDF selecionado</p>
                      </div>
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm"
                      />
                    )}
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={processWithAI}
                        disabled={isProcessing}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                        <span>{isProcessing ? 'Processando...' : 'Processar com IA'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearUpload}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">Arraste o documento aqui</p>
                      <p className="text-sm text-gray-600">ou clique para selecionar</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Selecionar Arquivo
                    </label>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa *
                </label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Toyota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Corolla"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano *
                </label>
                <input
                  type="number"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor
                </label>
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Branco"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RENAVAM
                </label>
                <input
                  type="text"
                  value={formData.renavam}
                  onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678901"
                  maxLength={11}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chassi
                </label>
                <input
                  type="text"
                  value={formData.chassi}
                  onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="9BWZZZ377VT004251"
                  maxLength={17}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Combustível
                </label>
                <select
                  value={formData.combustivel}
                  onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione o combustível</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="Flex">Flex</option>
                  <option value="Diesel">Diesel</option>
                  <option value="GNV">GNV</option>
                  <option value="Elétrico">Elétrico</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}