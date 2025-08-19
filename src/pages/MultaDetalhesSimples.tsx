import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Car, Calendar, DollarSign, MapPin, Clock, Loader2, AlertTriangle, User, FileText, Bot, Download, RefreshCw, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { multasService } from '@/services/multasService'
import { pdfService } from '@/services/pdfService'
import type { Database } from '@/lib/supabase'
import FeedbackRecurso from '@/components/FeedbackRecurso'
import { toast } from 'sonner'

type Recurso = {
  id: string
  numero_processo: string
  tipo_recurso: string
  data_protocolo: string
  status: string
  fundamentacao: string
  observacoes?: string
  created_at: string
}

type Multa = Database['public']['Tables']['multas']['Row'] & {
  client?: {
    id: string
    nome: string
    cpf_cnpj: string
    email?: string
    telefone?: string
    endereco?: string
  }
  recursos?: Recurso[]
}

export default function MultaDetalhesSimples() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [multa, setMulta] = useState<Multa | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('ID da multa não informado')
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        const data = await multasService.getMultaById(id)
        if (!data) {
          setError('Multa não encontrada')
        } else {
          setMulta(data)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar multa')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const formatDate = (s?: string | null) => {
    if (!s) return '-'
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatMoney = (n?: number | null) => {
    if (n == null) return '-'
    return `R$ ${n.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes da Multa</h1>
            <p className="text-sm text-gray-500">ID: {id}</p>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando multa...</span>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erro</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && multa && (
        <div className="space-y-6">
          {/* Status + Valor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Status</p>
              <p className="mt-1 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {multa.status}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Valor</p>
              <div className="mt-1 flex items-center gap-2 text-gray-900">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{formatMoney(multa.valor_original)}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Valor Final</p>
              <div className="mt-1 flex items-center gap-2 text-gray-900">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{formatMoney(multa.valor_final)}</span>
              </div>
            </div>
          </div>

          {/* Informações principais */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Placa</p>
                <p className="font-medium text-gray-900">{multa.placa_veiculo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número do Auto</p>
                <p className="font-medium text-gray-900">{multa.numero_auto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Código de Infração</p>
                <p className="font-medium text-gray-900">{multa.codigo_infracao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Local</p>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{multa.local_infracao || '-'}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{multa.descricao_infracao || '-'}</p>
              </div>
            </div>
          </div>

          {/* Informações do Requerente */}
          {multa.client && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Informações do Requerente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-medium text-gray-900">{multa.client.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CPF/CNPJ</p>
                  <p className="font-medium text-gray-900">{multa.client.cpf_cnpj}</p>
                </div>
                {multa.client.email && (
                  <div>
                    <p className="text-sm text-gray-600">E-mail</p>
                    <p className="font-medium text-gray-900">{multa.client.email}</p>
                  </div>
                )}
                {multa.client.telefone && (
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium text-gray-900">{multa.client.telefone}</p>
                  </div>
                )}
                {multa.client.endereco && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Endereço</p>
                    <p className="font-medium text-gray-900">{multa.client.endereco}</p>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Datas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Data da Infração</p>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{formatDate(multa.data_infracao)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data de Vencimento</p>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{formatDate(multa.data_vencimento)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Órgão Autuador</p>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>-</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recursos Gerados pela IA */}
          {multa.recursos && multa.recursos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Recursos Gerados pela IA</h3>
              </div>
              <div className="space-y-4">
                {multa.recursos.map((recurso) => (
                  <div key={recurso.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{recurso.numero_processo}</p>
                          <p className="text-sm text-gray-600">{recurso.tipo_recurso}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        recurso.status === 'deferido' ? 'bg-green-100 text-green-800' :
                        recurso.status === 'indeferido' ? 'bg-red-100 text-red-800' :
                        recurso.status === 'em_analise' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {recurso.status === 'deferido' ? 'Deferido' :
                         recurso.status === 'indeferido' ? 'Indeferido' :
                         recurso.status === 'em_analise' ? 'Em Análise' :
                         'Protocolado'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Data do Protocolo</p>
                        <p className="font-medium text-gray-900">{formatDate(recurso.data_protocolo)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Criado em</p>
                        <p className="font-medium text-gray-900">{formatDate(recurso.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Fundamentação Legal</p>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{recurso.fundamentacao}</p>
                      </div>
                    </div>
                    
                    {recurso.observacoes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Observações</p>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{recurso.observacoes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Botão de Feedback */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {showFeedback === recurso.id ? (
                        <FeedbackRecurso
                          recursoId={recurso.id}
                          onFeedbackSubmitted={() => {
                            setShowFeedback(null);
                            toast.success('Obrigado pelo seu feedback!');
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setShowFeedback(recurso.id)}
                          className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Avaliar Recurso Gerado pela IA</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações do Recurso */}
          {multa.recursos && multa.recursos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    if (multa.recursos && multa.recursos.length > 0 && multa.client) {
                      const recurso = multa.recursos[0] // Usar o primeiro recurso
                      pdfService.generateRecursoPDF({
                        recurso: {
                          fundamentacao: recurso.fundamentacao,
                          observacoes: recurso.observacoes
                        },
                        multa: {
                          numero_auto: multa.numero_auto,
                          data_infracao: multa.data_infracao,
                          horario_infracao: undefined,
                          local_infracao: multa.local_infracao || '',
                          codigo_infracao: multa.codigo_infracao,
                          descricao_infracao: multa.descricao_infracao || '',
                          valor_multa: multa.valor_final,
                          placa_veiculo: multa.placa_veiculo,
                          orgao_autuador: undefined
                        },
                        cliente: {
                          nome: multa.client.nome,
                          cpf_cnpj: multa.client.cpf_cnpj,
                          endereco: multa.client.endereco,
                          email: multa.client.email,
                          telefone: multa.client.telefone
                        }
                      })
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Gerar PDF do Recurso</span>
                </button>
                
                <button
                  onClick={() => {
                    // TODO: Implementar reprocessamento do recurso
                    console.log('Reprocessar recurso');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reprocessar Recurso</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
