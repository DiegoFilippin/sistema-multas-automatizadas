import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Multa = Database['public']['Tables']['multas']['Row'];
type MultaInsert = Database['public']['Tables']['multas']['Insert'];
type MultaUpdate = Database['public']['Tables']['multas']['Update'];

export interface HistoricoCondutorResult {
  temHistorico: boolean;
  quantidadeMultas: number;
  multasEncontradas: Multa[];
  dataVerificacao: Date;
}

export interface AdvertenciaResult {
  sugerirAdvertencia: boolean;
  motivo: string;
  modeloAdvertencia?: string;
}

export interface MultaLeveAnalysis {
  isMultaLeve: boolean;
  historicoCondutor: HistoricoCondutorResult;
  advertencia: AdvertenciaResult;
}

class MultaLeveService {
  /**
   * Verifica se o condutor possui multas nos últimos 12 meses
   */
  async verificarHistoricoCondutor(
    cpfCondutor: string,
    dataReferencia: Date = new Date()
  ): Promise<HistoricoCondutorResult> {
    try {
      console.log('🔍 Verificando histórico do condutor:', cpfCondutor);
      
      // Calcular data de 12 meses atrás
      const dataLimite = new Date(dataReferencia);
      dataLimite.setFullYear(dataLimite.getFullYear() - 1);
      
      console.log('📅 Período de verificação:', {
        dataLimite: dataLimite.toISOString(),
        dataReferencia: dataReferencia.toISOString()
      });
      
      // Buscar multas do condutor nos últimos 12 meses
      const { data: multas, error } = await supabase
        .from('multas')
        .select('*')
        .or(`cpf_cnpj_proprietario.eq.${cpfCondutor},condutor.ilike.%${cpfCondutor}%`)
        .gte('data_infracao', dataLimite.toISOString().split('T')[0])
        .lte('data_infracao', dataReferencia.toISOString().split('T')[0])
        .order('data_infracao', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar histórico do condutor:', error);
        throw new Error(`Erro ao verificar histórico: ${error.message}`);
      }
      
      const quantidadeMultas = multas?.length || 0;
      const temHistorico = quantidadeMultas > 0;
      
      console.log('📊 Resultado da verificação:', {
        temHistorico,
        quantidadeMultas,
        multasEncontradas: multas?.map(m => ({
          id: m.id,
          numero_auto: m.numero_auto,
          data_infracao: m.data_infracao
        }))
      });
      
      return {
        temHistorico,
        quantidadeMultas,
        multasEncontradas: multas || [],
        dataVerificacao: new Date()
      };
      
    } catch (error: any) {
      console.error('❌ Erro na verificação de histórico:', error);
      throw error;
    }
  }
  
  /**
   * Determina o tipo de gravidade da multa baseado no código da infração
   */
  determinarTipoGravidade(codigoInfracao: string): 'leve' | 'media' | 'grave' | 'gravissima' {
    // Mapeamento básico baseado nos códigos mais comuns
    // Esta lógica pode ser expandida conforme necessário
    const codigo = codigoInfracao.trim();
    
    // Infrações leves (exemplos)
    const infracoesLeves = [
      '50110', '50120', '50130', // Estacionamento
      '60110', '60120', '60130', // Velocidade até 20% acima
      '70110', '70120', '70130'  // Outras infrações leves
    ];
    
    // Infrações médias (exemplos)
    const infracoesMedias = [
      '60210', '60220', '60230', // Velocidade 20% a 50% acima
      '70210', '70220', '70230'  // Outras infrações médias
    ];
    
    // Infrações graves (exemplos)
    const infracoesGraves = [
      '60310', '60320', '60330', // Velocidade acima de 50%
      '70310', '70320', '70330'  // Outras infrações graves
    ];
    
    // Infrações gravíssimas (exemplos)
    const infracoesGravissimas = [
      '60410', '60420', '60430', // Velocidade muito acima do limite
      '70410', '70420', '70430'  // Outras infrações gravíssimas
    ];
    
    if (infracoesLeves.includes(codigo)) {
      return 'leve';
    } else if (infracoesMedias.includes(codigo)) {
      return 'media';
    } else if (infracoesGraves.includes(codigo)) {
      return 'grave';
    } else if (infracoesGravissimas.includes(codigo)) {
      return 'gravissima';
    }
    
    // Fallback: tentar determinar pela descrição ou assumir média
    console.log('⚠️ Código de infração não mapeado:', codigo, '- assumindo como média');
    return 'media';
  }
  
  /**
   * Analisa se deve sugerir advertência por escrito para multa leve
   */
  async analisarAdvertenciaEscrita(
    tipoGravidade: string,
    historicoCondutor: HistoricoCondutorResult
  ): Promise<AdvertenciaResult> {
    try {
      console.log('📝 Analisando necessidade de advertência:', {
        tipoGravidade,
        temHistorico: historicoCondutor.temHistorico
      });
      
      // Só sugerir advertência para multas leves
      if (tipoGravidade !== 'leve') {
        return {
          sugerirAdvertencia: false,
          motivo: `Multa do tipo "${tipoGravidade}" não é elegível para advertência por escrito`
        };
      }
      
      // Se o condutor tem histórico nos últimos 12 meses, não sugerir advertência
      if (historicoCondutor.temHistorico) {
        return {
          sugerirAdvertencia: false,
          motivo: `Condutor possui ${historicoCondutor.quantidadeMultas} multa(s) nos últimos 12 meses`
        };
      }
      
      // Buscar modelo de advertência padrão
      const { data: modelo, error } = await supabase
        .from('modelos_advertencia')
        .select('conteudo')
        .eq('tipo_infracao', 'leve')
        .eq('ativo', true)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar modelo de advertência:', error);
      }
      
      return {
        sugerirAdvertencia: true,
        motivo: 'Multa leve e condutor sem histórico nos últimos 12 meses',
        modeloAdvertencia: modelo?.conteudo || undefined
      };
      
    } catch (error: any) {
      console.error('❌ Erro na análise de advertência:', error);
      throw error;
    }
  }
  
  /**
   * Análise completa de multa leve
   */
  async analisarMultaLeve(
    codigoInfracao: string,
    cpfCondutor: string,
    dataReferencia?: Date
  ): Promise<MultaLeveAnalysis> {
    try {
      console.log('🔍 === INICIANDO ANÁLISE DE MULTA LEVE ===');
      console.log('📋 Parâmetros:', {
        codigoInfracao,
        cpfCondutor,
        dataReferencia: dataReferencia?.toISOString()
      });
      
      // 1. Determinar tipo de gravidade
      const tipoGravidade = this.determinarTipoGravidade(codigoInfracao);
      const isMultaLeve = tipoGravidade === 'leve';
      
      console.log('📊 Tipo de gravidade determinado:', tipoGravidade);
      
      // 2. Verificar histórico do condutor
      const historicoCondutor = await this.verificarHistoricoCondutor(
        cpfCondutor,
        dataReferencia
      );
      
      // 3. Analisar necessidade de advertência
      const advertencia = await this.analisarAdvertenciaEscrita(
        tipoGravidade,
        historicoCondutor
      );
      
      const resultado: MultaLeveAnalysis = {
        isMultaLeve,
        historicoCondutor,
        advertencia
      };
      
      console.log('✅ === ANÁLISE CONCLUÍDA ===');
      console.log('📊 Resultado:', resultado);
      
      return resultado;
      
    } catch (error: any) {
      console.error('❌ Erro na análise de multa leve:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza os campos relacionados à multa leve no banco de dados
   */
  async atualizarCamposMultaLeve(
    multaId: string,
    analise: MultaLeveAnalysis,
    tipoGravidade: string
  ): Promise<void> {
    try {
      console.log('💾 Atualizando campos de multa leve no banco:', multaId);
      
      const updateData: MultaUpdate = {
        updated_at: new Date().toISOString()
      };
      
      // Adicionar campos específicos de multa leve usando any para contornar limitações de tipo
      const extendedUpdateData = {
        ...updateData,
        condutor_tem_historico_12m: analise.historicoCondutor.temHistorico,
        sugerida_advertencia_escrita: analise.advertencia.sugerirAdvertencia,
        data_verificacao_historico: analise.historicoCondutor.dataVerificacao.toISOString(),
        observacoes_advertencia: analise.advertencia.motivo
      };
      
      const { error } = await supabase
        .from('multas')
        .update(extendedUpdateData as any)
        .eq('id', multaId);
      
      if (error) {
        console.error('❌ Erro ao atualizar campos de multa leve:', error);
        throw new Error(`Erro ao atualizar multa: ${error.message}`);
      }
      
      console.log('✅ Campos de multa leve atualizados com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro na atualização dos campos:', error);
      throw error;
    }
  }
  
  /**
   * Gera texto de advertência personalizado
   */
  gerarAdvertenciaPersonalizada(
    modeloBase: string,
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
    }
  ): string {
    try {
      console.log('📝 Gerando advertência personalizada');
      
      let advertenciaPersonalizada = modeloBase;
      
      // Substituir placeholders pelos dados reais
      const substituicoes = {
        '{NOME_CONDUTOR}': dadosMulta.nomeCondutor || 'Condutor',
        '{CPF_CONDUTOR}': dadosMulta.cpfCondutor || 'Não informado',
        '{DATA_INFRACAO}': dadosMulta.dataInfracao || 'Data não informada',
        '{LOCAL_INFRACAO}': dadosMulta.localInfracao || 'Local não informado',
        '{PLACA_VEICULO}': dadosMulta.placaVeiculo || 'Placa não informada',
        '{DESCRICAO_INFRACAO}': dadosMulta.descricaoInfracao || 'Infração não especificada',
        '{CODIGO_INFRACAO}': dadosMulta.codigoInfracao || 'Código não informado',
        '{NUMERO_AUTO}': dadosMulta.numeroAuto || 'Número não informado',
        '{ORGAO_AUTUADOR}': dadosMulta.orgaoAutuador || 'Órgão Autuador',
        '{CIDADE}': 'Cidade', // Pode ser extraído dos dados se disponível
        '{DATA_ADVERTENCIA}': new Date().toLocaleDateString('pt-BR')
      };
      
      // Aplicar todas as substituições
      Object.entries(substituicoes).forEach(([placeholder, valor]) => {
        advertenciaPersonalizada = advertenciaPersonalizada.replace(
          new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
          valor
        );
      });
      
      console.log('✅ Advertência personalizada gerada');
      return advertenciaPersonalizada;
      
    } catch (error: any) {
      console.error('❌ Erro ao gerar advertência personalizada:', error);
      return modeloBase; // Retorna o modelo base em caso de erro
    }
  }
}

export const multaLeveService = new MultaLeveService();
export default multaLeveService;