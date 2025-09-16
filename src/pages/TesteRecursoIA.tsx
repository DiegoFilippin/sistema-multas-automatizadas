import React, { useState } from 'react';
import { Upload, FileText, MessageCircle, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from '../components/FileUpload';
import DataExtraction from '../components/DataExtraction';
import ChatInterface from '../components/ChatInterface';
import RecursoPreview from '../components/RecursoPreview';
import GeminiOcrService from '../services/geminiOcrService';

interface MultaData {
  numero?: string;
  infracao?: string;
  codigoInfracao?: string;
  local?: string;
  data?: string;
  valor?: string;
  veiculo?: string;
  condutor?: string;
  orgaoAutuador?: string;
  pontos?: string;
  observacoes?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const TesteRecursoIA: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'extraction' | 'chat' | 'recurso'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [multaData, setMultaData] = useState<MultaData>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [recursoText, setRecursoText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    try {
      // Verificar se a API do Gemini está configurada
      if (!GeminiOcrService.isConfigured()) {
        toast.error('API do Gemini não configurada. Verifique a variável VITE_GEMINI_API_KEY no arquivo .env');
        setIsProcessing(false);
        return;
      }
      
      toast.info('Iniciando extração de dados do documento...');
      
      // Criar instância do serviço Gemini OCR
      const geminiService = new GeminiOcrService();
      
      // Processar documento com Gemini OCR
      const dadosExtraidos = await geminiService.extrairDadosAutoInfracao(file);
      
      console.log('✅ Dados extraídos do documento:', dadosExtraidos);
      
      // Mapear dados do DocumentoProcessado para MultaData
      const multaDataMapeada: MultaData = {
        numero: dadosExtraidos.numeroAuto || '',
        infracao: dadosExtraidos.descricaoInfracao || '',
        codigoInfracao: dadosExtraidos.codigoInfracao || '',
        local: dadosExtraidos.localInfracao || '',
        data: dadosExtraidos.dataInfracao || '',
        valor: dadosExtraidos.valorMulta ? `R$ ${dadosExtraidos.valorMulta.toFixed(2).replace('.', ',')}` : '',
        veiculo: dadosExtraidos.placaVeiculo || '',
        condutor: dadosExtraidos.condutor || '',
        orgaoAutuador: dadosExtraidos.orgaoAutuador || '',
        pontos: '', // Campo não disponível no DocumentoProcessado
        observacoes: dadosExtraidos.observacoes || ''
      };
      
      setMultaData(multaDataMapeada);
      setCurrentStep('extraction');
      toast.success('Dados extraídos com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro na extração OCR:', error);
      
      let errorMessage = 'Erro ao processar documento. ';
      
      if (error.message?.includes('sobrecarregado')) {
        errorMessage += 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
      } else if (error.message?.includes('não contém os dados esperados')) {
        errorMessage += 'Documento pode estar ilegível ou não ser um auto de infração válido.';
      } else {
        errorMessage += 'Verifique se o arquivo é um auto de infração válido e tente novamente.';
      }
      
      toast.error(errorMessage);
      
      // Em caso de erro, manter dados vazios
      setMultaData({});
    } finally {
      setIsProcessing(false);
    }
  };

  const startChat = () => {
    setCurrentStep('chat');
    setChatMessages([{
      id: '1',
      type: 'ai',
      content: 'Olá! Vou te ajudar a construir um recurso para sua multa. Primeiro, me conte: você concorda com a aplicação desta multa por "Dirigir sob influência de álcool"?',
      timestamp: new Date()
    }]);
  };

  const generateRecurso = (chatHistory: ChatMessage[]) => {
    setCurrentStep('recurso');
    
    // Gerar recurso baseado no histórico do chat
    const userMessages = chatHistory.filter(msg => msg.type === 'user');
    const argumentos = userMessages.map(msg => msg.content).join(' ');
    
    const recursoGerado = `RECURSO DE MULTA DE TRÂNSITO

Auto de Infração: ${multaData.numero}
Infração: ${multaData.infracao}
Local: ${multaData.local}
Data: ${multaData.data}
Valor: ${multaData.valor}

EXCELENTÍSSIMO SENHOR DIRETOR DO DEPARTAMENTO DE TRÂNSITO,

Vem respeitosamente à presença de Vossa Excelência, ${multaData.condutor || 'o condutor'} abaixo qualificado, apresentar RECURSO contra o Auto de Infração de Trânsito acima identificado, pelos motivos que passa a expor:

I - DOS FATOS:

O recorrente foi autuado pela suposta prática da infração prevista no ${multaData.infracao} do Código de Trânsito Brasileiro. Contudo, conforme será demonstrado, a autuação apresenta vícios que a tornam nula de pleno direito.

II - DOS ARGUMENTOS APRESENTADOS:

Baseado na conversa com o sistema de IA e na análise do manual de aplicação, foram identificadas as seguintes questões:

${argumentos.substring(0, 500)}...

III - DO DIREITO:

A autuação em questão não observou os requisitos legais estabelecidos, apresentando vícios que comprometem sua validade.

IV - DOS PEDIDOS:

Diante do exposto, requer-se:
a) O deferimento do presente recurso;
b) A anulação do Auto de Infração nº ${multaData.numero};
c) O arquivamento definitivo do processo.

Termos em que pede deferimento.

${new Date().toLocaleDateString('pt-BR')}

_________________________
${multaData.condutor || 'Assinatura do Recorrente'}`;
    
    setRecursoText(recursoGerado);
  };
  
  const handleRecursoChange = (newText: string) => {
    setRecursoText(newText);
  };
  
  const handleFinalize = () => {
    // Aqui poderia salvar no banco de dados
    alert('Recurso finalizado! Em uma implementação real, seria salvo no banco de dados.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teste - Recurso com IA
          </h1>
          <p className="text-gray-600">
            Sistema experimental para criação de recursos de multa com assistência de inteligência artificial
          </p>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'upload' ? 'text-blue-600' : 
              ['extraction', 'chat', 'recurso'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'extraction' ? 'text-blue-600' : 
              ['chat', 'recurso'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
            }`}>
              <FileText className="w-5 h-5" />
              <span className="font-medium">Extração</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'chat' ? 'text-blue-600' : 
              currentStep === 'recurso' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Chat IA</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'recurso' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <Eye className="w-5 h-5" />
              <span className="font-medium">Recurso</span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Seção 1: Upload de Documento */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Upload de Documento
            </h2>
            
            <FileUpload
              onFileSelect={handleFileUpload}
              acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png']}
              maxSize={10}
            />
          </div>

          {/* Seção 2: Dados Extraídos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Dados Extraídos
            </h2>
            
            <DataExtraction
              data={multaData}
              onDataChange={setMultaData}
              onStartChat={startChat}
              isLoading={isProcessing}
            />
          </div>

          {/* Seção 3: Chat com IA */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat com IA
            </h2>
            
            <div className="flex-1">
              {currentStep === 'chat' || currentStep === 'recurso' ? (
                <ChatInterface
                  multaData={multaData}
                  onGenerateRecurso={generateRecurso}
                  className="h-full"
                />
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Complete a extração de dados para iniciar o chat</p>
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Recurso Gerado */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Recurso Gerado
            </h2>
            
            <RecursoPreview
              multaData={multaData}
              chatHistory={chatMessages}
              recursoText={recursoText}
              onRecursoChange={handleRecursoChange}
              onFinalize={handleFinalize}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesteRecursoIA;