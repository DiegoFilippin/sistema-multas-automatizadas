import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { MultaData, getTextoConversaoAdvertencia } from '../utils/multaUtils';

interface HistoricoMultasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResponse: (possuiHistorico: boolean) => void;
  multa: MultaData;
}

export default function HistoricoMultasModal({ 
  isOpen, 
  onClose, 
  onResponse, 
  multa 
}: HistoricoMultasModalProps) {
  if (!isOpen) return null;

  const handleResponse = (possuiHistorico: boolean) => {
    onResponse(possuiHistorico);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Verificação de Histórico
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <span className="text-sm font-medium text-amber-700">
              Multa Leve Detectada
            </span>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Valor da multa:</strong> R$ {(multa.valor_final || multa.valor_original).toFixed(2)}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Código:</strong> {multa.codigo_infracao}
            </p>
            {multa.descricao_infracao && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Descrição:</strong> {multa.descricao_infracao}
              </p>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                Possibilidade de Conversão em Advertência
              </span>
            </div>
            <p className="text-xs text-green-700">
              Esta multa pode ser convertida em advertência por escrito conforme o Art. 267 do CTB,
              desde que o condutor não possua multas nos últimos 12 meses.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Pergunta Obrigatória:
            </h4>
            <p className="text-gray-700">
              O condutor possui registro de multas nos últimos 12 meses?
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => handleResponse(true)}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sim, possui multas
          </button>
          <button
            onClick={() => handleResponse(false)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Não, sem multas
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>Sim:</strong> Seguirá para o recurso normal<br/>
            <strong>Não:</strong> Será gerado pedido de conversão em advertência
          </p>
        </div>
      </div>
    </div>
  );
}