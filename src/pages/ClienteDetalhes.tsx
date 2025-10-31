import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Car, Edit, Trash2, Plus, MoreVertical, DollarSign, FileText, AlertTriangle, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { multasService } from '@/services/multasService';
import { clientsService } from '@/services/clientsService';
import { CobrancasCliente } from '@/components/CobrancasCliente';
import { CobrancaDetalhes } from '@/components/CobrancaDetalhes';
import type { Database } from '@/lib/supabase';
import { n8nWebhookService } from '@/services/n8nWebhookService';
import { ClienteModal } from '@/pages/Clientes';
import { enderecoDetalhadoParaString, parseEnderecoDetalhado } from '@/lib/enderecoDetalhado';

type Multa = Database['public']['Tables']['multas']['Row'] & {
  // Campos adicionais para service_orders
  is_service_order?: boolean;
  service_order_id?: string;
  service_order_value?: number;
  process_status?: 'pending_payment' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'expired';
  multa_type?: string;
  // Campos PIX para compatibilidade
  qr_code_image?: string;
  pix_payload?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  invoice_url?: string;
  bank_slip_url?: string;
  amount?: number;
}

interface Endereco {
  id: string;
  tipo: 'residencial' | 'comercial' | 'correspondencia';
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  principal: boolean;
}

interface Email {
  id: string;
  tipo: 'pessoal' | 'comercial' | 'alternativo';
  email: string;
  principal: boolean;
}

interface Contato {
  id: string;
  tipo: 'celular' | 'residencial' | 'comercial' | 'whatsapp';
  numero: string;
  principal: boolean;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  renavam: string;
  dataCadastro: string;
}

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  emails: Email[];
  telefones: Contato[];
  enderecos: Endereco[];
  dataNascimento: string;
  cnh: string;
  veiculos: Veiculo[];
  multas: number;
  recursosAtivos: number;
  valorEconomizado: number;
  dataCadastro: string;
  status: 'ativo' | 'inativo';
  asaas_customer_id?: string;
}

// Tipos auxiliares para integração com ClienteModal (que usa 'endereco' em Email)
interface ModalEmail {
  id: string;
  tipo: 'pessoal' | 'comercial' | 'alternativo';
  endereco: string;
  principal: boolean;
}

interface ModalCliente {
  id: string;
  nome: string;
  cpf: string;
  emails: ModalEmail[];
  telefones: Contato[];
  enderecos: Endereco[];
  dataNascimento: string;
  cnh: string;
  veiculos: Veiculo[];
  multas: number;
  recursosAtivos: number;
  valorEconomizado: number;
  dataCadastro: string;
  status: 'ativo' | 'inativo';
}



export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMultas, setLoadingMultas] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [selectedCobranca, setSelectedCobranca] = useState<CobrancaData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Função para carregar multas do cliente (incluindo service_orders com processos iniciados)
  const fetchMultasCliente = async (clienteId: string) => {
    try {
      setLoadingMultas(true);
      
      // 1. Buscar multas tradicionais
      const multasTracionais = await multasService.getMultas({ clientId: clienteId });
      
      // 2. Buscar service_orders com processos iniciados
      const { supabase } = await import('../lib/supabase');
      const { data: serviceOrders, error: serviceOrdersError } = await supabase
        .from('service_orders')
        .select(`
          *,
          multa:multas(numero_auto, placa_veiculo, descricao_infracao, valor_final, local_infracao)
        `)
        .eq('client_id', clienteId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      
      if (serviceOrdersError) {
        console.error('Erro ao buscar service_orders:', serviceOrdersError);
      }
      
      // 3. Converter service_orders para formato de multa
      const multasDeServiceOrders = (serviceOrders || []).map(order => {
        console.log('🔍 === DEBUG SERVICE_ORDER ===');
        console.log('  - Order completo:', order);
        console.log('  - QR Code Image:', order.qr_code_image);
        console.log('  - PIX Payload:', order.pix_payload);
        console.log('  - PIX QR Code:', order.pix_qr_code);
        console.log('  - PIX Copy Paste:', order.pix_copy_paste);
        
        return {
          id: order.id, // Usar ID do service_order
          numero_auto: order.multa?.numero_auto || `SO-${order.id.slice(0, 8)}`,
          placa_veiculo: order.multa?.placa_veiculo || 'N/A',
          descricao_infracao: order.multa?.descricao_infracao || `Recurso ${order.multa_type.toUpperCase()}`,
          valor_final: order.multa?.valor_final || order.amount,
          local_infracao: order.multa?.local_infracao || 'Processo Iniciado',
          status: order.status === 'paid' ? 'em_recurso' : 'pendente_pagamento',
          data_infracao: order.created_at,
          client_id: clienteId,
          company_id: order.company_id,
          // Campos específicos para identificar como service_order
          is_service_order: true,
          service_order_id: order.id,
          multa_type: order.multa_type,
          process_status: order.status,
          // ✅ INCLUIR TODOS OS CAMPOS PIX DO SERVICE_ORDER
          qr_code_image: order.qr_code_image,
          pix_payload: order.pix_payload,
          pix_qr_code: order.pix_qr_code,
          pix_copy_paste: order.pix_copy_paste,
          invoice_url: order.invoice_url,
          bank_slip_url: order.bank_slip_url,
          amount: order.amount,
          service_order_value: order.amount, // Adicionando o valor do service_order para exibição na grid
          created_at: order.created_at,
          updated_at: order.updated_at
        };
      });
      
      // 4. Combinar multas tradicionais com service_orders
      const todasMultas = [...multasTracionais, ...multasDeServiceOrders];
      
      setMultas(todasMultas);
    } catch (error) {
      console.error('Erro ao carregar multas do cliente:', error);
      toast.error('Erro ao carregar multas do cliente');
    } finally {
      setLoadingMultas(false);
    }
  };

  // Função para criar customer no Asaas para o cliente
  const handleCreateCustomer = async () => {
    if (!cliente?.id) {
      toast.error('Cliente não encontrado');
      return;
    }

    setCreatingCustomer(true);
    try {
      const cpf = cliente.cpf || '';
      const nome = cliente.nome || '';
      const email = cliente.emails?.[0]?.email || '';

      const result = await n8nWebhookService.createCustomer({ cpf, nome, email });

      if (result.success && result.customerId) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ asaas_customer_id: result.customerId })
          .eq('id', cliente.id);

        if (updateError) {
          console.error('Erro ao atualizar asaas_customer_id:', updateError);
        }

        toast.success('Customer criado via Webhook com sucesso!');
        setCliente(prev => prev ? { ...prev, asaas_customer_id: result.customerId } : null);
      } else {
        const msg = result.message || 'Webhook falhou. Tentando criar direto no Asaas...';
        toast.warning(msg);

        // Fallback para criação direta no Asaas
        try {
          const { asaasService } = await import('@/services/asaasService');
          await asaasService.reloadConfig();
          if (!asaasService.isConfigured()) {
            throw new Error('Integração Asaas não configurada');
          }

          const primeiroEndereco = cliente.enderecos?.[0];
          const asaasCustomerData = {
            name: cliente.nome || '',
            cpfCnpj: cliente.cpf || '',
            email: cliente.emails?.[0]?.email,
            phone: cliente.telefones?.[0]?.numero,
            address: primeiroEndereco?.logradouro,
            addressNumber: primeiroEndereco?.numero,
            complement: primeiroEndereco?.complemento,
            province: primeiroEndereco?.bairro,
            city: primeiroEndereco?.cidade,
            state: primeiroEndereco?.estado,
            postalCode: primeiroEndereco?.cep?.replace(/\D/g, '')
          };

          const asaasCustomer = await asaasService.createCustomer(asaasCustomerData);

          if (asaasCustomer?.id) {
            const { error: updateError2 } = await supabase
              .from('clients')
              .update({ asaas_customer_id: asaasCustomer.id })
              .eq('id', cliente.id);

            if (updateError2) {
              console.error('Erro ao atualizar asaas_customer_id (fallback):', updateError2);
            }

            toast.success('Customer criado diretamente no Asaas (fallback) com sucesso!');
            setCliente(prev => prev ? { ...prev, asaas_customer_id: asaasCustomer.id } : null);
          } else {
            console.warn('Customer Asaas (fallback) criado sem ID válido:', asaasCustomer);
            toast.error('Não foi possível criar o Customer via Webhook nem via Asaas.');
          }
        } catch (asaasError) {
          console.error('Erro no fallback Asaas:', asaasError);
          toast.error(asaasError instanceof Error ? asaasError.message : 'Erro ao criar customer no Asaas (fallback)');
        }
      }
    } catch (err) {
      console.error('Erro ao criar customer via Webhook:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar customer via Webhook');
    } finally {
      setCreatingCustomer(false);
    }
  };


  // Tipos auxiliares para evitar uso de any
  interface MultaLike {
    service_order_id?: string;
    id?: string;
    client_id?: string;
    valor_final?: number;
    amount?: number;
    process_status?: string;
    status?: string;
    data_infracao?: string;
    created_at?: string;
    updated_at?: string;
    multa_type?: string;
    invoice_url?: string;
    pix_payload?: string;
    pix_copy_paste?: string;
    pix_qr_code?: string;
    qr_code_image?: string;
    company_id?: string;
  }

  interface CobrancaData {
    id: string;
    asaas_payment_id: string;
    client_id?: string;
    client_name: string;
    customer_name: string;
    amount: number;
    status: string;
    payment_method: string;
    due_date: string;
    created_at: string;
    paid_at: string | null;
    description: string;
    invoice_url?: string;
    pix_code?: string;
    pix_qr_code?: string;
    qr_code_image?: string;
    pix_payload?: string;
    pix_copy_paste?: string;
    company_id?: string;
    payment_data?: unknown;
  }

  // Função para mapear dados do service_order para o formato do modal CobrancaDetalhes
  const mapServiceOrderToCobranca = (multa: MultaLike): CobrancaData => {
    console.log('🔄 === MAPEANDO SERVICE_ORDER PARA COBRANCA ===');
    console.log('  - Multa original:', multa);
    console.log('  - QR Code Image:', multa.qr_code_image);
    console.log('  - PIX Payload:', multa.pix_payload);
    console.log('  - PIX QR Code:', multa.pix_qr_code);
    console.log('  - PIX Copy Paste:', multa.pix_copy_paste);
    console.log('  - Invoice URL:', multa.invoice_url);
    
    return {
      id: String(multa.service_order_id || multa.id || ''),
      asaas_payment_id: String(multa.service_order_id || multa.id || ''),
      client_id: multa.client_id,
      client_name: cliente?.nome || 'Cliente não informado',
      customer_name: cliente?.nome || 'Cliente não informado',
      amount: (multa.valor_final ?? multa.amount ?? 0) as number,
      status: (multa.process_status ?? multa.status ?? 'pending') as string,
      payment_method: 'PIX',
      due_date: (multa.data_infracao ?? multa.created_at ?? new Date().toISOString()) as string,
      created_at: (multa.created_at ?? new Date().toISOString()) as string,
      paid_at: multa.process_status === 'paid' ? (multa.updated_at ?? null) as string | null : null,
      description: `Recurso de Multa - ${(multa.multa_type ?? 'GRAVE').toUpperCase()} - ${cliente?.nome || 'Cliente'}`,
      invoice_url: multa.invoice_url,
      pix_code: multa.pix_payload ?? multa.pix_copy_paste,
      pix_qr_code: multa.pix_qr_code ?? multa.qr_code_image,
      qr_code_image: multa.qr_code_image,
      pix_payload: multa.pix_payload,
      pix_copy_paste: multa.pix_payload ?? multa.pix_copy_paste,
      company_id: multa.company_id,
      payment_data: multa as unknown
    };
  };

  // Função para abrir modal de detalhes da cobrança
  const handleOpenCobrancaModal = (multa: MultaLike) => {
    const cobrancaData = mapServiceOrderToCobranca(multa);
    setSelectedCobranca(cobrancaData);
    setShowCobrancaModal(true);
  };

  useEffect(() => {
    // Carregar dados do cliente do Supabase
    const fetchCliente = async () => {
      try {
        setLoading(true);
        
        // Buscar cliente com detalhes completos
        const clienteCompleto = await clientsService.getClientWithDetails(id!);
        
        if (!clienteCompleto) {
          console.log('Cliente não encontrado no banco de dados');
          setCliente(null);
          return;
        }

        // Converter dados do Supabase para o formato local
        const clienteConvertido: Cliente = {
          id: clienteCompleto.id,
          nome: clienteCompleto.nome,
          cpf: clienteCompleto.cpf_cnpj,
          dataNascimento: clienteCompleto.data_nascimento || '',
          cnh: clienteCompleto.cnh || '',
          status: clienteCompleto.status,
          emails: [{
            id: '1',
            tipo: 'pessoal',
            email: clienteCompleto.email || '',
            principal: true
          }],
          telefones: [{
            id: '1',
            tipo: 'celular',
            numero: clienteCompleto.telefone || '',
            principal: true
          }],
          enderecos: (() => {
            const enderecoDetalhado = parseEnderecoDetalhado(clienteCompleto.endereco || '');
            return [{
              id: '1',
              tipo: 'residencial',
              logradouro: enderecoDetalhado.logradouro || clienteCompleto.endereco || '',
              numero: enderecoDetalhado.numero || '',
              complemento: enderecoDetalhado.complemento || '',
              bairro: enderecoDetalhado.bairro || '',
              cidade: enderecoDetalhado.cidade || clienteCompleto.cidade || '',
              estado: enderecoDetalhado.estado || clienteCompleto.estado || '',
              cep: enderecoDetalhado.cep || clienteCompleto.cep || '',
              principal: true
            }];
          })(),
          veiculos: clienteCompleto.vehicles.map(vehicle => ({
            id: vehicle.id,
            placa: vehicle.placa,
            modelo: vehicle.modelo,
            marca: vehicle.marca,
            ano: vehicle.ano,
            cor: vehicle.cor,
            renavam: vehicle.renavam,
            dataCadastro: vehicle.created_at
          })), 
          multas: clienteCompleto.multas_count,
          recursosAtivos: clienteCompleto.recursos_count,
          valorEconomizado: clienteCompleto.valor_economizado,
          dataCadastro: clienteCompleto.created_at,
          asaas_customer_id: clienteCompleto.asaas_customer_id
        };
        setCliente(clienteConvertido);
        // Carregar multas do cliente
        fetchMultasCliente(clienteCompleto.id);
      } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        toast.error('Erro ao carregar dados do cliente');
        setCliente(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCliente();
    }
  }, [id]);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      toast.success('Cliente excluído com sucesso');
      navigate('/clientes');
    }
  };

  const handleSaveEdit = async (clienteData: Partial<ModalCliente>) => {
    try {
      if (!cliente?.id) {
        toast.error('Cliente não encontrado');
        return;
      }

      // Primeiro, tentar atualizar normalmente
      const { error } = await supabase
        .from('clients')
        .update({
          nome: clienteData.nome,
          cpf_cnpj: clienteData.cpf,
          cnh: clienteData.cnh || null,
          data_nascimento: clienteData.dataNascimento || null,
          email: clienteData.emails?.[0]?.endereco || '',
          telefone: clienteData.telefones?.[0]?.numero || '',
          endereco: clienteData.enderecos?.[0] ? enderecoDetalhadoParaString({
            logradouro: clienteData.enderecos[0].logradouro,
            numero: clienteData.enderecos[0].numero,
            complemento: clienteData.enderecos[0].complemento,
            bairro: clienteData.enderecos[0].bairro,
            cidade: clienteData.enderecos[0].cidade,
            estado: clienteData.enderecos[0].estado,
            cep: clienteData.enderecos[0].cep
          }) : '',
          cidade: clienteData.enderecos?.[0]?.cidade || '',
          estado: clienteData.enderecos?.[0]?.estado || '',
          cep: clienteData.enderecos?.[0]?.cep || '',
          status: clienteData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', cliente.id);

      // Se erro relacionado à coluna data_nascimento, tentar criar a coluna
      if (error && error.message.includes('data_nascimento')) {
        console.log('🔧 Coluna data_nascimento não existe, tentando criar...');
        
        try {
          // Tentar criar a coluna via RPC
          await supabase.rpc('exec_sql', { 
            sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;' 
          });
          
          // Tentar novamente o update
          const { error: retryError } = await supabase
            .from('clients')
            .update({
              nome: clienteData.nome,
              cpf_cnpj: clienteData.cpf,
              cnh: clienteData.cnh || null,
              data_nascimento: clienteData.dataNascimento || null,
              email: clienteData.emails?.[0]?.endereco || '',
              telefone: clienteData.telefones?.[0]?.numero || '',
              endereco: clienteData.enderecos?.[0] ? enderecoDetalhadoParaString({
                logradouro: clienteData.enderecos[0].logradouro,
                numero: clienteData.enderecos[0].numero,
                complemento: clienteData.enderecos[0].complemento,
                bairro: clienteData.enderecos[0].bairro,
                cidade: clienteData.enderecos[0].cidade,
                estado: clienteData.enderecos[0].estado,
                cep: clienteData.enderecos[0].cep
              }) : '',
              cidade: clienteData.enderecos?.[0]?.cidade || '',
              estado: clienteData.enderecos?.[0]?.estado || '',
              cep: clienteData.enderecos?.[0]?.cep || '',
              status: clienteData.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', cliente.id);
            
          if (retryError) {
            // Se ainda falhar, salvar sem data_nascimento
            console.log('⚠️ Salvando sem data_nascimento...');
            const { error: fallbackError } = await supabase
              .from('clients')
              .update({
                nome: clienteData.nome,
                cpf_cnpj: clienteData.cpf,
                cnh: clienteData.cnh || null,
                email: clienteData.emails?.[0]?.endereco || '',
                telefone: clienteData.telefones?.[0]?.numero || '',
                endereco: clienteData.enderecos?.[0] ? enderecoDetalhadoParaString({
                  logradouro: clienteData.enderecos[0].logradouro,
                  numero: clienteData.enderecos[0].numero,
                  complemento: clienteData.enderecos[0].complemento,
                  bairro: clienteData.enderecos[0].bairro,
                  cidade: clienteData.enderecos[0].cidade,
                  estado: clienteData.enderecos[0].estado,
                  cep: clienteData.enderecos[0].cep
                }) : '',
                cidade: clienteData.enderecos?.[0]?.cidade || '',
                estado: clienteData.enderecos?.[0]?.estado || '',
                cep: clienteData.enderecos?.[0]?.cep || '',
                status: clienteData.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', cliente.id);
              
            if (fallbackError) {
              throw fallbackError;
            } else {
              toast.warning('Cliente salvo, mas data de nascimento não foi salva (coluna não existe no banco)');
            }
          } else {
            toast.success('Cliente atualizado com sucesso (coluna criada automaticamente)');
          }
        } catch (createError) {
          console.error('Erro ao criar coluna:', createError);
          // Salvar sem data_nascimento como fallback
          const { error: fallbackError } = await supabase
            .from('clients')
            .update({
              nome: clienteData.nome,
              cpf_cnpj: clienteData.cpf,
              cnh: clienteData.cnh || null,
              email: clienteData.emails?.[0]?.endereco || '',
              telefone: clienteData.telefones?.[0]?.numero || '',
              endereco: clienteData.enderecos?.[0] ? enderecoDetalhadoParaString({
                logradouro: clienteData.enderecos[0].logradouro,
                numero: clienteData.enderecos[0].numero,
                complemento: clienteData.enderecos[0].complemento,
                bairro: clienteData.enderecos[0].bairro,
                cidade: clienteData.enderecos[0].cidade,
                estado: clienteData.enderecos[0].estado,
                cep: clienteData.enderecos[0].cep
              }) : '',
              cidade: clienteData.enderecos?.[0]?.cidade || '',
              estado: clienteData.enderecos?.[0]?.estado || '',
              cep: clienteData.enderecos?.[0]?.cep || '',
              status: clienteData.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', cliente.id);
            
          if (fallbackError) {
            throw fallbackError;
          } else {
            toast.warning('Cliente salvo, mas data de nascimento não foi salva. Execute no Supabase: ALTER TABLE clients ADD COLUMN data_nascimento DATE;');
          }
        }
      } else if (error) {
        throw error;
      } else {
        toast.success('Cliente atualizado com sucesso');
      }

      setCliente(prev => prev ? {
        ...prev,
        nome: clienteData.nome ?? prev.nome,
        cpf: clienteData.cpf ?? prev.cpf,
        dataNascimento: clienteData.dataNascimento ?? prev.dataNascimento,
        cnh: clienteData.cnh ?? prev.cnh,
        status: clienteData.status ?? prev.status,
        emails: clienteData.emails ? clienteData.emails.map((e: ModalEmail) => ({
          id: e.id,
          tipo: e.tipo,
          email: e.endereco,
          principal: e.principal
        })) : prev.emails,
        telefones: clienteData.telefones ?? prev.telefones,
        enderecos: clienteData.enderecos ?? prev.enderecos
      } : prev);

      toast.success('Cliente atualizado com sucesso!');
      setShowEditModal(false);
    } catch (e: unknown) {
      console.error(e);
      toast.error('Erro inesperado ao salvar alterações.');
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'residencial': 'Residencial',
      'comercial': 'Comercial',
      'correspondencia': 'Correspondência',
      'pessoal': 'Pessoal',
      'alternativo': 'Alternativo',
      'celular': 'Celular',
      'whatsapp': 'WhatsApp'
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cliente não encontrado</h1>
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
            <p className="text-gray-600">CPF: {cliente.cpf}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Status e Informações Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`font-semibold ${cliente.status === 'ativo' ? 'text-green-600' : 'text-red-600'}`}>
                {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Multas</p>
              <p className="font-semibold text-gray-900">{cliente.multas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recursos Ativos</p>
              <p className="font-semibold text-gray-900">{cliente.recursosAtivos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Economizado</p>
              <p className="font-semibold text-gray-900">
                R$ {cliente.valorEconomizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Informações Pessoais */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
              <p className="text-gray-900">
                {cliente.dataNascimento && cliente.dataNascimento !== '' ? 
                  format(new Date(cliente.dataNascimento), 'dd/MM/yyyy', { locale: ptBR }) : 
                  'Não informado'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CNH</label>
              <p className="text-gray-900">{cliente.cnh && cliente.cnh !== '' ? cliente.cnh : 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Cadastro</label>
              <p className="text-gray-900">
                {format(new Date(cliente.dataCadastro), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Informações de Cobrança */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações de Cobrança
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Status da Integração</label>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  cliente.asaas_customer_id ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <p className={`text-sm font-medium ${
                  cliente.asaas_customer_id ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {cliente.asaas_customer_id ? 'Integrado com Asaas' : 'Não integrado com Asaas'}
                </p>
              </div>
            </div>
            {!cliente.asaas_customer_id && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 mb-3">
                      Customer não encontrado. Para poder comprar créditos e utilizar os serviços de cobrança, é necessário criar um customer no Asaas para este cliente.
                    </p>
                    <button
                      onClick={handleCreateCustomer}
                      disabled={creatingCustomer}
                      className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <UserPlus className={`w-4 h-4 mr-2 ${creatingCustomer ? 'animate-spin' : ''}`} />
                      {creatingCustomer ? 'Criando Customer...' : 'Criar Customer via Webhook'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {cliente.asaas_customer_id && (
              <div>
                <label className="text-sm font-medium text-gray-700">Customer ID</label>
                <p className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">
                  {cliente.asaas_customer_id}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Sistema de Pagamento</label>
              <p className="text-gray-900">
                {cliente.asaas_customer_id ? 'Asaas Gateway' : 'Não configurado'}
              </p>
            </div>
          </div>
        </div>


        {/* Contatos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contatos
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Telefones */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Telefones</h3>
              <div className="space-y-2">
                {cliente.telefones.map((telefone) => (
                  <div key={telefone.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900">{telefone.numero}</p>
                      <p className="text-xs text-gray-500">
                        {getTipoLabel(telefone.tipo)}
                        {telefone.principal && ' (Principal)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emails */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">E-mails</h3>
              <div className="space-y-2">
                {cliente.emails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900">{email.email}</p>
                      <p className="text-xs text-gray-500">
                        {getTipoLabel(email.tipo)}
                        {email.principal && ' (Principal)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Endereços */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereços
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {cliente.enderecos.map((endereco) => (
              <div key={endereco.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    {getTipoLabel(endereco.tipo)}
                    {endereco.principal && ' (Principal)'}
                  </h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{endereco.logradouro}, {endereco.numero}</p>
                  {endereco.complemento && <p>{endereco.complemento}</p>}
                  <p>{endereco.bairro}</p>
                  <p>{endereco.cidade} - {endereco.estado}</p>
                  <p>CEP: {endereco.cep}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Veículos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veículos
              </h2>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {cliente.veiculos.length > 0 ? (
              cliente.veiculos.map((veiculo) => (
                <div key={veiculo.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{veiculo.marca} {veiculo.modelo}</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p><span className="font-medium">Placa:</span> {veiculo.placa}</p>
                      <p><span className="font-medium">Ano:</span> {veiculo.ano}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Cor:</span> {veiculo.cor}</p>
                      <p><span className="font-medium">Renavam:</span> {veiculo.renavam}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum veículo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Multas */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Multas ({multas.length})
              </h2>

            </div>
          </div>
          <div className="p-6">
            {loadingMultas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-2 text-gray-600">Carregando multas...</span>
              </div>
            ) : multas.length > 0 ? (
              <div className="space-y-4">
                {multas.map((multa) => (
                  <div key={multa.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{multa.numero_auto}</h3>
                          <p className="text-sm text-gray-600">
                            {multa.descricao_infracao}
                            {multa.is_service_order && multa.process_status !== 'pending_payment' && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                Processo Iniciado
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          R$ {multa.valor_original?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          multa.status === 'pendente' || (multa.is_service_order && multa.process_status === 'pending_payment') ? 'bg-yellow-100 text-yellow-800' :
                          multa.status === 'pago' || (multa.is_service_order && multa.process_status === 'paid') ? 'bg-green-100 text-green-800' :
                          multa.status === 'em_recurso' || (multa.is_service_order && multa.process_status === 'processing') ? 'bg-blue-100 text-blue-800' :
                          (multa.is_service_order && multa.process_status === 'completed') ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {multa.is_service_order ? (
                            multa.process_status === 'pending_payment' ? 'Aguardando Pagamento' :
                            multa.process_status === 'paid' ? 'Pago' :
                            multa.process_status === 'processing' ? 'Em Processamento' :
                            multa.process_status === 'completed' ? 'Concluído' :
                            multa.process_status
                          ) : multa.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p><span className="font-medium">Placa:</span> {multa.placa_veiculo}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Data:</span> {multa.data_infracao && multa.data_infracao !== '' ? format(new Date(multa.data_infracao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Local:</span> {multa.local_infracao || 'N/A'}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Valor Cobrança:</span> {multa.is_service_order && multa.service_order_value ? `R$ ${Number(multa.service_order_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</p>
                      </div>
                      <div>
                        <button 
                          onClick={() => {
                            if (multa.is_service_order) {
                              // Para service_orders, verificar o status
                              if (multa.process_status === 'paid') {
                                // Se pago, redirecionar para página de recurso
                                navigate(`/teste-recurso-ia?serviceOrderId=${multa.service_order_id}&nome=${encodeURIComponent(cliente.nome)}`);
                              } else {
                                // Se não pago, abrir modal de detalhes da cobrança
                                handleOpenCobrancaModal(multa);
                              }
                            } else {
                              // Redirecionar para página de detalhes da multa tradicional
                              navigate(`/multas/${multa.id}`);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {multa.is_service_order ? 
                            (multa.process_status === 'paid' ? 'Ver Recurso' : 'Ver Detalhes da Cobrança') : 
                            'Ver detalhes'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma multa encontrada para este cliente</p>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Cobranças */}
      <div className="mt-8">
        <CobrancasCliente 
          clientId={cliente.id}
        />
      </div>

      {/* Modal de Edição de Cliente */}
      {showEditModal && cliente && (
        <ClienteModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          cliente={{
            id: cliente.id,
            nome: cliente.nome,
            cpf: cliente.cpf,
            emails: (cliente.emails || []).map((e): ModalEmail => ({ id: e.id, tipo: e.tipo, endereco: e.email, principal: e.principal })),
            telefones: cliente.telefones,
            enderecos: cliente.enderecos,
            dataNascimento: cliente.dataNascimento,
            cnh: cliente.cnh,
            veiculos: (cliente.veiculos || []).map((v) => ({
              id: v.id,
              placa: v.placa,
              modelo: v.modelo,
              marca: v.marca,
              ano: v.ano,
              cor: v.cor,
              renavam: v.renavam,
              dataCadastro: v.dataCadastro || new Date().toISOString().split('T')[0]
            })),
            multas: cliente.multas,
            recursosAtivos: cliente.recursosAtivos,
            valorEconomizado: cliente.valorEconomizado,
            dataCadastro: cliente.dataCadastro,
            status: cliente.status
          }}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal de Detalhes da Cobrança */}
      {showCobrancaModal && selectedCobranca && (
        <CobrancaDetalhes
          cobranca={selectedCobranca}
          isOpen={showCobrancaModal}
          onClose={() => {
            setShowCobrancaModal(false);
            setSelectedCobranca(null);
          }}
          onResend={async () => {
            // Implementar reenvio se necessário
            toast.success('Cobrança reenviada!');
          }}
          onCancel={async () => {
            // Implementar cancelamento se necessário
            toast.success('Cobrança cancelada!');
          }}
          onUpdate={(updatedCobranca) => {
            // Atualizar dados se necessário
            console.log('Cobrança atualizada:', updatedCobranca);
            // Recarregar multas para refletir mudanças
            if (cliente?.id) {
              fetchMultasCliente(cliente.id);
            }
          }}
        />
      )}

    </div>
  );
}
