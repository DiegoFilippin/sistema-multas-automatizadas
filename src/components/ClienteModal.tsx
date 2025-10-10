import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  Upload, 
  Edit, 
  ImageIcon, 
  FileText, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import GeminiOcrService from '../services/geminiOcrService';
import { datawashService } from '../services/datawashService';

// Interfaces
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

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onSave: (cliente: Partial<Cliente>) => void;
}

export function ClienteModal({ isOpen, onClose, cliente, onSave }: ClienteModalProps) {
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
  const cepDebounceTimers = useRef<{[key: string]: number}>({});

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

  // Helper: normaliza datas diversas (DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA, YYYY-MM-DD, com textos) para 'YYYY-MM-DD' usado por input type="date"
  const normalizarDataParaInput = (data?: string): string => {
    if (!data) return '';
    const s = data.trim();
    // ISO-like primeiro
    let m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Dia primeiro
    m = s.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})/);
      if (m) {
        const d = m[1];
        const mo = m[2];
        let y = m[3];
        if (y.length === 2) {
          const yyNum = parseInt(y, 10);
          y = yyNum >= 50 ? `19${y}` : `20${y}`;
        }
        const dNum = parseInt(d, 10);
        const moNum = parseInt(mo, 10);
        if (isNaN(dNum) || isNaN(moNum) || dNum < 1 || dNum > 31 || moNum < 1 || moNum > 12) {
          return '';
        }
        return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    return '';
  };

  const processDocumentWithAI = async () => {
    if (!uploadedFile) {
      setDocumentError('Nenhum arquivo selecionado.');
      return;
    }

    setIsProcessingDocument(true);
    setDocumentError(null);

    // Conversão removida aqui; usamos normalizarDataParaInput definido acima para padronizar datas

    try {
      const result = await ocrService.extrairDadosPessoais(uploadedFile);
      
      console.log('Resultado recebido do OCR de documento pessoal:', result);
      const rawDataNascimento = result.dataNascimento;
      const convertedDataNascimento = normalizarDataParaInput(rawDataNascimento);
      console.log('Data Nascimento OCR bruto:', rawDataNascimento, '→ convertido:', convertedDataNascimento);
      
      // Preencher os campos automaticamente (update funcional para evitar estado obsoleto)
      setFormData(prev => ({
        ...prev,
        nome: result.nome || prev.nome,
        cpf: result.cpf || prev.cpf,
        dataNascimento: convertedDataNascimento || prev.dataNascimento,
        cnh: result.cnh || prev.cnh
      }));
      
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
  
  // Função para validar CPF
  const validarCPF = (cpf: string): boolean => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    // Validar dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  };
  
  // Função para consultar CPF na API Datawash via backend
  const consultarCPF = async (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      return;
    }

    // Validar CPF antes de consultar (modo teste: não bloqueia a chamada)
    if (!validarCPF(cpfLimpo)) {
      toast.error('CPF inválido (modo teste: consultando mesmo assim)');
      // Sem retorno: seguir com consulta via webhook
    }

    setIsLoadingCPF(true);
    
    try {
      console.log('Iniciando consulta CPF:', cpfLimpo);
      
      // Usar o novo serviço DataWash com fallback robusto
      const dados = await datawashService.consultarCPF(cpfLimpo);
      
      console.log('Dados recebidos:', dados);
      
      if (dados.success) {
        // Preencher dados básicos
        const rawDataNascimentoDW = dados.dataNascimento;
        const convertedDataNascimentoDW = normalizarDataParaInput(rawDataNascimentoDW);
        console.log(`📅 Data Nascimento DataWash (raw): "${rawDataNascimentoDW}" → convertido para input: "${convertedDataNascimentoDW}"`);
        setFormData(prev => ({
          ...prev,
          nome: dados.nome || '',
          cpf: dados.cpf,
          dataNascimento: convertedDataNascimentoDW || prev.dataNascimento,
          cnh: ''
        }));
        
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
          toast.warning(dados.warning || 'CPF não encontrado na base de dados. Usando dados simulados para continuar o cadastro.');
        } else {
          toast.success('Dados do CPF carregados com sucesso!');
        }
      }
      
    } catch (error) {
      // Apenas erros realmente inesperados chegam aqui
      console.error('Erro inesperado ao consultar CPF:', error);
      toast.error('Erro inesperado. Tente novamente ou preencha os dados manualmente.');
    } finally {
      setIsLoadingCPF(false);
    }
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
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/cep/${cepLimpo}`, {
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

      // Tentar fallback direto para ViaCEP
      try {
        const responseViaCep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (responseViaCep.ok) {
          const dadosViaCep = await responseViaCep.json();
          if (!dadosViaCep.erro) {
            const dadosFormatados = {
              logradouro: dadosViaCep.logradouro || '',
              bairro: dadosViaCep.bairro || '',
              cidade: dadosViaCep.localidade || '',
              estado: dadosViaCep.uf || ''
            };

            setEnderecos(enderecos.map(endereco => 
              endereco.id === enderecoId ? {
                ...endereco,
                logradouro: dadosFormatados.logradouro,
                bairro: dadosFormatados.bairro,
                cidade: dadosFormatados.cidade,
                estado: dadosFormatados.estado
              } : endereco
            ));

            setCepConsultado(prev => ({ ...prev, [enderecoId]: true }));
            toast.success('Endereço preenchido automaticamente via ViaCEP!');
            return;
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback ViaCEP falhou:', fallbackError);
      }
      
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
      toast.warning('Usando dados simulados. ' + (error instanceof Error ? error.message : 'Erro ao consultar CEP.'));
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

  const atualizarEndereco = <K extends keyof Endereco>(id: string, campo: K, valor: Endereco[K]) => {
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

  const atualizarEmail = <K extends keyof Email>(id: string, campo: K, valor: Email[K]) => {
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

  const atualizarTelefone = <K extends keyof Contato>(id: string, campo: K, valor: Contato[K]) => {
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
                      onChange={(e) => atualizarEmail(email.id, 'tipo', e.target.value as Email['tipo'])}
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
                      onChange={(e) => atualizarTelefone(telefone.id, 'tipo', e.target.value as Contato['tipo'])}
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
                        onChange={(e) => atualizarEndereco(endereco.id, 'tipo', e.target.value as Endereco['tipo'])}
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
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={(() => {
                          const cepLimpo = (endereco.cep || '').replace(/\D/g, '');
                          return cepLimpo.length === 8 ? formatarCEP(cepLimpo) : cepLimpo;
                        })()}
                        onChange={(e) => {
                          const cepLimpo = e.target.value.replace(/\D/g, '');
                          // Salvar apenas dígitos no estado
                          atualizarEndereco(endereco.id, 'cep', cepLimpo);

                          // Debounce da consulta de CEP: só com 8 dígitos
                          if (cepDebounceTimers.current[endereco.id]) {
                            clearTimeout(cepDebounceTimers.current[endereco.id]);
                          }
                          if (cepLimpo.length === 8) {
                            cepDebounceTimers.current[endereco.id] = window.setTimeout(() => {
                              consultarCEP(cepLimpo, endereco.id);
                            }, 600);
                          }
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isLoadingCEP[endereco.id] ? 'bg-blue-50' : ''
                        } ${
                          cepConsultado[endereco.id] ? 'bg-green-50 border-green-200' : ''
                        }`}
                        placeholder="00000-000"
                        maxLength={8}
                        disabled={isLoadingCEP[endereco.id]}
                      />
                      {isLoadingCEP[endereco.id] && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
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

export default ClienteModal;