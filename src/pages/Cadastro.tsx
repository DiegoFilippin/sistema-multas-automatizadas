import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, User, Building, Eye, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FormData {
  // Passo 1 - Identificação e contato
  nome: string;
  email: string;
  whatsapp: string;
  
  // Passo 2 - Dados da empresa
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  
  // Dados adicionais
  porte: string;
  situacao: string;
}

const IcetranLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <img 
    src="/icetran-logo.png" 
    alt="ICETRAN Logo" 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export default function Cadastro() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    whatsapp: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    porte: '',
    situacao: ''
  });

  const steps = [
    { number: 1, title: 'Identificação', icon: User },
    { number: 2, title: 'Dados da Empresa', icon: Building },
    { number: 3, title: 'Revisão', icon: Eye }
  ];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const buscarDadosCNPJ = async (cnpj: string) => {
    try {
      const numbers = cnpj.replace(/\D/g, '');
      const response = await fetch(`https://publica.cnpj.ws/cnpj/${numbers}`);
      if (!response.ok) throw new Error('Erro ao buscar dados do CNPJ');
      const data = await response.json();

      const enderecoCompleto = [
        data.estabelecimento?.tipo_logradouro,
        data.estabelecimento?.logradouro,
        data.estabelecimento?.numero,
        data.estabelecimento?.complemento,
        data.estabelecimento?.bairro
      ].filter(Boolean).join(', ');

      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social || prev.razaoSocial,
        nomeFantasia: data.nome_fantasia || prev.nomeFantasia,
        endereco: enderecoCompleto || prev.endereco,
        cidade: data.estabelecimento?.cidade?.nome || prev.cidade,
        estado: data.estabelecimento?.estado?.sigla || prev.estado,
        cep: data.estabelecimento?.cep || prev.cep
      }));
    } catch (error) {
      console.error('Erro ao buscar dados do CNPJ:', error);
    }
  };

  const validateStep1 = () => {
    return formData.nome && formData.email && formData.whatsapp;
  };

  const validateStep2 = () => {
    return formData.cnpj && formData.razaoSocial && formData.cidade && formData.estado;
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSuccessModalOpenChange = (open: boolean) => {
    setShowSuccessModal(open);
    if (!open) {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    if (currentStep !== 3) return;

    setIsLoading(true);
    try {
      const dadosCompletos = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.whatsapp,
        cnpj: formData.cnpj,
        razao_social: formData.razaoSocial,
        nome_fantasia: formData.nomeFantasia,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep
      };

      console.log('Enviando dados do pré-cadastro:', dadosCompletos);

      // Enviar para o backend
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/precadastros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCompletos)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pré-cadastro');
      }

      console.log('Pré-cadastro processado com sucesso:', result);

      // Mostrar modal de sucesso e redirecionar
      setShowSuccessModal(true);
      setTimeout(() => handleSuccessModalOpenChange(false), 4000);
      
    } catch (error) {
      console.error('Erro ao processar pré-cadastro:', error);
      alert('Erro ao processar pré-cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Identificação e Contato</h2>
        <p className="text-gray-600">Vamos começar com suas informações pessoais</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu nome completo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-mail *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleInputChange('whatsapp', formatPhone(e.target.value))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 98765-4321"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados da Empresa</h2>
        <p className="text-gray-600">Informe os dados da sua empresa</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNPJ *
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => {
                const formatted = formatCNPJ(e.target.value);
                handleInputChange('cnpj', formatted);
                const digits = formatted.replace(/\D/g, '');
                if (digits.length === 14) {
                  buscarDadosCNPJ(formatted);
                }
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00.000.000/0000-00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razão Social *
          </label>
          <input
            type="text"
            value={formData.razaoSocial}
            onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da empresa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Fantasia
          </label>
          <input
            type="text"
            value={formData.nomeFantasia}
            onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome fantasia"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => handleInputChange('endereco', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Rua, número, complemento"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade *
            </label>
            <input
              type="text"
              value={formData.cidade}
              onChange={(e) => handleInputChange('cidade', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Cidade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado *
            </label>
            <input
              type="text"
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="UF"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <input
              type="text"
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00000-000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 1234-5678"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisão</h2>
        <p className="text-gray-600">Confira se todas as informações estão corretas</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Informações Pessoais</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="mt-1 text-sm text-gray-900">{formData.nome || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">E-mail</p>
              <p className="mt-1 text-sm text-gray-900">{formData.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">WhatsApp</p>
              <p className="mt-1 text-sm text-gray-900">{formData.whatsapp || '—'}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900">Dados da Empresa</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">CNPJ</p>
              <p className="mt-1 text-sm text-gray-900">{formData.cnpj || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Razão Social</p>
              <p className="mt-1 text-sm text-gray-900">{formData.razaoSocial || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nome Fantasia</p>
              <p className="mt-1 text-sm text-gray-900">{formData.nomeFantasia || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Endereço</p>
              <p className="mt-1 text-sm text-gray-900">{formData.endereco || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cidade</p>
              <p className="mt-1 text-sm text-gray-900">{formData.cidade || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <p className="mt-1 text-sm text-gray-900">{formData.estado || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CEP</p>
              <p className="mt-1 text-sm text-gray-900">{formData.cep || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="mt-1 text-sm text-gray-900">{formData.telefone || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <IcetranLogo className="h-8 w-8" />
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">ICETRAN</h1>
                <span className="text-sm text-gray-600 -mt-1">Cadastro</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar
            </button>
          </div>
        </div>
      </header>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Pré-cadastro realizado com sucesso!
            </DialogTitle>
            <DialogDescription>
              em breve você recebera um e-mail com as proximas etapas
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <button
              onClick={() => handleSuccessModalOpenChange(false)}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
              autoFocus
            >
              Entendi
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400">Passo {step.number}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-16 h-0.5 bg-gray-200 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={prevStep}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Voltar
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                disabled={currentStep === 1 ? !validateStep1() : !validateStep2()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 inline ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Finalizar Cadastro'}
                <Check className="h-4 w-4 inline ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}