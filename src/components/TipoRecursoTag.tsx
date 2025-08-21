import React from 'react';
import { Shield, FileText, Scale } from 'lucide-react';

interface TipoRecursoTagProps {
  tipoRecurso: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function TipoRecursoTag({ 
  tipoRecurso, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}: TipoRecursoTagProps) {
  // Configurações baseadas no tipo de recurso
  const getTagConfig = () => {
    switch (tipoRecurso) {
      case 'conversao':
        return {
          label: 'Art. 267 CTB',
          description: 'Conversão em Advertência',
          icon: Shield,
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-800',
          borderColor: 'border-emerald-200',
          iconColor: 'text-emerald-600'
        };
      case 'defesa_previa':
        return {
          label: 'Defesa Prévia',
          description: 'Recurso Administrativo',
          icon: FileText,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      case 'jari':
        return {
          label: 'JARI',
          description: 'Junta Administrativa',
          icon: Scale,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600'
        };
      case 'cetran':
        return {
          label: 'CETRAN',
          description: 'Conselho Estadual',
          icon: Scale,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600'
        };
      default:
        return {
          label: 'Recurso',
          description: 'Tipo não especificado',
          icon: FileText,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getTagConfig();
  const Icon = config.icon;

  // Configurações de tamanho
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      gap: 'gap-1'
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'h-5 w-5',
      gap: 'gap-2'
    }
  };

  const currentSize = sizeConfig[size];

  return (
    <div className={`
      inline-flex items-center ${currentSize.gap} 
      ${config.bgColor} ${config.textColor} ${config.borderColor}
      ${currentSize.container}
      border rounded-full font-medium
      ${className}
    `}>
      {showIcon && (
        <Icon className={`${currentSize.icon} ${config.iconColor}`} />
      )}
      <span>{config.label}</span>
    </div>
  );
}

// Componente para explicação detalhada do Art. 267
export function Art267Explanation({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <h4 className="font-semibold text-emerald-900">
            Conversão em Advertência por Escrito - Art. 267 CTB
          </h4>
          <div className="text-sm text-emerald-800 space-y-1">
            <p>
              <strong>Fundamentação Legal:</strong> Este recurso solicita a conversão da multa em advertência por escrito, 
              conforme previsto no Art. 267 do Código de Trânsito Brasileiro (Lei 9.503/97).
            </p>
            <p>
              <strong>Requisitos Atendidos:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-0.5">
              <li>Infração classificada como LEVE</li>
              <li>Condutor sem histórico de multas nos últimos 12 meses</li>
              <li>Primeira infração do tipo no período</li>
            </ul>
            <p>
              <strong>Benefício:</strong> Em caso de deferimento, a multa será convertida em advertência por escrito, 
              sem cobrança de valor e sem pontuação na CNH.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para verificar se um recurso é Art. 267
export function useIsArt267(tipoRecurso: string): boolean {
  return tipoRecurso === 'conversao';
}

// Função utilitária para obter descrição do tipo de recurso
export function getTipoRecursoDescription(tipoRecurso: string): string {
  switch (tipoRecurso) {
    case 'conversao':
      return 'Pedido de conversão da multa em advertência por escrito conforme Art. 267 do CTB';
    case 'defesa_previa':
      return 'Recurso administrativo de defesa prévia contra auto de infração';
    case 'jari':
      return 'Recurso à Junta Administrativa de Recursos de Infrações';
    case 'cetran':
      return 'Recurso ao Conselho Estadual de Trânsito';
    default:
      return 'Recurso administrativo de trânsito';
  }
}