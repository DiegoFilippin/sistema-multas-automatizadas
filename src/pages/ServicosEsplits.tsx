import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  PieChart, 
  TrendingUp, 
  Calculator, 
  CheckCircle, 
  X, 
  Save,
  AlertCircle,
  AlertTriangle,
  Coins
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { companiesService } from '../services/companiesService';

// Interfaces
interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing_type: 'percentage' | 'fixed';
  percentage_value?: number;
  minimum_value?: number;
  fixed_value?: number;
  icetran_company_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SplitConfiguration {
  id: string;
  service_id: string;
  service_type: string;
  acsm_pricing_type: 'percentage' | 'fixed';
  acsm_percentage_value?: number;
  acsm_minimum_value?: number;
  acsm_fixed_value?: number;
  icetran_pricing_type: 'percentage' | 'fixed';
  icetran_percentage_value?: number;
  icetran_minimum_value?: number;
  icetran_fixed_value?: number;
  minimum_charge_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credit_amount: number;
  price: number;
  discount_percentage: number;
  target_type: 'client' | 'company';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  pricing_type: 'percentage' | 'fixed';
  percentage_value: string;
  minimum_value: string;
  fixed_value: string;
  icetran_company_id: string;
  acsm_value: number;
  icetran_value: number;
  taxa_cobranca: number;
  base_price: number;
  suggested_price: number;
  multa_types_config?: MultaTypeConfig[];
}

interface SplitFormData {
  service_id: string;
  acsm_pricing_type: 'percentage' | 'fixed';
  acsm_percentage_value: string;
  acsm_minimum_value: string;
  acsm_fixed_value: string;
  icetran_pricing_type: 'percentage' | 'fixed';
  icetran_percentage_value: string;
  icetran_minimum_value: string;
  icetran_fixed_value: string;
}

interface CreditPackageFormData {
  name: string;
  description: string;
  credit_amount: string;
  price: string;
  discount_percentage: string;
  target_type: 'client' | 'company';
}

interface DespachanteServicePricing {
  id: string;
  despachante_id: string;
  service_id: string;
  client_price: number;
  created_at: string;
  updated_at: string;
  despachante_name: string;
  despachante_email: string;
}

interface ServiceWithDespachantesPricing {
  service: Service;
  split_config: SplitConfiguration | null;
  despachantes_pricing: DespachanteServicePricing[];
  base_cost: number;
}

// Componente TabButton
function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors flex items-center",
        active 
          ? "bg-blue-600 text-white" 
          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
      )}
    >
      {children}
    </button>
  );
}

// Componente ServiceCard
function ServiceCard({ 
  service, 
  onEdit, 
  onDelete 
}: { 
  service: Service; 
  onEdit: (service: Service) => void; 
  onDelete: (id: string) => void; 
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{service.description}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {service.category}
            </span>
            <span className={cn(
              "inline-block px-2 py-1 text-xs font-medium rounded-full",
              service.is_active 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            )}>
              {service.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(service)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(service.id);
            }}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Excluir"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="text-sm text-gray-600">
          {service.pricing_type === 'percentage' ? (
            <span>
              {service.percentage_value}% (mín. R$ {service.minimum_value})
            </span>
          ) : (
            <span>Valor fixo: R$ {service.fixed_value}</span>
          )}
        </div>
      </div>

    </div>
  );
}

// Tipos de multa disponíveis
const MULTA_TYPES = [
  { id: 'leve', name: 'Leve', color: 'bg-green-100 text-green-800' },
  { id: 'media', name: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'grave', name: 'Grave', color: 'bg-orange-100 text-orange-800' },
  { id: 'gravissima', name: 'Gravíssima', color: 'bg-red-100 text-red-800' }
];

// Interface para configuração de tipos de multa
interface MultaTypeConfig {
  type: string;
  acsm_cost: number;
  icetran_cost: number;
  suggested_price: number;
  minimum_price: number;
}

// Interface para configuração de splits dinâmicos
interface SplitConfig {
  acsm_value: number;
  icetran_value: number;
  taxa_cobranca: number;
}

// Componente de Configuração de Splits Dinâmicos
function SplitConfigurationSection({ 
  serviceForm, 
  setServiceForm 
}: {
  serviceForm: ServiceFormData & { splitConfig?: SplitConfig };
  setServiceForm: React.Dispatch<React.SetStateAction<ServiceFormData & { splitConfig?: SplitConfig }>>;
}) {
  // Valores padrão para splits
  const defaultSplitConfig: SplitConfig = {
    acsm_value: 6.00,
    icetran_value: 6.00,
    taxa_cobranca: 3.50
  };
  
  const splitConfig = serviceForm.splitConfig || defaultSplitConfig;
  const custoMinimo = splitConfig.acsm_value + splitConfig.icetran_value + splitConfig.taxa_cobranca;
  
  const updateSplitConfig = (field: keyof SplitConfig, value: number) => {
    setServiceForm(prev => ({
      ...prev,
      splitConfig: {
        ...splitConfig,
        [field]: value
      }
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <Coins className="w-4 h-4 mr-2" />
          💰 Configuração de Splits Dinâmicos
        </h4>
        <p className="text-sm text-blue-800 mb-4">
          Configure os valores fixos que serão descontados de cada cobrança. 
          O valor restante será a margem do despachante.
        </p>
        
        {/* Campos de Configuração */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              ACSM (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={splitConfig.acsm_value}
              onChange={(e) => updateSplitConfig('acsm_value', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="text-xs text-blue-600 mt-1">Valor fixo para ACSM</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              ICETRAN (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={splitConfig.icetran_value}
              onChange={(e) => updateSplitConfig('icetran_value', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="text-xs text-blue-600 mt-1">Valor fixo para ICETRAN</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Taxa de Cobrança (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={splitConfig.taxa_cobranca}
              onChange={(e) => updateSplitConfig('taxa_cobranca', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="text-xs text-blue-600 mt-1">Taxa operacional</p>
          </div>
        </div>
        
        {/* Custo Mínimo Calculado */}
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">💡 Custo Mínimo Total:</span>
            <span className="text-lg font-bold text-blue-700">
              R$ {custoMinimo.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Este é o valor mínimo que deve ser cobrado. Qualquer valor acima será margem do despachante.
          </p>
        </div>
      </div>
      
      {/* Simulação de Splits */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-4 flex items-center">
          <Calculator className="w-4 h-4 mr-2" />
          📊 Simulação de Splits
        </h4>
        
        {[60, 90, 120, 149.96].map(valor => {
          const margemDespachante = Math.max(0, valor - custoMinimo);
          const isViable = valor >= custoMinimo;
          
          return (
            <div key={valor} className={cn(
              "mb-3 p-3 rounded border-l-4",
              isViable ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"
            )}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">
                  Cobrança de R$ {valor.toFixed(2)}
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  isViable ? "text-green-600" : "text-red-600"
                )}>
                  {isViable ? '✅ Viável' : '❌ Inviável'} - Margem: R$ {margemDespachante.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-blue-600">
                  <span className="font-medium">ACSM:</span> R$ {splitConfig.acsm_value.toFixed(2)}
                </div>
                <div className="text-purple-600">
                  <span className="font-medium">ICETRAN:</span> R$ {splitConfig.icetran_value.toFixed(2)}
                </div>
                <div className="text-orange-600">
                  <span className="font-medium">Taxa:</span> R$ {splitConfig.taxa_cobranca.toFixed(2)}
                </div>
                <div className={cn(
                  "font-medium",
                  margemDespachante > 0 ? "text-green-600" : "text-gray-600"
                )}>
                  <span>Despachante:</span> R$ {margemDespachante.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Componente MultaTypesConfiguration (mantido para compatibilidade)
function MultaTypesConfiguration({ 
  serviceForm, 
  setServiceForm 
}: {
  serviceForm: ServiceFormData;
  setServiceForm: React.Dispatch<React.SetStateAction<ServiceFormData>>;
}) {
  const configs = serviceForm.multa_types_config || MULTA_TYPES.map(type => {
    const acsm_cost = type.id === 'grave' ? 10 : type.id === 'gravissima' ? 12 : 6;
    const icetran_cost = type.id === 'grave' ? 10 : type.id === 'gravissima' ? 12 : 6;
    const minimum_price = acsm_cost + icetran_cost + 3.5;
    const suggested_price = minimum_price + 10; // Adicionar R$ 10 de margem padrão
    
    return {
      type: type.id,
      acsm_cost,
      icetran_cost,
      suggested_price,
      minimum_price
    };
  });

  const updateConfig = (typeId: string, field: keyof MultaTypeConfig, value: number) => {
    const updatedConfigs = configs.map(config => {
      if (config.type === typeId) {
        const updated = { ...config, [field]: value };
        // Recalcular valor mínimo quando ACSM ou Icetran mudarem
        if (field === 'acsm_cost' || field === 'icetran_cost') {
          updated.minimum_price = updated.acsm_cost + updated.icetran_cost + 3.5;
          // Ajustar preço sugerido se estiver abaixo do mínimo
          if (updated.suggested_price < updated.minimum_price) {
            updated.suggested_price = updated.minimum_price;
          }
        }
        return updated;
      }
      return config;
    });
    
    // Atualizar serviceForm diretamente
    setServiceForm(prev => ({
      ...prev,
      multa_types_config: updatedConfigs
    }));
  };

  return (
    <div className="space-y-6">
      {MULTA_TYPES.map((multaType) => {
        const config = configs.find(c => c.type === multaType.id);
        if (!config) return null;

        const isValidPrice = config.suggested_price >= config.minimum_price;

        return (
          <div key={multaType.id} className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 text-sm font-medium rounded-full",
                  multaType.color
                )}>
                  {multaType.name}
                </span>
                <div className="text-sm text-gray-600">
                  Valor mínimo: <span className="font-medium text-blue-600">R$ {config.minimum_price.toFixed(2)}</span>
                </div>
              </div>
              {!isValidPrice && (
                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  ⚠️ Preço abaixo do mínimo
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ACSM (R$)
                </label>
                <input
                  type="number"
                  value={config.acsm_cost}
                  onChange={(e) => updateConfig(multaType.id, 'acsm_cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icetran (R$)
                </label>
                <input
                  type="number"
                  value={config.icetran_cost}
                  onChange={(e) => updateConfig(multaType.id, 'icetran_cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Sugerido (R$)
                </label>
                <input
                  type="number"
                  value={config.suggested_price}
                  onChange={(e) => updateConfig(multaType.id, 'suggested_price', parseFloat(e.target.value) || 0)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    isValidPrice ? "border-gray-300" : "border-red-300 bg-red-50"
                  )}
                  min={config.minimum_price}
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margem Despachante
                </label>
                <div className={cn(
                  "px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium",
                  config.suggested_price > config.minimum_price ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"
                )}>
                  R$ {Math.max(0, config.suggested_price - config.minimum_price).toFixed(2)}
                  {config.suggested_price === config.minimum_price && (
                    <div className="text-xs text-orange-600 mt-1">
                      💡 Aumente o preço sugerido para ter margem
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview do Split */}
            <div className="mt-4 p-3 bg-white rounded border">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Preview do Split</h5>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ACSM:</span>
                  <span className="ml-2 font-medium">R$ {config.acsm_cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Icetran:</span>
                  <span className="ml-2 font-medium">R$ {config.icetran_cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Despachante:</span>
                  <span className={cn(
                    "ml-2 font-medium",
                    config.suggested_price > config.minimum_price ? "text-green-600" : "text-gray-600"
                  )}>
                    R$ {Math.max(0, config.suggested_price - config.minimum_price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Como funciona:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Valor Mínimo:</strong> ACSM + Icetran + R$ 3,50 (custo operacional)</li>
          <li>• <strong>Preço Sugerido:</strong> Valor recomendado para cobrança do cliente</li>
          <li>• <strong>Margem:</strong> Diferença entre preço sugerido e valor mínimo (lucro do despachante)</li>
          <li>• <strong>Flexibilidade:</strong> Despachantes podem cobrar mais ou menos, respeitando o valor mínimo</li>
        </ul>
      </div>
    </div>
  );
}

// Componente SplitPreview
function SplitPreview({ 
  serviceValue,
  splitConfig
}: {
  serviceValue: number;
  splitConfig?: SplitConfiguration;
}) {
  // Calcular valor ACSM baseado no tipo de precificação
  let acsmValue = 0;
  if (splitConfig?.acsm_pricing_type === 'percentage' && splitConfig.acsm_percentage_value && splitConfig.acsm_minimum_value) {
    const percentageValue = (serviceValue * splitConfig.acsm_percentage_value) / 100;
    acsmValue = Math.max(percentageValue, splitConfig.acsm_minimum_value);
  } else if (splitConfig?.acsm_pricing_type === 'fixed' && splitConfig.acsm_fixed_value) {
    acsmValue = splitConfig.acsm_fixed_value;
  }

  // Calcular valor ICETRAN baseado no tipo de precificação
  let icetranValue = 0;
  if (splitConfig?.icetran_pricing_type === 'percentage' && splitConfig.icetran_percentage_value && splitConfig.icetran_minimum_value) {
    const percentageValue = (serviceValue * splitConfig.icetran_percentage_value) / 100;
    icetranValue = Math.max(percentageValue, splitConfig.icetran_minimum_value);
  } else if (splitConfig?.icetran_pricing_type === 'fixed' && splitConfig.icetran_fixed_value) {
    icetranValue = splitConfig.icetran_fixed_value;
  }

  // Calcular valor mínimo de cobrança: (ACSM + ICETRAN) + R$ 3,50
  const minimumChargeValue = acsmValue + icetranValue + 3.50;
  const despachanteProfit = Math.max(0, serviceValue - minimumChargeValue);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
        <Calculator className="w-4 h-4 mr-2" />
        Preview do Split (Valor: R$ {serviceValue.toFixed(2)})
      </h4>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">ACSM</span>
          <span className="text-sm font-medium">R$ {acsmValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">ICETRAN</span>
          <span className="text-sm font-medium">R$ {icetranValue.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center font-medium">
            <span className="text-sm text-blue-600">
              Valor Mínimo de Cobrança
            </span>
            <span className="text-sm font-bold text-blue-600">R$ {minimumChargeValue.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fórmula: (ACSM + ICETRAN) + R$ 3,50
          </p>
        </div>
        {serviceValue > minimumChargeValue && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700 font-medium">
                Lucro do Despachante
              </span>
              <span className="text-sm font-bold text-green-700">R$ {despachanteProfit.toFixed(2)}</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Valor acima do mínimo = lucro do despachante
            </p>
          </div>
        )}
        {serviceValue < minimumChargeValue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600">
              ⚠️ Valor do serviço está abaixo do mínimo de cobrança
            </p>
          </div>
        )}

        {/* Modal removido daqui - será renderizado no componente principal */}
      </div>
    </div>
  );
}

export default function ServicosEsplits() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('servicos');
  const [services, setServices] = useState<Service[]>([]);
  const [splitConfigurations, setSplitConfigurations] = useState<SplitConfiguration[]>([]);
  const [servicesWithDespachantesPricing, setServicesWithDespachantesPricing] = useState<ServiceWithDespachantesPricing[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showSplitForm, setShowSplitForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingSplit, setEditingSplit] = useState<SplitConfiguration | null>(null);
  const [previewValue, setPreviewValue] = useState(100);
  
  // Estados para pacotes de créditos
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  
  // Estados para modal de confirmação de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: '',
    pricing_type: 'percentage',
    percentage_value: '',
    minimum_value: '',
    fixed_value: '',
    icetran_company_id: '',
    acsm_value: 6.00,
    icetran_value: 6.00,
    taxa_cobranca: 3.50,
    base_price: 15.50,
    suggested_price: 60.00,
    multa_types_config: MULTA_TYPES.map(type => ({
      type: type.id,
      acsm_cost: 50,
      icetran_cost: 30,
      suggested_price: 83.5,
      minimum_price: 83.5
    }))
  });

  const [splitForm, setSplitForm] = useState<SplitFormData>({
    service_id: '',
    // Campos para ACSM
    acsm_pricing_type: 'percentage',
    acsm_percentage_value: '30',
    acsm_minimum_value: '50',
    acsm_fixed_value: '100',
    // Campos para ICETRAN
    icetran_pricing_type: 'percentage',
    icetran_percentage_value: '20',
    icetran_minimum_value: '30',
    icetran_fixed_value: '80'
  });

  const [packageForm, setPackageForm] = useState<CreditPackageFormData>({
    name: '',
    description: '',
    credit_amount: '',
    price: '',
    discount_percentage: '0',
    target_type: 'client'
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadServices();
    loadSplitConfigurations();
    loadCompanies();
    if (user?.role === 'Superadmin') {
      loadServicesWithDespachantesPricing();
      loadCreditPackages();
    }
  }, [user]);

  const loadCreditPackages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/credits/packages?targetType=client');
      const clientData = await response.json();
      
      const response2 = await fetch('/api/credits/packages?targetType=company');
      const companyData = await response2.json();
      
      const allPackages = [
        ...(clientData.success ? clientData.data : []),
        ...(companyData.success ? companyData.data : [])
      ];
      
      setCreditPackages(allPackages);
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error);
      toast.error('Erro ao carregar pacotes de créditos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const icetranCompanies = await companiesService.getIcetranCompanies();
      setCompanies(icetranCompanies);
    } catch (error) {
      console.error('Erro ao carregar empresas ICETRAN:', error);
      toast.error('Erro ao carregar empresas ICETRAN');
    }
  };

  const loadServices = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Se não há dados, criar um serviço de teste
      if (!data || data.length === 0) {
        const testService = {
          id: 'test-service-1',
          name: 'Recurso de Multa (Teste)',
          description: 'Serviço de teste para verificar funcionalidade',
          category: 'Recursos',
          pricing_type: 'percentage' as const,
          percentage_value: 15,
          minimum_value: 83.5,
          fixed_value: null,
          icetran_company_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setServices([testService]);
      } else {
        setServices(data);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      // Em caso de erro, criar serviço de teste
      const testService = {
        id: 'test-service-1',
        name: 'Recurso de Multa (Teste)',
        description: 'Serviço de teste para verificar funcionalidade',
        category: 'Recursos',
        pricing_type: 'percentage' as const,
        percentage_value: 15,
        minimum_value: 83.5,
        fixed_value: null,
        icetran_company_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setServices([testService]);
      toast.error('Erro ao carregar serviços - usando dados de teste');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSplitConfigurations = async () => {
    try {
      // Simular dados por enquanto
      const mockSplits: SplitConfiguration[] = [
        {
          id: '1',
          service_id: '1',
          service_type: 'recurso_multa',
          acsm_pricing_type: 'percentage',
          acsm_percentage_value: 15,
          acsm_minimum_value: 50,
          icetran_pricing_type: 'fixed',
          icetran_fixed_value: 30,
          minimum_charge_value: 83.50,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setSplitConfigurations(mockSplits);
    } catch (error) {
      toast.error('Erro ao carregar configurações de split');
    }
  };

  const loadServicesWithDespachantesPricing = async () => {
    // Implementação mock
    setServicesWithDespachantesPricing([]);
  };

  // Funções para gerenciar serviços
  const handleEditService = async (service: Service) => {
    try {
      // Buscar dados completos do serviço incluindo configurações de split
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', service.id)
        .single();
      
      if (serviceError) {
        console.error('Erro ao buscar dados do serviço:', serviceError);
        toast.error('Erro ao carregar dados do serviço');
        return;
      }
      
      // Configurar formulário com dados existentes
      setServiceForm({
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category,
        pricing_type: serviceData.pricing_type,
        percentage_value: serviceData.percentage_value?.toString() || '',
        minimum_value: serviceData.minimum_value?.toString() || '',
        fixed_value: serviceData.fixed_value?.toString() || '',
        icetran_company_id: serviceData.icetran_company_id || '',
        acsm_value: serviceData.acsm_value || 6.00,
        icetran_value: serviceData.icetran_value || 6.00,
        taxa_cobranca: serviceData.taxa_cobranca || 3.50,
        base_price: serviceData.base_price || 15.50,
        suggested_price: serviceData.suggested_price || 60.00
      });
      
      setEditingService(service);
      setShowServiceForm(true);
    } catch (error) {
      console.error('Erro ao carregar dados do serviço:', error);
      toast.error('Erro ao carregar dados do serviço');
    }
  };

  const handleDeleteService = (id: string) => {
    setServiceToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete);
        
      if (error) {
        throw new Error(error.message);
      }
      
      // Atualizar lista local
      setServices(services.filter(s => s.id !== serviceToDelete));
      toast.success('Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error(`Erro ao excluir serviço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setServiceToDelete(null);
    }
  };

  const cancelDeleteService = () => {
    setShowDeleteModal(false);
    setServiceToDelete(null);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validar empresa ICETRAN
    if (!serviceForm.icetran_company_id) {
      toast.error('Selecione uma empresa ICETRAN');
      setIsLoading(false);
      return;
    }

    try {
      // Validar se a empresa selecionada é realmente ICETRAN
      const isValidIcetran = await companiesService.validateIcetranCompany(serviceForm.icetran_company_id);
      
      if (!isValidIcetran) {
        toast.error('A empresa selecionada não é uma empresa ICETRAN válida ou está inativa');
        setIsLoading(false);
        return;
      }

      // Calcular base_price automaticamente
      const calculatedBasePrice = serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca;
      
      // Validar se suggested_price é maior que base_price
      if (serviceForm.suggested_price < calculatedBasePrice) {
        toast.error(`Valor sugerido deve ser no mínimo R$ ${calculatedBasePrice.toFixed(2)}`);
        setIsLoading(false);
        return;
      }
      
      // Preparar dados para salvar
      const serviceData = {
        name: serviceForm.name,
        description: serviceForm.description,
        category: serviceForm.category,
        pricing_type: serviceForm.pricing_type,
        percentage_value: serviceForm.pricing_type === 'percentage' ? parseFloat(serviceForm.percentage_value) || null : null,
        minimum_value: serviceForm.pricing_type === 'percentage' ? parseFloat(serviceForm.minimum_value) || null : null,
        fixed_value: serviceForm.pricing_type === 'fixed' ? parseFloat(serviceForm.fixed_value) || null : null,
        icetran_company_id: serviceForm.icetran_company_id,
        acsm_value: serviceForm.acsm_value,
        icetran_value: serviceForm.icetran_value,
        taxa_cobranca: serviceForm.taxa_cobranca,
        base_price: calculatedBasePrice,
        suggested_price: serviceForm.suggested_price,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      let result;
      let serviceId;
      
      if (editingService) {
        // Atualizar serviço existente
        result = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
          .select()
          .single();
          
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        serviceId = editingService.id;
        
        // Atualizar lista local
        setServices(services.map(s => s.id === editingService.id ? result.data : s));
        toast.success('Serviço atualizado com sucesso!');
      } else {
        // Criar novo serviço
        result = await supabase
          .from('services')
          .insert([serviceData])
          .select()
          .single();
          
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        serviceId = result.data.id;
        
        // Adicionar à lista local
        setServices([...services, result.data]);
        toast.success('Serviço criado com sucesso!');
      }
      

      
      resetServiceForm();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error(`Erro ao salvar serviço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      description: '',
      category: '',
      pricing_type: 'percentage',
      percentage_value: '',
      minimum_value: '',
      fixed_value: '',
      icetran_company_id: '',
      acsm_value: 6.00,
      icetran_value: 6.00,
      taxa_cobranca: 3.50,
      base_price: 15.50,
      suggested_price: 60.00
    });
    setEditingService(null);
    setShowServiceForm(false);
  };

  // Funções para gerenciar splits
  const handleEditSplit = (split: SplitConfiguration) => {
    setSplitForm({
      service_id: split.service_id,
      acsm_pricing_type: split.acsm_pricing_type,
      acsm_percentage_value: split.acsm_percentage_value?.toString() || '',
      acsm_minimum_value: split.acsm_minimum_value?.toString() || '',
      acsm_fixed_value: split.acsm_fixed_value?.toString() || '',
      icetran_pricing_type: split.icetran_pricing_type,
      icetran_percentage_value: split.icetran_percentage_value?.toString() || '',
      icetran_minimum_value: split.icetran_minimum_value?.toString() || '',
      icetran_fixed_value: split.icetran_fixed_value?.toString() || ''
    });
    setEditingSplit(split);
    setShowSplitForm(true);
  };

  const handleDeleteSplit = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta configuração de split?')) {
      setSplitConfigurations(splitConfigurations.filter(s => s.id !== id));
      toast.success('Configuração de split excluída com sucesso!');
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementação mock
    toast.success('Configuração de split salva com sucesso!');
    resetSplitForm();
  };

  const resetSplitForm = () => {
    setSplitForm({
      service_id: '',
      acsm_pricing_type: 'percentage',
      acsm_percentage_value: '30',
      acsm_minimum_value: '50',
      acsm_fixed_value: '100',
      icetran_pricing_type: 'percentage',
      icetran_percentage_value: '20',
      icetran_minimum_value: '30',
      icetran_fixed_value: '80'
    });
    setEditingSplit(null);
    setShowSplitForm(false);
  };

  // Funções para gerenciar pacotes de créditos
  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newPackage: CreditPackage = {
        id: editingPackage?.id || Date.now().toString(),
        name: packageForm.name,
        description: packageForm.description,
        credit_amount: parseFloat(packageForm.credit_amount),
        price: parseFloat(packageForm.price),
        discount_percentage: parseFloat(packageForm.discount_percentage),
        target_type: packageForm.target_type,
        is_active: true,
        created_at: editingPackage?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingPackage) {
        setCreditPackages(creditPackages.map(p => p.id === editingPackage.id ? newPackage : p));
        toast.success('Pacote de créditos atualizado com sucesso!');
      } else {
        setCreditPackages([...creditPackages, newPackage]);
        toast.success('Pacote de créditos criado com sucesso!');
      }

      resetPackageForm();
    } catch (error) {
      toast.error('Erro ao salvar pacote de créditos');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPackageForm = () => {
    setPackageForm({
      name: '',
      description: '',
      credit_amount: '',
      price: '',
      discount_percentage: '0',
      target_type: 'client'
    });
    setEditingPackage(null);
    setShowPackageForm(false);
  };

  const handleEditPackage = (pkg: CreditPackage) => {
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      credit_amount: pkg.credit_amount.toString(),
      price: pkg.price.toString(),
      discount_percentage: pkg.discount_percentage.toString(),
      target_type: pkg.target_type
    });
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleDeletePackage = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pacote de créditos?')) {
      setCreditPackages(creditPackages.filter(p => p.id !== id));
      toast.success('Pacote de créditos excluído com sucesso!');
    }
  };

  const togglePackageStatus = async (id: string) => {
    setCreditPackages(creditPackages.map(p => 
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ));
    toast.success('Status do pacote atualizado!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-blue-600" />
            Serviços e Splits
          </h1>
          <p className="text-gray-600 mt-2">
            Configure os serviços oferecidos e as divisões de receita entre ACSM, ICETRAN e despachantes
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          <TabButton
            active={activeTab === 'servicos'}
            onClick={() => setActiveTab('servicos')}
          >
            <Building className="w-4 h-4 mr-2" />
            Serviços
          </TabButton>

          {user?.role === 'Superadmin' && (
            <TabButton
              active={activeTab === 'precos-despachantes'}
              onClick={() => setActiveTab('precos-despachantes')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Preços dos Despachantes
            </TabButton>
          )}
          {user?.role === 'Superadmin' && (
            <TabButton
              active={activeTab === 'pacotes-creditos'}
              onClick={() => setActiveTab('pacotes-creditos')}
            >
              <Coins className="w-4 h-4 mr-2" />
              Pacotes de Créditos
            </TabButton>
          )}
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'servicos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Gerenciar Serviços</h2>
              <button
                onClick={() => setShowServiceForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {services.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum serviço encontrado.</p>
                  <p className="text-sm mt-2">Clique em "Novo Serviço" para adicionar o primeiro serviço.</p>
                </div>
              ) : (
                services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onEdit={handleEditService}
                    onDelete={handleDeleteService}
                  />
                ))
              )}
            </div>
          </div>
        )}



        {activeTab === 'pacotes-creditos' && user?.role === 'Superadmin' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pacotes de Créditos</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Gerencie os pacotes de créditos disponíveis para clientes e empresas
                </p>
              </div>
              <button
                onClick={() => setShowPackageForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Pacote
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creditPackages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                        <span className={cn(
                          "inline-block px-2 py-1 text-xs font-medium rounded-full",
                          pkg.target_type === 'client' 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-purple-100 text-purple-800"
                        )}>
                          {pkg.target_type === 'client' ? 'Cliente' : 'Empresa'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Créditos:</span>
                          <span className="font-medium text-gray-900">{pkg.credit_amount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Preço:</span>
                          <span className="font-bold text-green-600">R$ {pkg.price.toFixed(2)}</span>
                        </div>
                        {pkg.discount_percentage > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Desconto:</span>
                            <span className="font-medium text-orange-600">{pkg.discount_percentage}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Valor por crédito:</span>
                          <span className="text-sm text-gray-900">R$ {(pkg.price / pkg.credit_amount).toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => togglePackageStatus(pkg.id)}
                        className={cn(
                          "p-2 transition-colors",
                          pkg.is_active 
                            ? "text-green-600 hover:text-green-700" 
                            : "text-gray-400 hover:text-green-600"
                        )}
                        title={pkg.is_active ? 'Desativar' : 'Ativar'}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
                        pkg.is_active 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {pkg.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Criado em {new Date(pkg.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Edição de Serviços */}
        {showServiceForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
                <button
                  onClick={resetServiceForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleServiceSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>

                {/* Empresa ICETRAN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-1" />
                    Empresa ICETRAN
                  </label>
                  <select
                    value={serviceForm.icetran_company_id}
                    onChange={(e) => setServiceForm({...serviceForm, icetran_company_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione a empresa ICETRAN</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.nome} {company.cnpj ? `(${company.cnpj})` : ''}
                        {company.company_type === 'icetran' ? ' - ICETRAN' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mr-2">
                      Apenas empresas ICETRAN
                    </span>
                    Empresa que receberá a parte do ICETRAN no split de pagamento
                  </p>
                </div>

                {/* Configuração de Splits Dinâmicos */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                    Configuração de Splits Dinâmicos
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure os valores fixos que serão descontados de cada cobrança. 
                    O sistema criará automaticamente o JSON de split na hora da cobrança.
                  </p>

                  {/* Configuração de Splits e Preços Unificada */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      💰 Configuração de Splits e Preços
                    </h4>
                    
                    {/* Campos de Split */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ACSM (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={serviceForm.acsm_value}
                          onChange={(e) => setServiceForm(prev => ({ 
                            ...prev, 
                            acsm_value: parseFloat(e.target.value) || 0 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ICETRAN (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={serviceForm.icetran_value}
                          onChange={(e) => setServiceForm(prev => ({ 
                            ...prev, 
                            icetran_value: parseFloat(e.target.value) || 0 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taxa de Cobrança (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={serviceForm.taxa_cobranca}
                          onChange={(e) => setServiceForm(prev => ({ 
                            ...prev, 
                            taxa_cobranca: parseFloat(e.target.value) || 0 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Separador visual */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custo Mínimo (Calculado)
                          </label>
                          <input
                            type="number"
                            value={(serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca).toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-medium text-red-600"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            ACSM + ICETRAN + Taxa = Valor mínimo obrigatório
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Sugerido (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca}
                            value={serviceForm.suggested_price}
                            onChange={(e) => setServiceForm(prev => ({ 
                              ...prev, 
                              suggested_price: parseFloat(e.target.value) || 0 
                            }))}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              serviceForm.suggested_price < (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-green-500 focus:border-green-500'
                            }`}
                          />
                          <p className={`text-xs mt-1 ${
                            serviceForm.suggested_price < (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)
                              ? 'text-red-500' 
                              : 'text-green-600'
                          }`}>
                            {serviceForm.suggested_price < (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)
                              ? `⚠️ Deve ser no mínimo R$ ${(serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca).toFixed(2)}` 
                              : `✅ Margem: R$ ${(serviceForm.suggested_price - (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)).toFixed(2)}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview da Configuração */}
                  <div className="mt-6 bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-blue-800">📊 Preview da Configuração</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>ACSM:</span>
                          <span className="font-medium">R$ {serviceForm.acsm_value.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ICETRAN:</span>
                          <span className="font-medium">R$ {serviceForm.icetran_value.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa:</span>
                          <span className="font-medium">R$ {serviceForm.taxa_cobranca.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium text-red-600">Custo Mínimo:</span>
                          <span className="font-bold text-red-600">R$ {(serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-green-600">Valor Sugerido:</span>
                          <span className="font-bold text-green-600">R$ {serviceForm.suggested_price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margem Sugerida:</span>
                          <span className="font-medium">
                            R$ {Math.max(0, serviceForm.suggested_price - (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>% Margem:</span>
                          <span className="font-medium">
                            {(serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca) > 0 
                              ? ((Math.max(0, serviceForm.suggested_price - (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)) / (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)) * 100).toFixed(1)
                              : '0'
                            }%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={resetServiceForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={serviceForm.suggested_price < (serviceForm.acsm_value + serviceForm.icetran_value + serviceForm.taxa_cobranca)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💾 {editingService ? 'Atualizar' : 'Criar'} Serviço
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar Exclusão
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDeleteService}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteService}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}