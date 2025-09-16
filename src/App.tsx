import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ContatoLead from './pages/ContatoLead';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import EmpresaDetalhes from './pages/EmpresaDetalhes';
import Usuarios from './pages/Usuarios';
import Multas from './pages/Multas';
import MultaDetalhes from './pages/MultaDetalhesSimples';
import Recursos from './pages/Recursos';
import NovoRecurso from './pages/NovoRecursoSimples';
import Clientes from './pages/Clientes';
import ClienteDetalhes from './pages/ClienteDetalhes';
import CobrancasGerais from './pages/CobrancasGerais';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import Configuracoes from './pages/Configuracoes';
import CentroAutomacao from './pages/CentroAutomacao';

import AsaasConfig from './pages/AsaasConfig';
import SubcontasAdmin from './pages/SubcontasAdmin';
import ServicosEsplits from './pages/ServicosEsplits';
import MeusServicos from './pages/MeusServicos';
import GerenciarCreditos from './pages/GerenciarCreditos';
import DashboardIcetran from './pages/DashboardIcetran';
import GerenciarLeads from './pages/GerenciarLeads';
import SubcontasSplitTest from './components/SubcontasSplitTest';
import TesteRecursoIA from './pages/TesteRecursoIA';
import TesteN8nDemo from './pages/TesteN8nDemo';
import AppLayout from './components/Layout/AppLayout';

// Componentes de rota movidos para dentro do contexto do Router
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Só redireciona se não está carregando e não há usuário
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);
  
  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  
  // Se não está carregando e não há usuário, não renderiza nada (será redirecionado)
  if (!user) {
    return null;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AppContent() {
  const { checkAuth } = useAuthStore();
  
  useEffect(() => {
    // Sempre chama checkAuth na inicialização para verificar se há sessão ativa
    checkAuth();
  }, [checkAuth]);
  
  return (
    <div className="App min-h-screen bg-gray-50">
      <Routes>
          {/* Rotas públicas */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/contato" 
            element={
              <PublicRoute>
                <ContatoLead />
              </PublicRoute>
            } 
          />
          
          {/* Rotas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/empresas" 
            element={
              <ProtectedRoute>
                <Empresas />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/empresas/:id" 
            element={
              <ProtectedRoute>
                <EmpresaDetalhes />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/usuarios" 
            element={
              <ProtectedRoute>
                <Usuarios />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/multas" 
            element={
              <ProtectedRoute>
                <Multas />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/multas/:id" 
            element={
              <ProtectedRoute>
                <MultaDetalhes />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/recursos" 
            element={
              <ProtectedRoute>
                <Recursos />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/recursos/novo" 
            element={
              <ProtectedRoute>
                <NovoRecurso />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/clientes" 
            element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/clientes/:id" 
            element={
              <ProtectedRoute>
                <ClienteDetalhes />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/cobrancas" 
            element={
              <ProtectedRoute>
                <CobrancasGerais />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/relatorios-financeiros" 
            element={
              <ProtectedRoute>
                <RelatoriosFinanceiros />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/configuracoes" 
            element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/subcontas-admin" 
            element={
              <ProtectedRoute>
                <SubcontasAdmin />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/subcontas-test" 
            element={
              <ProtectedRoute>
                <SubcontasSplitTest />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/centro-automacao" 
            element={
              <ProtectedRoute>
                <CentroAutomacao />
              </ProtectedRoute>
            } 
          />
          

          
          <Route 
            path="/asaas-config" 
            element={
              <ProtectedRoute>
                <AsaasConfig />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/servicos-splits" 
            element={
              <ProtectedRoute>
                <ServicosEsplits />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/meus-servicos" 
            element={
              <ProtectedRoute>
                <MeusServicos />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/gerenciar-creditos" 
            element={
              <ProtectedRoute>
                <GerenciarCreditos />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard-icetran" 
            element={
              <ProtectedRoute>
                <DashboardIcetran />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/gerenciar-leads" 
            element={
              <ProtectedRoute>
                <GerenciarLeads />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teste-recurso-ia" 
            element={
              <ProtectedRoute>
                <TesteRecursoIA />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teste-n8n-demo" 
            element={
              <ProtectedRoute>
                <TesteN8nDemo />
              </ProtectedRoute>
            } 
          />
          
          {/* Rota 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            color: '#374151',
            border: '1px solid #E5E7EB'
          }
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
