import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, ArrowRight, CheckCircle } from 'lucide-react';

interface Step5RecursoProps {
  draftId: string;
  clienteNome: string;
  servicoNome: string;
}

export default function Step5Recurso({ 
  draftId, 
  clienteNome, 
  servicoNome,
}: Step5RecursoProps) {
  const navigate = useNavigate();

  const handleContinuarPreenchimento = () => {
    // Redirecionar para a página de teste-recurso-ia com o serviceOrderId
    // Esta página tem o fluxo completo de upload, OCR e geração de recurso
    navigate(`/teste-recurso-ia?serviceOrderId=${draftId}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Preencher Dados do Recurso
        </h2>
        <p className="text-gray-600">
          Agora vamos preencher os dados da multa e gerar o recurso
        </p>
      </div>

      {/* Resumo */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Pagamento Confirmado
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-blue-200">
                <span className="text-sm text-gray-600">Cliente:</span>
                <span className="text-sm font-medium text-gray-900">{clienteNome}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-blue-200">
                <span className="text-sm text-gray-600">Serviço:</span>
                <span className="text-sm font-medium text-gray-900">{servicoNome}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Pago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opções */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {/* Opção 1: Upload de Documento */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload de Documento da Multa
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload do documento da multa (PDF ou imagem) para extrair os dados automaticamente usando IA
              </p>
              <button
                onClick={handleContinuarPreenchimento}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                <span>Fazer Upload</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Opção 2: Preenchimento Manual */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preenchimento Manual
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Preencha manualmente os dados da multa através de um formulário
              </p>
              <button
                onClick={handleContinuarPreenchimento}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                <span>Preencher Manualmente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Informação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">i</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Dica:</strong> O upload de documento com IA é mais rápido e preciso. 
              Recomendamos usar esta opção quando possível.
            </p>
          </div>
        </div>
      </div>

      {/* Nota: Não há botão voltar pois o pagamento já foi confirmado */}
    </div>
  );
}
