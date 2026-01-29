import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // em MB
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxSize = 10,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    // Verificar tamanho
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSize) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
      return false;
    }

    // Verificar tipo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      toast.error(`Tipo de arquivo não suportado. Tipos aceitos: ${acceptedTypes.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    // Armazenar arquivo pendente e mostrar modal de confirmação
    setPendingFile(file);
    setShowConfirmModal(true);
  }, [maxSize, acceptedTypes]);

  const handleConfirmUpload = () => {
    if (!pendingFile) return;

    setShowConfirmModal(false);
    setUploadedFile(pendingFile);
    setIsProcessing(true);
    
    // Chamar onFileSelect imediatamente para evitar perda de referência do arquivo
    onFileSelect(pendingFile);
    toast.success('Arquivo processado com sucesso!');
    setIsProcessing(false);
    setPendingFile(null);
  };

  const handleCancelUpload = () => {
    setShowConfirmModal(false);
    setPendingFile(null);
    toast.info('Upload cancelado. Envie o documento correto.');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setIsProcessing(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
          </div>
          
          <button
            onClick={removeFile}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {isProcessing && (
          <div className="mt-4 flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm">Processando documento...</span>
          </div>
        )}
        
        {!isProcessing && (
          <div className="mt-4 flex items-center text-green-600">
            <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-sm">Arquivo processado com sucesso</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
          `}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${
            isDragOver ? 'text-blue-600' : 'text-gray-400'
          }`} />
          
          <div className="space-y-2">
            <p className="text-gray-600 font-medium">
              {isDragOver 
                ? 'Solte o arquivo aqui' 
                : 'Arraste e solte o documento da multa aqui'
              }
            </p>
            
            <p className="text-sm text-gray-500">
              ou clique para selecionar
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <AlertCircle className="w-3 h-3" />
              <span>
                Tipos aceitos: {acceptedTypes.join(', ')} | Tamanho máximo: {maxSize}MB
              </span>
            </div>
          </div>
          
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
            id="file-upload-input"
          />
          
          <label
            htmlFor="file-upload-input"
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium"
          >
            Selecionar Arquivo
          </label>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && pendingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start space-x-4 mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirmar envio de documento
                </h3>
                <p className="text-gray-600 mb-4">
                  Você confirma que o documento enviado é o documento correto para recurso?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {pendingFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(pendingFile.size)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelUpload}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUpload;