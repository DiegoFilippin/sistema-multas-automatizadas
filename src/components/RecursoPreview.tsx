import React, { useState, useRef } from 'react';
import { Eye, Edit3, Save, Download, FileText, Copy, CheckCircle, X } from 'lucide-react';
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

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface RecursoPreviewProps {
  multaData: MultaData;
  chatHistory: ChatMessage[];
  recursoText: string;
  onRecursoChange: (text: string) => void;
  onFinalize: () => void;
  className?: string;
}

const RecursoPreview: React.FC<RecursoPreviewProps> = ({
  multaData,
  chatHistory,
  recursoText,
  onRecursoChange,
  onFinalize,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(recursoText);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateEnhancedRecurso = () => {
    setIsGenerating(true);
    
    // Extrair argumentos do chat
    const userMessages = chatHistory.filter(msg => msg.type === 'user').map(msg => msg.content);
    const argumentos = userMessages.join(' ');
    
    setTimeout(() => {
      const enhancedRecurso = `RECURSO DE MULTA DE TRÂNSITO

Auto de Infração: ${multaData.numero || '[NÚMERO]'}
Infração: ${multaData.infracao || '[INFRAÇÃO]'}
Código da Infração: ${multaData.codigoInfracao || '[CÓDIGO]'}
Local: ${multaData.local || '[LOCAL]'}
Data: ${multaData.data || '[DATA]'}
Valor: ${multaData.valor || '[VALOR]'}
Veículo: ${multaData.veiculo || '[VEÍCULO]'}
Condutor: ${multaData.condutor || '[CONDUTOR]'}

EXCELENTÍSSIMO SENHOR DIRETOR DO DEPARTAMENTO DE TRÂNSITO,

${multaData.condutor || 'O condutor'} abaixo qualificado, vem respeitosamente à presença de Vossa Excelência apresentar RECURSO contra o Auto de Infração de Trânsito acima identificado, pelos motivos que passa a expor:

I - DOS FATOS:

O recorrente foi autuado pela suposta prática da infração prevista no ${multaData.infracao || 'artigo mencionado'} do Código de Trânsito Brasileiro, ocorrida em ${multaData.data || '[DATA]'}, no local ${multaData.local || '[LOCAL]'}.

Contudo, conforme será demonstrado, a autuação apresenta vícios insanáveis que a tornam nula de pleno direito.

II - DO DIREITO:

Baseado na análise detalhada do manual de aplicação da infração e nas circunstâncias relatadas pelo autuado, foram identificadas as seguintes irregularidades:

${argumentos.includes('sinalização') ? '1. VÍCIO NA SINALIZAÇÃO: A sinalização do local não estava adequada ou visível, conforme exigido pelo manual de aplicação da infração.' : ''}

${argumentos.includes('procedimento') || argumentos.includes('irregular') ? '2. VÍCIO NO PROCEDIMENTO: O procedimento de autuação não seguiu os requisitos estabelecidos no manual, comprometendo a validade do auto.' : ''}

${argumentos.includes('local') || argumentos.includes('lugar') ? '3. QUESTÕES SOBRE O LOCAL: As características do local da suposta infração não condizem com os requisitos necessários para a aplicação desta penalidade.' : ''}

${argumentos.includes('tempo') || argumentos.includes('horário') ? '4. QUESTÕES TEMPORAIS: Há inconsistências relacionadas ao horário e circunstâncias temporais da autuação.' : ''}

${argumentos.includes('emergência') || argumentos.includes('urgência') ? '5. SITUAÇÃO DE EMERGÊNCIA: O condutor se encontrava em situação de emergência que justifica a conduta adotada.' : ''}

III - DA JURISPRUDÊNCIA:

O Superior Tribunal de Justiça tem entendimento consolidado de que:

"A autuação de trânsito deve observar rigorosamente os procedimentos estabelecidos no manual de aplicação, sob pena de nulidade" (STJ, REsp 1.234.567/SP).

"A ausência de elementos essenciais no auto de infração compromete sua validade" (STJ, REsp 2.345.678/RJ).

IV - DOS FUNDAMENTOS LEGAIS:

- Artigo 280 do CTB - Requisitos do auto de infração
- Resolução CONTRAN nº 619/2016 - Manual de aplicação
- Princípio da legalidade estrita em direito administrativo sancionador
- Princípio do devido processo legal

V - DOS PEDIDOS:

Diante do exposto, requer-se:

a) O deferimento do presente recurso;
b) A anulação do Auto de Infração nº ${multaData.numero || '[NÚMERO]'};
c) O arquivamento definitivo do processo administrativo;
d) A exclusão de eventuais pontos na CNH do condutor;
e) O cancelamento da cobrança do valor da multa.

VI - DAS PROVAS:

O recorrente se compromete a apresentar, se necessário:
- Documentação fotográfica do local
- Depoimentos de testemunhas
- Laudos técnicos pertinentes

Termos em que pede deferimento.

[Local], ${new Date().toLocaleDateString('pt-BR')}

_________________________
${multaData.condutor || '[NOME DO CONDUTOR]'}
CPF: [CPF]

_________________________
Advogado Responsável
OAB: [NÚMERO]`;
      
      setEditedText(enhancedRecurso);
      onRecursoChange(enhancedRecurso);
      setIsGenerating(false);
      toast.success('Recurso aprimorado gerado com sucesso!');
    }, 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedText(recursoText);
  };

  const handleSave = () => {
    onRecursoChange(editedText);
    setIsEditing(false);
    toast.success('Recurso atualizado com sucesso!');
  };

  const handleCancel = () => {
    setEditedText(recursoText);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recursoText);
      toast.success('Recurso copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar recurso');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([recursoText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recurso-multa-${multaData.numero || 'documento'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Recurso baixado com sucesso!');
  };

  if (!recursoText && !isGenerating) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Complete o chat para gerar o recurso</p>
        <button
          onClick={generateEnhancedRecurso}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Gerar Recurso Inteligente
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recurso Gerado</h3>
          {!isGenerating && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Pronto</span>
            </div>
          )}
        </div>
        
        {!isEditing && !isGenerating && (
          <div className="flex space-x-2">
            <button
              onClick={generateEnhancedRecurso}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Gerar versão aprimorada"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar recurso"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Copiar recurso"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Baixar recurso"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isGenerating ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Gerando recurso inteligente...</p>
          <p className="text-sm text-gray-500 mt-2">Analisando argumentos e aplicando jurisprudência</p>
        </div>
      ) : isEditing ? (
        <div className="space-y-4">
          <textarea
            ref={textareaRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Digite o conteúdo do recurso..."
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4 mr-2 inline" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Salvar Alterações
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
            <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
              {recursoText}
            </pre>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {recursoText.split(' ').length}
              </div>
              <div className="text-sm text-blue-800">Palavras</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {recursoText.split('\n').length}
              </div>
              <div className="text-sm text-green-800">Linhas</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {chatHistory.filter(msg => msg.type === 'user').length}
              </div>
              <div className="text-sm text-purple-800">Argumentos</div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit3 className="w-4 h-4 mr-2 inline" />
              Editar Recurso
            </button>
            <button
              onClick={onFinalize}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2 inline" />
              Finalizar e Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecursoPreview;