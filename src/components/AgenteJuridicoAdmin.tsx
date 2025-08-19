import { useState, useEffect } from 'react';
import {
  Brain,
  Upload,
  FileText,
  Search,
  Tag,
  BarChart3,
  Trash2,
  Edit,
  Eye,
  Download,
  Plus,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  Scale,
  Gavel,
  FileCheck,
  X,
  Calendar,
  User,
  Link,
  Star,
  Copy,
  ExternalLink,
  FileDown,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import KnowledgeService, { KnowledgeDocument, UploadDocumentData } from '@/services/knowledgeService';
import VectorService from '@/services/vectorService';
import FileProcessingService, { FileProcessingResult } from '@/services/fileProcessingService';
import { ctbScrapingService } from '@/services/ctbScrapingService';
import { cn } from '@/lib/utils';

interface DocumentStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByCategory: Record<string, number>;
  totalTags: number;
  avgRelevanceScore: number;
}

interface EmbeddingStats {
  totalDocuments: number;
  totalChunks: number;
  avgChunksPerDocument: number;
}

const DOCUMENT_TYPES = [
  { value: 'lei', label: 'Lei', icon: Scale, color: 'bg-blue-100 text-blue-800' },
  { value: 'jurisprudencia', label: 'Jurisprudência', icon: Gavel, color: 'bg-purple-100 text-purple-800' },
  { value: 'recurso_modelo', label: 'Recurso Modelo', icon: FileCheck, color: 'bg-green-100 text-green-800' },
  { value: 'doutrina', label: 'Doutrina', icon: BookOpen, color: 'bg-orange-100 text-orange-800' },
  { value: 'outro', label: 'Outro', icon: FileText, color: 'bg-gray-100 text-gray-800' }
];

function StatCard({ title, value, icon: Icon, color = 'text-blue-600' }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={cn('w-8 h-8', color)} />
      </div>
    </div>
  );
}

function DocumentCard({ document, onEdit, onDelete, onView, isSelected, onToggleSelect }: {
  document: KnowledgeDocument;
  onEdit: (doc: KnowledgeDocument) => void;
  onDelete: (id: string) => void;
  onView: (doc: KnowledgeDocument) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const docType = DOCUMENT_TYPES.find(type => type.value === document.type);
  const Icon = docType?.icon || FileText;

  return (
    <div className={cn(
      "bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow",
      isSelected && "ring-2 ring-blue-500 border-blue-500"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onToggleSelect(document.id)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          )}
          <Icon className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900 line-clamp-1">{document.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn('px-2 py-1 text-xs font-medium rounded-full', docType?.color)}>
                {docType?.label}
              </span>

            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onView(document)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(document)}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(document.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {document.content.substring(0, 150)}...
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Score: {document.relevance_score.toFixed(1)}</span>
        <span>{new Date(document.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
      
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {document.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded">
              +{document.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ViewModal({ isOpen, onClose, document }: {
  isOpen: boolean;
  onClose: () => void;
  document: KnowledgeDocument | null;
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  if (!isOpen || !document) return null;

  const docType = DOCUMENT_TYPES.find(type => type.value === document.type);
  const Icon = docType?.icon || FileText;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const downloadAsTXT = () => {
    if (!document) return;
    
    const content = `Título: ${document.title}\n` +
      `Tipo: ${docType?.label || document.type}\n` +
      `Tipo: ${document.type || 'N/A'}\n` +
      `Autor: ${document.author || 'N/A'}\n` +
      `Data de Publicação: ${document.publication_date ? new Date(document.publication_date).toLocaleDateString('pt-BR') : 'N/A'}\n` +
      `Score de Relevância: ${document.relevance_score.toFixed(1)}\n` +
      `Tags: ${document.tags?.join(', ') || 'N/A'}\n` +
      `Fonte: ${document.source_url || 'N/A'}\n` +
      `\n--- CONTEÚDO ---\n\n${document.content}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Documento baixado como TXT!');
    setShowDownloadMenu(false);
  };

  const downloadAsJSON = () => {
    if (!document) return;
    
    const jsonData = {
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      author: document.author,
      publication_date: document.publication_date,
      source_url: document.source_url,
      tags: document.tags,
      relevance_score: document.relevance_score,
      created_at: document.created_at,
      updated_at: document.updated_at
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Documento baixado como JSON!');
    setShowDownloadMenu(false);
  };

  const downloadAsPDF = () => {
    if (!document) return;
    
    // Simula geração de PDF usando HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${document.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .metadata { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .content { margin-top: 30px; }
          .tags { margin-top: 20px; }
          .tag { background: #e3f2fd; padding: 4px 8px; margin: 2px; border-radius: 3px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${document.title}</div>
          <div>Tipo: ${docType?.label || document.type}</div>
        </div>
        
        <div class="metadata">
          <strong>Metadados do Documento</strong><br>
          <strong>Tipo:</strong> ${document.type || 'N/A'}<br>
          <strong>Autor:</strong> ${document.author || 'N/A'}<br>
          <strong>Data de Publicação:</strong> ${document.publication_date ? new Date(document.publication_date).toLocaleDateString('pt-BR') : 'N/A'}<br>
          <strong>Score de Relevância:</strong> ${document.relevance_score.toFixed(1)}<br>
          <strong>Fonte:</strong> ${document.source_url || 'N/A'}<br>
          <strong>Data de Criação:</strong> ${new Date(document.created_at).toLocaleDateString('pt-BR')}
        </div>
        
        ${document.tags && document.tags.length > 0 ? `
          <div class="tags">
            <strong>Tags:</strong><br>
            ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="content">
          <strong>Conteúdo:</strong><br><br>
          ${document.content.replace(/\n/g, '<br>')}
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Documento baixado como HTML (abra no navegador para imprimir como PDF)!');
    setShowDownloadMenu(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Visualizar Documento</h2>
              <p className="text-sm text-gray-600">Detalhes completos do documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Header com título e tipo */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-2xl font-bold text-gray-900">{document.title}</h3>
              <span className={cn('px-3 py-1 text-sm font-medium rounded-full', docType?.color)}>
                {docType?.label}
              </span>
            </div>
            

          </div>

          {/* Metadados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              {document.author && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Autor:</span>
                  <span className="text-sm font-medium">{document.author}</span>
                </div>
              )}
              
              {document.publication_date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Data de Publicação:</span>
                  <span className="text-sm font-medium">
                    {new Date(document.publication_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Score de Relevância:</span>
                <span className="text-sm font-medium">{document.relevance_score.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Criado em:</span>
                <span className="text-sm font-medium">
                  {new Date(document.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              {document.source_url && (
                <div className="flex items-center space-x-2">
                  <Link className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Fonte:</span>
                  <a 
                    href={document.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>Ver fonte</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-gray-900">Conteúdo</h4>
              <button
                onClick={() => copyToClipboard(document.content)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar</span>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {document.content}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between space-x-3 p-6 border-t border-gray-200">
           <div className="relative">
             <button
               onClick={() => setShowDownloadMenu(!showDownloadMenu)}
               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
             >
               <FileDown className="w-4 h-4" />
               <span>Baixar Documento</span>
               <ChevronDown className="w-4 h-4" />
             </button>
             
             {showDownloadMenu && (
               <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                 <div className="py-1">
                   <button
                     onClick={downloadAsTXT}
                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                   >
                     <FileText className="w-4 h-4" />
                     <span>Baixar como TXT</span>
                   </button>
                   <button
                     onClick={downloadAsJSON}
                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                   >
                     <FileDown className="w-4 h-4" />
                     <span>Baixar como JSON</span>
                   </button>
                   <button
                     onClick={downloadAsPDF}
                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                   >
                     <FileText className="w-4 h-4" />
                     <span>Baixar como HTML/PDF</span>
                   </button>
                 </div>
               </div>
             )}
           </div>
           <button
             onClick={onClose}
             className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
           >
             Fechar
           </button>
         </div>
      </div>
    </div>
  );
}

function EditModal({ isOpen, onClose, document, onUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  document: KnowledgeDocument | null;
  onUpdate: (id: string, data: Partial<UploadDocumentData>) => void;
}) {
  const [formData, setFormData] = useState<UploadDocumentData>({
    title: '',
    content: '',
    type: 'lei',

    tags: [],
    source_url: '',
    author: '',
    publication_date: '',
    relevance_score: 1.0
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Preenche o formulário quando o documento é carregado
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title || '',
        content: document.content || '',
        type: document.type || 'lei',

        tags: document.tags || [],
        source_url: document.source_url || '',
        author: document.author || '',
        publication_date: document.publication_date || '',
        relevance_score: document.relevance_score || 1.0
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    
    if (!document) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(document.id, formData);
      toast.success('Documento atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar documento');
    } finally {
      setIsUpdating(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  if (!isOpen || !document) return null;

  const docType = DOCUMENT_TYPES.find(type => type.value === document.type);
  const Icon = docType?.icon || FileText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Editar Documento</h2>
              <p className="text-sm text-gray-600">Modifique as informações do documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Lei 9.503/97 - Código de Trânsito Brasileiro"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Infrações de Trânsito"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Autor
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do autor ou órgão"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score de Relevância
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.relevance_score}
                  onChange={(e) => setFormData({ ...formData, relevance_score: parseFloat(e.target.value) || 1.0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Fonte
              </label>
              <input
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Conteúdo completo do documento..."
                required
              />
            </div>
          </div>
        </form>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={isUpdating}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                <span>Atualizar Documento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ isOpen, onClose, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadDocumentData) => void;
}) {
  const [formData, setFormData] = useState<UploadDocumentData>({
    title: '',
    content: '',
    type: 'lei',
    tags: [],
    source_url: '',
    author: '',
    publication_date: '',
    relevance_score: 1.0
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [filePreview, setFilePreview] = useState<FileProcessingResult | null>(null);
  const fileProcessingService = FileProcessingService.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    
    setIsUploading(true);
    try {
      await onUpload(formData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'lei',

      tags: [],
      source_url: '',
      author: '',
      publication_date: '',
      relevance_score: 1.0
    });
    setTagInput('');
    setUploadMode('text');
    setFilePreview(null);
  };

  const handleFileUpload = async (file: File) => {
    setProcessingFile(true);
    try {
      const result = await fileProcessingService.processFile(file);
      setFilePreview(result);
      
      // Auto-preenche campos baseado no arquivo
      const detectedType = fileProcessingService.detectDocumentType(result.content, file.name);
      const autoTags = fileProcessingService.extractAutoTags(result.content);
      
      // Prepara dados básicos do formulário
      const updatedFormData = {
        ...formData,
        title: formData.title || file.name.replace(/\.[^/.]+$/, ''),
        content: result.content,
        type: detectedType,
        tags: [...(formData.tags || []), ...autoTags].slice(0, 10)
      };
      
      // Se há dados estruturados extraídos, aplica pré-preenchimento inteligente
      if (result.extractedFormData && result.extractedFormData.confidence_score && result.extractedFormData.confidence_score > 0) {
        const extractedData = result.extractedFormData;
        
        // Melhora o título baseado nos dados extraídos
        let smartTitle = updatedFormData.title;
        if (extractedData.numero_auto) {
          smartTitle = `Auto de Infração ${extractedData.numero_auto}`;
        } else if (extractedData.codigo_infracao) {
          smartTitle = `Infração ${extractedData.codigo_infracao}`;
        }
        
        // Adiciona tags inteligentes baseadas nos dados extraídos
        const smartTags = [...(updatedFormData.tags || [])];
        
        if (extractedData.orgao_autuador) {
          smartTags.push(extractedData.orgao_autuador.toLowerCase());
        }
        if (extractedData.descricao_infracao) {
          // Extrai palavras-chave da descrição da infração
          const descricao = extractedData.descricao_infracao.toLowerCase();
          if (descricao.includes('velocidade')) smartTags.push('excesso-velocidade');
          if (descricao.includes('estacionamento')) smartTags.push('estacionamento');
          if (descricao.includes('sinalização')) smartTags.push('sinalização');
          if (descricao.includes('celular')) smartTags.push('celular');
          if (descricao.includes('cinto')) smartTags.push('cinto-segurança');
        }
        if (extractedData.local_infracao) {
          smartTags.push('local-específico');
        }
        
        // Remove duplicatas e limita tags
        const uniqueTags = [...new Set(smartTags)].slice(0, 10);
        
        // Melhora a categoria baseada no tipo de documento
        let smartCategory = updatedFormData.type;
        if (extractedData.numero_auto || extractedData.codigo_infracao) {
          smartCategory = 'outro';
        }
        
        // Atualiza o formulário com dados inteligentes
        updatedFormData.title = smartTitle;
        updatedFormData.tags = uniqueTags;
        updatedFormData.type = smartCategory || updatedFormData.type;
        
        // Adiciona informações estruturadas ao conteúdo se relevantes
        if (extractedData.confidence_score > 0.3) { // Só adiciona se confiança > 30%
          let structuredInfo = '\n\n--- DADOS EXTRAÍDOS AUTOMATICAMENTE ---\n';
          
          if (extractedData.numero_auto) structuredInfo += `Número do Auto: ${extractedData.numero_auto}\n`;
          if (extractedData.data_infracao) structuredInfo += `Data da Infração: ${extractedData.data_infracao}\n`;
          if (extractedData.local_infracao) structuredInfo += `Local: ${extractedData.local_infracao}\n`;
          if (extractedData.codigo_infracao) structuredInfo += `Código da Infração: ${extractedData.codigo_infracao}\n`;
          if (extractedData.descricao_infracao) structuredInfo += `Descrição: ${extractedData.descricao_infracao}\n`;
          if (extractedData.valor_multa) structuredInfo += `Valor da Multa: R$ ${extractedData.valor_multa}\n`;
          if (extractedData.placa_veiculo) structuredInfo += `Placa do Veículo: ${extractedData.placa_veiculo}\n`;
          if (extractedData.nome_condutor) structuredInfo += `Condutor: ${extractedData.nome_condutor}\n`;
          if (extractedData.cpf_condutor) structuredInfo += `CPF do Condutor: ${extractedData.cpf_condutor}\n`;
          if (extractedData.orgao_autuador) structuredInfo += `Órgão Autuador: ${extractedData.orgao_autuador}\n`;
          if (extractedData.velocidade_permitida && extractedData.velocidade_aferida) {
            structuredInfo += `Velocidade: ${extractedData.velocidade_aferida}km/h (limite: ${extractedData.velocidade_permitida}km/h)\n`;
          }
          
          structuredInfo += `\nConfiança da Extração: ${(extractedData.confidence_score * 100).toFixed(1)}%\n`;
          structuredInfo += '--- FIM DOS DADOS EXTRAÍDOS ---\n';
          
          updatedFormData.content = result.content + structuredInfo;
        }
        
        console.log(`Pré-preenchimento aplicado com ${(extractedData.confidence_score * 100).toFixed(1)}% de confiança`);
        console.log('Campos extraídos:', extractedData.extracted_fields?.join(', '));
        
        toast.success(
           `Arquivo processado: ${result.metadata.wordCount} palavras extraídas. ` +
           `Dados estruturados detectados com ${(extractedData.confidence_score * 100).toFixed(1)}% de confiança!`
         );
       } else {
         toast.success(`Arquivo processado: ${result.metadata.wordCount} palavras extraídas`);
       }
      
      setFormData(updatedFormData);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Adicionar Documento</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {/* Abas de Upload */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                uploadMode === 'text'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Texto
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                uploadMode === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Arquivo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Upload de Arquivo */}
            {uploadMode === 'file' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload de Documento
                </label>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                    isDragOver
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {processingFile ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                      <p className="text-sm text-gray-600">Processando arquivo...</p>
                    </div>
                  ) : filePreview ? (
                    <div className="text-left">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-gray-900">{filePreview.metadata.fileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFilePreview(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>Palavras: {filePreview.metadata.wordCount}</div>
                        <div>Tamanho: {(filePreview.metadata.fileSize / 1024).toFixed(1)} KB</div>
                        {filePreview.metadata.pageCount && (
                          <div>Páginas: {filePreview.metadata.pageCount}</div>
                        )}
                        <div>Tipo: {filePreview.metadata.fileType.split('/')[1].toUpperCase()}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-600 mb-1">Preview do conteúdo:</p>
                        <p className="text-sm text-gray-800 line-clamp-3">
                          {fileProcessingService.generatePreview(filePreview.content, 200)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Arraste um arquivo aqui ou clique para selecionar
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Suporta PDF, DOC, DOCX e TXT (máx. 50MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Lei 9.503/97 - Código de Trânsito Brasileiro"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Infrações de Trânsito"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Autor
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do autor ou órgão"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Fonte
              </label>
              <input
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Campo de conteúdo - sempre visível mas com comportamento diferente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo *
                {uploadMode === 'file' && filePreview && (
                  <span className="text-xs text-green-600 ml-2">
                    (Extraído do arquivo)
                  </span>
                )}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={uploadMode === 'file' && filePreview ? 6 : 8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={uploadMode === 'file' 
                  ? "O conteúdo será extraído automaticamente do arquivo..."
                  : "Cole aqui o texto completo do documento..."
                }
                required
                readOnly={uploadMode === 'file' && processingFile}
              />
              {uploadMode === 'file' && filePreview && (
                <p className="text-xs text-gray-500 mt-1">
                  Você pode editar o conteúdo extraído se necessário.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Adicionar Documento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AgenteJuridicoAdmin() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', id?: string, count?: number }>({ type: 'single' });
  const [actionLogs, setActionLogs] = useState<Array<{ id: string, action: string, timestamp: Date, details: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScrapingCTB, setIsScrapingCTB] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState<string>('');

  const knowledgeService = KnowledgeService.getInstance();
  const vectorService = VectorService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsResult, docStats, embStats] = await Promise.all([
        knowledgeService.searchDocuments('', {}, 50),
        knowledgeService.getKnowledgeStats(),
        vectorService.getEmbeddingStats()
      ]);
      
      setDocuments(docsResult.documents);
      setDocumentStats(docStats);
      setEmbeddingStats(embStats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do agente jurídico');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async (data: UploadDocumentData) => {
    setIsProcessing(true);
    try {
      // Usa um UUID fixo válido para o usuário admin
      const adminUserId = '00000000-0000-0000-0000-000000000001';
      await knowledgeService.createDocument(data, adminUserId);
      toast.success('Documento adicionado com sucesso!');
      await loadData();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao adicionar documento');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const document = documents.find(doc => doc.id === id);
    setDeleteTarget({ type: 'single', id, count: 1 });
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.size === 0) {
      toast.error('Nenhum documento selecionado');
      return;
    }
    setDeleteTarget({ type: 'bulk', count: selectedDocuments.size });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        const document = documents.find(doc => doc.id === deleteTarget.id);
        await knowledgeService.deleteDocument(deleteTarget.id);
        
        // Log da ação
        const logEntry = {
          id: crypto.randomUUID(),
          action: 'DELETE_DOCUMENT',
          timestamp: new Date(),
          details: `Documento excluído: "${document?.title || 'Documento'}" (ID: ${deleteTarget.id})`
        };
        setActionLogs(prev => [logEntry, ...prev.slice(0, 99)]); // Mantém apenas os últimos 100 logs
        
        toast.success('Documento excluído com sucesso!');
      } else if (deleteTarget.type === 'bulk') {
        const deletedTitles: string[] = [];
        
        for (const docId of selectedDocuments) {
          const document = documents.find(doc => doc.id === docId);
          await knowledgeService.deleteDocument(docId);
          deletedTitles.push(document?.title || 'Documento');
        }
        
        // Log da ação em massa
        const logEntry = {
          id: crypto.randomUUID(),
          action: 'BULK_DELETE_DOCUMENTS',
          timestamp: new Date(),
          details: `${selectedDocuments.size} documentos excluídos: ${deletedTitles.slice(0, 3).join(', ')}${deletedTitles.length > 3 ? ` e mais ${deletedTitles.length - 3}` : ''}`
        };
        setActionLogs(prev => [logEntry, ...prev.slice(0, 99)]);
        
        clearSelection();
        toast.success(`${selectedDocuments.size} documentos excluídos com sucesso!`);
      }
      
      await loadData();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Erro ao excluir documento(s):', error);
      toast.error('Erro ao excluir documento(s)');
    }
  };

  const handleUpdateDocument = async (id: string, data: Partial<UploadDocumentData>) => {
    try {
      await knowledgeService.updateDocument(id, data);
      
      // Atualiza o documento na lista local
      setDocuments(documents.map(doc => 
        doc.id === id 
          ? { ...doc, ...data, updated_at: new Date().toISOString() }
          : doc
      ));

      // Atualiza o documento selecionado se for o mesmo
      if (selectedDocument?.id === id) {
        setSelectedDocument({ ...selectedDocument, ...data, updated_at: new Date().toISOString() });
      }

    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      throw error;
    }
   };

   const toggleDocumentSelection = (documentId: string) => {
     const newSelected = new Set(selectedDocuments);
     if (newSelected.has(documentId)) {
       newSelected.delete(documentId);
     } else {
       newSelected.add(documentId);
     }
     setSelectedDocuments(newSelected);
     setShowBulkActions(newSelected.size > 0);
   };

   const selectAllDocuments = () => {
     const allIds = new Set(filteredDocuments.map(doc => doc.id));
     setSelectedDocuments(allIds);
     setShowBulkActions(true);
   };

   const clearSelection = () => {
     setSelectedDocuments(new Set());
     setShowBulkActions(false);
   };

   const handleCTBScraping = async () => {
     if (isScrapingCTB) return;
     
     setIsScrapingCTB(true);
     setScrapingProgress('Iniciando scraping do CTB Digital...');
     
     try {
       console.log('🚀 Iniciando processo de scraping do CTB Digital...');
       
       // Scraping de uma faixa de artigos (1-50 como exemplo)
       setScrapingProgress('Extraindo artigos do CTB Digital...');
       console.log('📥 Chamando ctbScrapingService.scrapeArticleRange(1, 50)...');
       const results = await ctbScrapingService.scrapeArticleRange(1, 50);
       
       console.log('📊 Resultado do scraping:', {
         articlesExtracted: results.articles.length,
         errors: results.errors.length,
         articles: results.articles.map(a => a.articleNumber)
       });
       
       if (results.articles.length === 0) {
         console.warn('⚠️ Nenhum artigo foi extraído do CTB Digital');
         toast.warning('Nenhum artigo foi extraído do CTB Digital');
         return;
       }
       
       setScrapingProgress(`Adicionando ${results.articles.length} artigos à base de conhecimento...`);
       const adminUserId = '00000000-0000-0000-0000-000000000001';
       
       console.log(`💾 Adicionando ${results.articles.length} artigos à base de conhecimento...`);
       const addResult = await ctbScrapingService.addArticlesToKnowledgeBase(results.articles);
       
       console.log('📊 Resultado da adição:', addResult);
       
       // Mensagem mais detalhada baseada no resultado
       if (addResult.success > 0) {
         const message = `${addResult.success} artigos adicionados com sucesso!`;
         toast.success(message);
       } else {
         toast.error('Nenhum artigo foi adicionado à base de conhecimento');
       }
       
       if (addResult.errors.length > 0) {
         console.error('❌ Erros durante a adição:', addResult.errors);
         toast.warning(`${addResult.errors.length} artigos falharam ao ser adicionados`);
       }
       
       console.log('🔄 Recarregando lista de documentos...');
       await loadData(); // Recarrega a lista de documentos
       console.log('✅ Lista de documentos recarregada');
       
     } catch (error) {
       console.error('❌ Erro no scraping do CTB:', error);
       toast.error('Erro ao extrair dados do CTB Digital');
     } finally {
       setIsScrapingCTB(false);
       setScrapingProgress('');
       console.log('🏁 Processo de scraping finalizado');
     }
   };

   const exportSelectedDocuments = (format: 'txt' | 'json') => {
     const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));
     
     if (format === 'txt') {
       const content = selectedDocs.map(doc => {
         const docType = DOCUMENT_TYPES.find(type => type.value === doc.type);
         return `=== ${doc.title} ===\n` +
           `Tipo: ${docType?.label || doc.type}\n` +
           `Tipo: ${docType?.label || doc.type}\n` +
           `Autor: ${doc.author || 'N/A'}\n` +
           `Data de Publicação: ${doc.publication_date ? new Date(doc.publication_date).toLocaleDateString('pt-BR') : 'N/A'}\n` +
           `Score de Relevância: ${doc.relevance_score.toFixed(1)}\n` +
           `Tags: ${doc.tags?.join(', ') || 'N/A'}\n` +
           `Fonte: ${doc.source_url || 'N/A'}\n` +
           `\n--- CONTEÚDO ---\n${doc.content}\n\n`;
       }).join('\n' + '='.repeat(80) + '\n\n');
       
       const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `documentos_selecionados_${new Date().toISOString().split('T')[0]}.txt`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
       
       toast.success(`${selectedDocs.length} documentos exportados como TXT!`);
     } else if (format === 'json') {
       const jsonData = {
         exported_at: new Date().toISOString(),
         total_documents: selectedDocs.length,
         documents: selectedDocs.map(doc => ({
           id: doc.id,
           title: doc.title,
           content: doc.content,
           type: doc.type,
           author: doc.author,
           publication_date: doc.publication_date,
           source_url: doc.source_url,
           tags: doc.tags,
           relevance_score: doc.relevance_score,
           created_at: doc.created_at,
           updated_at: doc.updated_at
         }))
       };
       
       const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `documentos_selecionados_${new Date().toISOString().split('T')[0]}.json`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
       
       toast.success(`${selectedDocs.length} documentos exportados como JSON!`);
     }
     
     clearSelection();
   };

   const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !selectedType || doc.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando agente jurídico...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Agente Jurídico IA</h2>
            <p className="text-sm text-gray-600">Base de conhecimento e configurações</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Documento</span>
          </button>
          
          <button
            onClick={handleCTBScraping}
            disabled={isScrapingCTB}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isScrapingCTB ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isScrapingCTB ? 'Extraindo...' : 'CTB Digital'}</span>
          </button>
        </div>
      </div>

      {/* Scraping Progress */}
      {isScrapingCTB && scrapingProgress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-green-600 animate-spin" />
            <div>
              <p className="text-green-800 font-medium">Scraping do CTB Digital em andamento</p>
              <p className="text-green-600 text-sm">{scrapingProgress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Documentos"
          value={documentStats?.totalDocuments || 0}
          icon={FileText}
          color="text-blue-600"
        />
        <StatCard
          title="Chunks Processados"
          value={embeddingStats?.totalChunks || 0}
          icon={Brain}
          color="text-purple-600"
        />
        <StatCard
          title="Tags Únicas"
          value={documentStats?.totalTags || 0}
          icon={Tag}
          color="text-green-600"
        />
        <StatCard
          title="Score Médio"
          value={documentStats?.avgRelevanceScore.toFixed(1) || '0.0'}
          icon={BarChart3}
          color="text-orange-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os tipos</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            {filteredDocuments.length > 0 && (
              <button
                onClick={selectedDocuments.size === filteredDocuments.length ? clearSelection : selectAllDocuments}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {selectedDocuments.size === filteredDocuments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}
            <button
              onClick={loadData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
        
        {selectedDocuments.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {selectedDocuments.size} documento{selectedDocuments.size > 1 ? 's' : ''} selecionado{selectedDocuments.size > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportSelectedDocuments('txt')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Exportar TXT</span>
                </button>
                
                <button
                  onClick={() => exportSelectedDocuments('json')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Exportar JSON</span>
                </button>
                
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir ({selectedDocuments.size})</span>
                </button>
                
                <button
                  onClick={clearSelection}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(document => (
          <DocumentCard
            key={document.id}
            document={document}
            onEdit={(doc) => {
              setSelectedDocument(doc);
              setShowEditModal(true);
            }}
            onDelete={handleDeleteDocument}
            onView={(doc) => {
              setSelectedDocument(doc);
              setShowViewModal(true);
            }}
            isSelected={selectedDocuments.has(document.id)}
            onToggleSelect={toggleDocumentSelection}
          />
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedType ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedType 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando documentos à base de conhecimento'
            }
          </p>
          {!searchQuery && !selectedType && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adicionar Primeiro Documento
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadDocument}
      />

      {/* View Modal */}
      <ViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onUpdate={handleUpdateDocument}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {deleteTarget.type === 'single' ? 'Confirmar Exclusão' : 'Confirmar Exclusão em Massa'}
                </h3>
                <p className="text-sm text-gray-500">
                  {deleteTarget.type === 'single' 
                    ? 'Esta ação não pode ser desfeita.'
                    : 'Esta ação excluirá múltiplos documentos e não pode ser desfeita.'
                  }
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                {deleteTarget.type === 'single' 
                  ? 'Tem certeza que deseja excluir este documento?'
                  : `Tem certeza que deseja excluir ${deleteTarget.count} documento${deleteTarget.count! > 1 ? 's' : ''}?`
                }
              </p>
              {deleteTarget.type === 'single' && deleteTarget.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {documents.find(doc => doc.id === deleteTarget.id)?.title || 'Documento'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteTarget.type === 'single' ? 'Excluir Documento' : `Excluir ${deleteTarget.count} Documentos`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Logs Panel */}
      {actionLogs.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Logs de Ações</h4>
              <button
                onClick={() => setActionLogs([])}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {actionLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="p-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-1">
                    {log.action.includes('DELETE') ? (
                      <Trash2 className="w-3 h-3 text-red-500" />
                    ) : (
                      <FileText className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">
                      {log.details}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {log.timestamp.toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}