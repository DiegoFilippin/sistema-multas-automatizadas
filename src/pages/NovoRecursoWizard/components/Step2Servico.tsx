import React, { useState, useEffect } from 'react';
import { FileText, Info, TrendingUp, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { Servico } from '../types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Step2ServicoProps {
  selectedServico: Servico | null;
  onServicoSelect: (servico: Servico) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Servico: React.FC<Step2ServicoProps> = ({
  selectedServico,
  onServicoSelect,
  onNext,
  onBack,
}) => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServicos();
  }, []);

  const loadServicos = async () => {
    try {
      setIsLoading(true);

      // Carregar serviços da mesma forma que em MeusServicos
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const servicosFormatados: Servico[] = (data || []).map((s: any) => {
        const acsm_cost = s.acsm_value || 0;
        const icetran_cost = s.icetran_value || 0;
        const taxa_cobranca = s.taxa_cobranca || 3.50;
        const base_cost = acsm_cost + icetran_cost + taxa_cobranca;
        
        return {
          id: s.id,
          nome: s.name,
          descricao: s.description,
          preco: s.suggested_price || base_cost,
          tipo_recurso: s.category || 'recurso',
          prazo_dias: s.prazo_dias,
          taxa_sucesso: s.taxa_sucesso,
          ativo: s.is_active,
          // Campos adicionais para exibir custos
          acsm_value: acsm_cost,
          icetran_value: icetran_cost,
          taxa_cobranca: taxa_cobranca,
          base_cost: base_cost,
        };
      });

      // Remover duplicatas por nome (manter apenas o primeiro de cada)
      const servicosUnicos = servicosFormatados.filter((servico, index, self) =>
        index === self.findIndex((s) => s.nome === servico.nome)
      );

      console.log('📊 Serviços carregados:', servicosFormatados.length);
      console.log('✅ Serviços únicos:', servicosUnicos.length);

      setServicos(servicosUnicos);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicoClick = (servico: Servico) => {
    onServicoSelect(servico);
  };

  const handleContinue = () => {
    if (!selectedServico) {
      toast.error('Selecione um serviço para continuar');
      return;
    }
    onNext();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Escolha o Tipo de Serviço
        </h2>
        <p className="text-gray-600">
          Selecione o tipo de recurso que deseja criar
        </p>
      </div>

      {/* Selected Servico Display */}
      {selectedServico && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                <FileText className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  {selectedServico.nome}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedServico.descricao || 'Serviço de recurso de multa'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    R$ {selectedServico.preco.toFixed(2)}
                  </span>
                  {selectedServico.prazo_dias && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {selectedServico.prazo_dias} dias
                    </span>
                  )}
                  {selectedServico.taxa_sucesso && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      {selectedServico.taxa_sucesso}% sucesso
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                  Selecionado
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Serviços Disponíveis
          </h3>
          <span className="text-sm text-gray-500">
            {servicos.length} serviço(s)
          </span>
        </div>

        {servicos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Nenhum serviço disponível</p>
            <p className="text-sm text-gray-500">
              Entre em contato com o administrador
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {servicos.map((servico) => (
              <ServicoCard
                key={servico.id}
                servico={servico}
                isSelected={selectedServico?.id === servico.id}
                onClick={() => handleServicoClick(servico)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between max-w-5xl mx-auto pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Voltar
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedServico}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

// Componente ServicoCard
interface ServicoCardProps {
  servico: Servico;
  isSelected: boolean;
  onClick: () => void;
}

const ServicoCard: React.FC<ServicoCardProps> = ({
  servico,
  isSelected,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-5 rounded-xl border-2 transition-all
        ${
          isSelected
            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`
          w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
          ${isSelected ? 'bg-blue-600' : 'bg-gray-100'}
          transition-colors
        `}
        >
          <FileText
            className={`w-7 h-7 ${
              isSelected ? 'text-white' : 'text-gray-600'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-lg mb-1 ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}
              >
                {servico.nome}
              </h3>
              {servico.descricao && (
                <p className="text-sm text-gray-600 line-clamp-1">
                  {servico.descricao}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
              <div className="font-bold text-xl text-green-600">
                R$ {servico.preco.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Custo base: R$ {(servico as any).base_cost?.toFixed(2) || '0.00'}
              </div>
              {isSelected && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                  <CheckCircle2 className="w-3 h-3" />
                  Selecionado
                </span>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-4">
              {servico.prazo_dias && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{servico.prazo_dias} dias</span>
                </div>
              )}
              {servico.taxa_sucesso && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{servico.taxa_sucesso}% sucesso</span>
                </div>
              )}
              {!isSelected && (
                <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                  <Info className="w-3.5 h-3.5" />
                  <span>Clique para selecionar</span>
                </div>
              )}
            </div>
            
            {/* Cost Breakdown */}
            {(servico as any).acsm_value !== undefined && (
              <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>ACSM: R$ {(servico as any).acsm_value?.toFixed(2)}</span>
                <span>•</span>
                <span>ICETRAN: R$ {(servico as any).icetran_value?.toFixed(2)}</span>
                <span>•</span>
                <span>Taxa: R$ {(servico as any).taxa_cobranca?.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default Step2Servico;
