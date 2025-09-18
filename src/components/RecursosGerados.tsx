import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Edit, Calendar, User, Building } from 'lucide-react';
import { toast } from 'sonner';
import recursosGeradosService, { type RecursoGerado } from '../services/recursosGeradosService';

interface RecursosGeradosProps {
  multaId?: string;
  chatSessionId?: string;
  companyId?: string;
  onRecursoSelect?: (recurso: RecursoGerado) => void;
}

const RecursosGerados: React.FC<RecursosGeradosProps> = ({
  multaId,
  chatSessionId,
  companyId,
  onRecursoSelect
}) => {
  const [recursos, setRecursos] = useState<RecursoGerado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecurso, setSelectedRecurso] = useState<RecursoGerado | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState<RecursoGerado | null>(null);
  const [editedContent, setEditedContent] = useState('');

  // Função para limpar o texto do recurso removendo elementos extras
  const cleanRecursoText = (rawText: string): string => {
    let cleanedText = rawText;
    
    // Remover marcadores [RECURSO GERADO]
    cleanedText = cleanedText.replace(/\[RECURSO GERADO\]/g, '');
    
    // Remover símbolos especiais no início das linhas
    cleanedText = cleanedText.replace(/^[✕×✗]\s*/gm, '');
    
    // Remover comentários explicativos da IA no início
    cleanedText = cleanedText.replace(/^(Claro|Vou|Posso|Caso queira).*$/gm, '');
    
    // Remover linhas com traços separadores
    cleanedText = cleanedText.replace(/^\s*---\s*$/gm, '');
    
    // Remover perguntas no final (padrão: "Caso queira...Deseja?")
    cleanedText = cleanedText.replace(/Caso queira.*?Deseja\?/gs, '');
    
    // Remover outras perguntas comuns no final
    cleanedText = cleanedText.replace(/Deseja que.*?\?/gs, '');
    cleanedText = cleanedText.replace(/Precisa de.*?\?/gs, '');
    
    // Limpar linhas vazias excessivas
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Extrair apenas o conteúdo formal do recurso
    const lines = cleanedText.split('\n');
    let startIndex = -1;
    let endIndex = -1;
    
    // Procurar início do recurso (À, Autoridade, etc.)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('À') || line.includes('Autoridade') || line.includes('Ref.:') || line.includes('Requerente:')) {
        startIndex = i;
        break;
      }
    }
    
    // Procurar fim do recurso (Pede deferimento, assinatura, etc.)
    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Pede deferimento') || line.includes('Termos em que') || 
            (line.length > 10 && /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/.test(line))) {
          // Incluir mais algumas linhas após "Pede deferimento" para capturar assinatura
          endIndex = Math.min(i + 4, lines.length);
          break;
        }
      }
    }
    
    // Se encontrou início e fim, extrair apenas essa parte
    if (startIndex !== -1) {
      const finalEndIndex = endIndex !== -1 ? endIndex : lines.length;
      cleanedText = lines.slice(startIndex, finalEndIndex).join('\n');
    }
    
    // Limpeza final
    cleanedText = cleanedText.trim();
    
    // Remover linhas vazias no início e fim
    cleanedText = cleanedText.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
    
    return cleanedText;
  };

  // Carregar recursos quando os props mudarem
  useEffect(() => {
    loadRecursos();
  }, [multaId, chatSessionId, companyId]);

  const loadRecursos = async () => {
    try {
      setLoading(true);
      let recursosCarregados: RecursoGerado[] = [];

      if (multaId) {
        recursosCarregados = await recursosGeradosService.buscarRecursosPorMulta(multaId);
      } else if (chatSessionId) {
        recursosCarregados = await recursosGeradosService.buscarRecursosPorChat(chatSessionId);
      } else if (companyId) {
        recursosCarregados = await recursosGeradosService.buscarRecursosDaEmpresa(companyId);
      }

      setRecursos(recursosCarregados);
      console.log('📋 Recursos carregados:', recursosCarregados);
    } catch (error: any) {
      console.error('❌ Erro ao carregar recursos:', error);
      toast.error('Erro ao carregar recursos gerados');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (recurso: RecursoGerado) => {
    setSelectedRecurso(recurso);
    setShowPreview(true);
    if (onRecursoSelect) {
      onRecursoSelect(recurso);
    }
  };

  const handleEdit = (recurso: RecursoGerado) => {
    setEditingRecurso(recurso);
    setEditedContent(recurso.conteudo_recurso);
  };

  const handleSaveEdit = async () => {
    if (!editingRecurso) return;

    try {
      const success = await recursosGeradosService.atualizarConteudo(
        editingRecurso.id!,
        editedContent
      );

      if (success) {
        // Atualizar lista local
        setRecursos(prev => prev.map(r => 
          r.id === editingRecurso.id 
            ? { ...r, conteudo_recurso: editedContent }
            : r
        ));
        setEditingRecurso(null);
        setEditedContent('');
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar edição:', error);
      toast.error('Erro ao salvar alterações');
    }
  };

  const handleDownload = async (recurso: RecursoGerado, formato: 'txt' | 'pdf' = 'txt') => {
    try {
      await recursosGeradosService.downloadRecurso(recurso, formato);
    } catch (error: any) {
      console.error('❌ Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do recurso');
    }
  };

  const handleStatusChange = async (recurso: RecursoGerado, novoStatus: RecursoGerado['status']) => {
    try {
      const success = await recursosGeradosService.atualizarStatus(recurso.id!, novoStatus);
      
      if (success) {
        // Atualizar lista local
        setRecursos(prev => prev.map(r => 
          r.id === recurso.id 
            ? { ...r, status: novoStatus }
            : r
        ));
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'gerado': return 'bg-blue-100 text-blue-800';
      case 'revisado': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'protocolado': return 'bg-purple-100 text-purple-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoRecursoLabel = (tipo: string) => {
    switch (tipo) {
      case 'defesa_previa': return 'Defesa Prévia';
      case 'recurso_primeira_instancia': return 'Recurso 1ª Instância';
      case 'recurso_segunda_instancia': return 'Recurso 2ª Instância';
      case 'conversao_advertencia': return 'Conversão em Advertência';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando recursos...</span>
      </div>
    );
  }

  if (recursos.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <p>Nenhum recurso gerado encontrado.</p>
        <p className="text-sm mt-2">Os recursos serão exibidos aqui quando gerados pelo n8n.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Recursos Gerados ({recursos.length})
        </h3>
        <button
          onClick={loadRecursos}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Atualizar
        </button>
      </div>

      <div className="grid gap-4">
        {recursos.map((recurso) => (
          <div key={recurso.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-gray-900">{recurso.titulo}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recurso.status)}`}>
                    {recurso.status}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    {new Date(recurso.created_at!).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center">
                    <FileText className="mr-1 h-4 w-4" />
                    {getTipoRecursoLabel(recurso.tipo_recurso)}
                  </span>
                  {recurso.versao && (
                    <span>v{recurso.versao}</span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {cleanRecursoText(recurso.conteudo_recurso).substring(0, 150)}...
                </p>
                
                {recurso.argumentos_principais && recurso.argumentos_principais.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Argumentos principais:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recurso.argumentos_principais.slice(0, 3).map((arg, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-xs rounded">
                          {arg.substring(0, 30)}...
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handlePreview(recurso)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleEdit(recurso)}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <div className="relative group">
                  <button
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => handleDownload(recurso, 'txt')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Download TXT
                    </button>
                    <button
                      onClick={() => handleDownload(recurso, 'pdf')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
                
                <select
                  value={recurso.status}
                  onChange={(e) => handleStatusChange(recurso, e.target.value as RecursoGerado['status'])}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="gerado">Gerado</option>
                  <option value="revisado">Revisado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="protocolado">Protocolado</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Preview */}
      {showPreview && selectedRecurso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedRecurso.titulo}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <pre className="whitespace-pre-wrap text-sm">{cleanRecursoText(selectedRecurso.conteudo_recurso)}</pre>
            </div>
            <div className="flex items-center justify-end space-x-2 p-4 border-t">
              <button
                onClick={() => handleDownload(selectedRecurso, 'pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Download PDF
              </button>
              <button
                onClick={() => handleDownload(selectedRecurso, 'txt')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download TXT
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingRecurso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Editar: {editingRecurso.titulo}</h3>
              <button
                onClick={() => setEditingRecurso(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
                placeholder="Conteúdo do recurso..."
              />
            </div>
            <div className="flex items-center justify-end space-x-2 p-4 border-t">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => setEditingRecurso(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecursosGerados;