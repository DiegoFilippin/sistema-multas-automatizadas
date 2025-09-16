import React, { useState, useEffect } from 'react';
import { FileText, Edit3, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MultaData {
  numero?: string;
  infracao?: string;
  local?: string;
  data?: string;
  valor?: string;
  veiculo?: string;
  condutor?: string;
  orgaoAutuador?: string;
  codigoInfracao?: string;
  pontos?: string;
  observacoes?: string;
}

interface DataExtractionProps {
  data: MultaData;
  onDataChange: (data: MultaData) => void;
  onStartChat: () => void;
  isLoading?: boolean;
  className?: string;
}

const DataExtraction: React.FC<DataExtractionProps> = ({
  data,
  onDataChange,
  onStartChat,
  isLoading = false,
  className = ''
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [localData, setLocalData] = useState<MultaData>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue || '');
  };

  const handleSave = (field: string) => {
    const updatedData = {
      ...localData,
      [field]: tempValue
    };
    setLocalData(updatedData);
    onDataChange(updatedData);
    setEditingField(null);
    setTempValue('');
    toast.success('Campo atualizado com sucesso!');
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  const isDataComplete = () => {
    const requiredFields = ['numero', 'infracao', 'local', 'data', 'valor'];
    return requiredFields.every(field => localData[field as keyof MultaData]);
  };

  const renderField = (label: string, field: keyof MultaData, required: boolean = false) => {
    const value = localData[field] || '';
    const isEditing = editingField === field;

    return (
      <div key={field} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {isEditing ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Digite ${label.toLowerCase()}`}
              autoFocus
            />
            <button
              onClick={() => handleSave(field)}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={value}
              readOnly
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900"
              placeholder={required ? `${label} é obrigatório` : `${label} não informado`}
            />
            <button
              onClick={() => handleEdit(field, value)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (Object.keys(localData).length === 0 && !isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Faça upload de um documento para extrair os dados</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Extraindo dados do documento...</p>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Status da Extração */}
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            Dados extraídos com sucesso
          </span>
        </div>

        {/* Campos Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Informações Principais
          </h3>
          
          {renderField('Número da Multa', 'numero', true)}
          {renderField('Infração', 'infracao', true)}
          {renderField('Código da Infração', 'codigoInfracao')}
          {renderField('Local da Infração', 'local', true)}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Data da Infração', 'data', true)}
            {renderField('Valor da Multa', 'valor', true)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Veículo/Placa', 'veiculo')}
            {renderField('Pontos na CNH', 'pontos')}
          </div>
        </div>

        {/* Campos Adicionais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Informações Adicionais
          </h3>
          
          {renderField('Condutor', 'condutor')}
          {renderField('Órgão Autuador', 'orgaoAutuador')}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            {editingField === 'observacoes' ? (
              <div className="space-y-2">
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Digite as observações"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSave('observacoes')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-2">
                <textarea
                  value={localData.observacoes || ''}
                  readOnly
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 resize-none"
                  rows={3}
                  placeholder="Nenhuma observação registrada"
                />
                <button
                  onClick={() => handleEdit('observacoes', localData.observacoes || '')}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status e Ação */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isDataComplete() ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Dados completos - Pronto para continuar
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">
                    Preencha os campos obrigatórios (*)
                  </span>
                </>
              )}
            </div>
            
            <button
              onClick={onStartChat}
              disabled={!isDataComplete()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isDataComplete()
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Iniciar Chat com IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExtraction;