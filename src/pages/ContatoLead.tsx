import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, MapPin, MessageSquare, Send, CheckCircle, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface LeadForm {
  nome: string;
  email: string;
  telefone: string;
  empresa?: string;
  cnpj?: string;
  cidade: string;
  estado: string;
  servico_interesse: string;
  mensagem: string;
  origem: string;
}

const estadosBrasil = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

export default function ContatoLead() {
  const [formData, setFormData] = useState<LeadForm>({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    cnpj: '',
    cidade: '',
    estado: '',
    servico_interesse: '',
    mensagem: '',
    origem: 'site'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: keyof LeadForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatTelefone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (numbers.length <= 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return numbers.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome || !formData.email || !formData.telefone || !formData.cidade || !formData.estado || !formData.servico_interesse) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setSubmitted(true);
        toast.success('Solicitação enviada com sucesso!');
        
        // Enviar notificação para admin
        try {
          await fetch('/api/leads/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: result.id })
          });
        } catch (notifyError) {
          console.error('Erro ao notificar admin:', notifyError);
          // Não mostra erro para o usuário, pois o lead foi criado com sucesso
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao enviar solicitação');
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Obrigado pelo seu interesse!</h2>
            <p className="text-gray-600 mb-4">
              Recebemos suas informações e nossa equipe entrará em contato em breve.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Nossa equipe analisará sua solicitação e retornará dentro de 24 horas.
            </p>
            
            <div className="space-y-3">
              <Link 
                to="/" 
                className="block w-full bg-slate-800 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Voltar ao Início
              </Link>
              
              <Link 
                to="/login" 
                className="block w-full border border-slate-300 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Fazer Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <Link 
            to="/" 
            className="absolute left-0 top-0 flex items-center text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar ao início</span>
          </Link>
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src="/icetran-logo.png" 
                alt="ICETRAN Logo" 
                className="w-10 h-10"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Tenha acesso à nossa plataforma</h1>
          <p className="text-gray-600">Preencha o formulário abaixo e nossa equipe entrará em contato</p>
        </div>
        
        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Pessoais */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <User className="w-5 h-5 text-slate-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Informações Pessoais</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', formatTelefone(e.target.value))}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Informações da Empresa */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <Building2 className="w-5 h-5 text-slate-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Informações da Empresa</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                    placeholder="Nome da sua empresa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                      placeholder="Sua cidade"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Selecione o estado...</option>
                    {estadosBrasil.map(estado => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Interesse */}
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-slate-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Interesse</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serviço de Interesse *
                </label>
                <select
                  required
                  value={formData.servico_interesse}
                  onChange={(e) => handleInputChange('servico_interesse', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                >
                  <option value="">Selecione o serviço...</option>
                  <option value="recurso_multa">Recursos de Multa</option>
                  <option value="consultoria">Consultoria em Trânsito</option>
                  <option value="gestao_frotas">Gestão de Frotas</option>
                  <option value="outros">Outros Serviços</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Como nos conheceu?
                </label>
                <select
                  value={formData.origem}
                  onChange={(e) => handleInputChange('origem', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                >
                  <option value="site">Site da empresa</option>
                  <option value="google">Google</option>
                  <option value="indicacao">Indicação</option>
                  <option value="redes_sociais">Redes Sociais</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    rows={4}
                    value={formData.mensagem}
                    onChange={(e) => handleInputChange('mensagem', e.target.value)}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Conte-nos mais sobre suas necessidades..."
                  />
                </div>
              </div>
            </div>
            
            {/* Botão de Envio */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-4 px-6 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Solicitação
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Já tem acesso? {' '}
            <Link to="/login" className="text-slate-600 hover:text-slate-800 font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}