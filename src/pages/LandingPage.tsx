import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Clock, TrendingUp, Users, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

// Componente do logotipo Icetran
const IcetranLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <img 
    src="/icetran-logo.png" 
    alt="ICETRAN Logo" 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const benefits = [
    {
      icon: Shield,
      title: 'Defesa Especializada',
      description: 'Recursos elaborados por especialistas em direito de trânsito com alta taxa de sucesso.'
    },
    {
      icon: Clock,
      title: 'Economia de Tempo',
      description: 'Automatize todo o processo de defesa de multas e recursos, economizando horas de trabalho.'
    },
    {
      icon: TrendingUp,
      title: 'Resultados Comprovados',
      description: 'Mais de 80% de sucesso na anulação de multas e redução de pontos na CNH.'
    },
    {
      icon: Users,
      title: 'Suporte Especializado',
      description: 'Equipe de advogados especializados disponível para orientação e suporte.'
    }
  ];

  const features = [
    'Análise automática de multas',
    'Geração de recursos personalizados',
    'Acompanhamento em tempo real',
    'Relatórios detalhados',
    'Gestão de clientes',
    'Integração com órgãos de trânsito'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <IcetranLogo className="h-10 w-16" />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">ICETRAN</span>
                  <span className="text-sm text-gray-600 -mt-1">Multas</span>
                </div>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#beneficios" className="text-gray-600 hover:text-gray-900 transition-colors">
                Benefícios
              </a>
              <a href="#funcionalidades" className="text-gray-600 hover:text-gray-900 transition-colors">
                Funcionalidades
              </a>
              <a href="#contato" className="text-gray-600 hover:text-gray-900 transition-colors">
                Contato
              </a>
            </nav>
            <button
              onClick={handleLogin}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Seus problemas com
              <span className="text-blue-600 block">multas acabaram!</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A plataforma mais completa para gestão e defesa de multas de trânsito. 
              Automatize recursos, economize tempo e dinheiro com nossa tecnologia especializada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <a
                href="#contato"
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-lg"
              >
                Falar com Especialista
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Icetran - Multas?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma oferece tudo que você precisa para resolver seus problemas com multas de forma eficiente e profissional.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Funcionalidades Completas
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Nossa plataforma oferece todas as ferramentas necessárias para uma gestão eficiente de multas e recursos.
              </p>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                    <span className="text-gray-700 text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Taxa de Sucesso</h4>
                  <div className="text-3xl font-bold text-blue-600">85%</div>
                  <p className="text-sm text-gray-600">dos recursos são aprovados</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Economia Média</h4>
                  <div className="text-3xl font-bold text-green-600">R$ 2.500</div>
                  <p className="text-sm text-gray-600">por cliente por ano</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Tempo Economizado</h4>
                  <div className="text-3xl font-bold text-purple-600">15h</div>
                  <p className="text-sm text-gray-600">por semana em média</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Entre em Contato
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pronto para resolver seus problemas com multas? Nossa equipe está aqui para ajudar você a começar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">contato@icetran.com.br</p>
              <p className="text-gray-600">suporte@icetran.com.br</p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Telefone</h3>
              <p className="text-gray-600">(47) 99142-5151</p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Endereço</h3>
              <p className="text-gray-600">São Paulo - SP</p>
              <p className="text-gray-600">Brasil</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <button
              onClick={handleLogin}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <IcetranLogo className="h-10 w-16 [&_.logo-text]:fill-blue-400 [&_.logo-symbol]:fill-blue-400" />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-blue-400">ICETRAN</span>
                  <span className="text-sm text-gray-400 -mt-1">Multas</span>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                A solução completa para gestão e defesa de multas de trânsito. 
                Automatize processos, economize tempo e dinheiro.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Ajuda</a></li>
                <li><a href="#contato" className="hover:text-white transition-colors">Documentação</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 Icetran - Multas. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}