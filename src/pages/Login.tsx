import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, User, Key } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Login component - isAuthenticated changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('Login component - redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Log inicial para depuração
  console.log('Login component rendered - isAuthenticated:', isAuthenticated);
  
  // Na página de login, não consideramos authLoading para o estado do botão
  const isButtonLoading = isLoading || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplas submissões
    if (isSubmitting || isLoading) {
      return;
    }
    
    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      // Navigation will be handled by useEffect when isAuthenticated changes
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const testCredentials = [
    {
      type: 'Despachante',
      email: 'operador@icetran.com.br',
      password: 'User@123',
      description: 'Gestão de clientes e recursos'
    },
    {
      type: 'ICETRAN',
      email: 'icetran@icetran.com.br',
      password: 'Icetran@123',
      description: 'Acesso ICETRAN - Visualização de splits e recebimentos'
    },
    {
      type: 'Administrador',
      email: 'admin@icetran.com.br',
      password: 'Admin@123',
      description: 'Acesso completo à plataforma'
    }
  ];

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    toast.success('Credenciais preenchidas automaticamente!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center relative">
          {/* Botão Voltar */}
          <Link 
            to="/" 
            className="absolute left-0 top-0 flex items-center text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar ao início</span>
          </Link>
          
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
              {/* Logotipo Icetran - Imagem Original */}
              <img 
                src="/icetran-logo.png" 
                alt="ICETRAN Logo" 
                className="w-12 h-12"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-800">Icetran</h2>
          <p className="mt-1 text-lg font-medium text-slate-600">Multas</p>
          <p className="mt-2 text-sm text-gray-600">
            Instituto de Certificação e Estudos de Trânsito e Transporte
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isButtonLoading}
              className={cn(
                'w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors',
                isButtonLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500'
              )}
            >
              {isButtonLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>



        {/* Footer com link para contato */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Não tem acesso ainda? {' '}
            <Link to="/contato" className="text-slate-600 hover:text-slate-800 font-medium transition-colors">
              Solicite acesso à plataforma
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}