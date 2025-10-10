import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { multaLeveService, type MultaLeveAnalysis } from '../services/multaLeveService';

interface AdvertenciaEscritaProps {
  analiseMultaLeve: MultaLeveAnalysis;
  dadosMulta: {
    nomeCondutor: string;
    cpfCondutor: string;
    dataInfracao: string;
    localInfracao: string;
    placaVeiculo: string;
    descricaoInfracao: string;
    codigoInfracao: string;
    numeroAuto: string;
    orgaoAutuador: string;
  };
  onClose?: () => void;
}

const AdvertenciaEscrita: React.FC<AdvertenciaEscritaProps> = ({
  analiseMultaLeve,
  dadosMulta,
  onClose
}) => {
  const [advertenciaPersonalizada, setAdvertenciaPersonalizada] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    gerarAdvertenciaInicial();
  }, [analiseMultaLeve, dadosMulta]);

  const gerarAdvertenciaInicial = async () => {
    try {
      setIsLoading(true);
      
      if (analiseMultaLeve.advertencia.modeloAdvertencia) {
        // Gerar advertência personalizada usando o modelo
        const advertenciaGerada = multaLeveService.gerarAdvertenciaPersonalizada(
          analiseMultaLeve.advertencia.modeloAdvertencia,
          dadosMulta
        );
        
        setAdvertenciaPersonalizada(advertenciaGerada);
      } else {
        // Modelo básico se não houver modelo no banco
        const modeloBasico = `ADVERTÊNCIA POR ESCRITO

Ao(À) Senhor(a): ${dadosMulta.nomeCondutor}
CPF: ${dadosMulta.cpfCondutor}

Em razão da infração de trânsito de natureza LEVE cometida em ${dadosMulta.dataInfracao}, no local ${dadosMulta.localInfracao}, com o veículo de placa ${dadosMulta.placaVeiculo}, e considerando que Vossa Senhoria não possui registro de infrações nos últimos 12 (doze) meses, fica Vossa Senhoria ADVERTIDO(A) por escrito sobre a necessidade de observar rigorosamente as normas de trânsito.

Infração cometida: ${dadosMulta.descricaoInfracao}
Código da Infração: ${dadosMulta.codigoInfracao}
Auto de Infração nº: ${dadosMulta.numeroAuto}

${new Date().toLocaleDateString('pt-BR')}

_________________________________
Autoridade de Trânsito
${dadosMulta.orgaoAutuador}`;
        
        setAdvertenciaPersonalizada(modeloBasico);
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar advertência:', error);
      toast.error('Erro ao gerar advertência: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([advertenciaPersonalizada], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `advertencia_${dadosMulta.numeroAuto}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Advertência baixada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao baixar advertência:', error);
      toast.error('Erro ao baixar advertência');
    }
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    toast.success('Alterações salvas!');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Gerando advertência...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Advertência por Escrito
              </h3>
              <p className="text-sm text-gray-600">
                Sugerida para multa leve sem histórico nos últimos 12 meses
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Status da Análise */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Multa Leve</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">
              Sem histórico (12 meses)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-gray-700">
              Advertência Sugerida
            </span>
          </div>
        </div>
      </div>

      {/* Informações da Análise */}
      <div className="p-6 border-b bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Detalhes da Análise</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Condutor:</span>
            <span className="ml-2 font-medium">{dadosMulta.nomeCondutor}</span>
          </div>
          <div>
            <span className="text-gray-600">CPF:</span>
            <span className="ml-2 font-medium">{dadosMulta.cpfCondutor}</span>
          </div>
          <div>
            <span className="text-gray-600">Multas encontradas:</span>
            <span className="ml-2 font-medium">
              {analiseMultaLeve.historicoCondutor.quantidadeMultas}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Data da verificação:</span>
            <span className="ml-2 font-medium">
              {analiseMultaLeve.historicoCondutor.dataVerificacao.toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        
        <div className="mt-3">
          <span className="text-gray-600">Motivo:</span>
          <span className="ml-2 text-sm">{analiseMultaLeve.advertencia.motivo}</span>
        </div>
      </div>

      {/* Conteúdo da Advertência */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Conteúdo da Advertência</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>{showPreview ? 'Ocultar' : 'Visualizar'}</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={advertenciaPersonalizada}
              onChange={(e) => setAdvertenciaPersonalizada(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Conteúdo da advertência..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {showPreview ? (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                  {advertenciaPersonalizada}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Clique em "Visualizar" para ver o conteúdo da advertência</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span>Documento gerado automaticamente baseado na análise da multa</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Advertência</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertenciaEscrita;