import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface RecursoGerado {
  id?: string;
  company_id: string;
  user_id: string;
  multa_id?: string;
  chat_session_id?: string;
  recurso_id?: string;
  titulo: string;
  conteudo_recurso: string;
  fundamentacao_legal?: string;
  argumentos_principais?: string[];
  tipo_recurso: string;
  status: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado';
  metadata?: any;
  versao?: number;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface RecursoGeradoInsert {
  company_id: string;
  user_id: string;
  multa_id?: string;
  chat_session_id?: string;
  recurso_id?: string;
  titulo: string;
  conteudo_recurso: string;
  fundamentacao_legal?: string;
  argumentos_principais?: string[];
  tipo_recurso: string;
  status?: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado';
  metadata?: any;
}

class RecursosGeradosService {
  /**
   * Salva um recurso gerado pelo n8n no banco de dados
   */
  async salvarRecurso(recursoData: RecursoGeradoInsert): Promise<RecursoGerado | null> {
    try {
      console.log('📝 === INICIANDO SALVAMENTO DE RECURSO ===');
      console.log('📋 Dados do recurso:', {
        titulo: recursoData.titulo,
        tipo: recursoData.tipo_recurso,
        multa_id: recursoData.multa_id,
        chat_session_id: recursoData.chat_session_id,
        company_id: recursoData.company_id,
        user_id: recursoData.user_id,
        conteudo_length: recursoData.conteudo_recurso.length,
        has_fundamentacao: !!recursoData.fundamentacao_legal,
        argumentos_count: recursoData.argumentos_principais?.length || 0
      });

      // Validações antes do salvamento
      if (!recursoData.titulo || recursoData.titulo.trim().length === 0) {
        throw new Error('Título do recurso é obrigatório');
      }
      
      if (!recursoData.conteudo_recurso || recursoData.conteudo_recurso.trim().length === 0) {
        throw new Error('Conteúdo do recurso é obrigatório');
      }
      
      if (!recursoData.company_id || !recursoData.user_id) {
        throw new Error('Company ID e User ID são obrigatórios');
      }

      const insertData = {
        ...recursoData,
        status: recursoData.status || 'gerado',
        versao: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Inserindo no banco de dados...');
      const { data, error } = await supabase
        .from('recursos_gerados')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro do Supabase ao salvar recurso:', {
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Mensagens de erro mais específicas
        if (error.code === '23505') {
          toast.error('Recurso duplicado - já existe um recurso com estes dados');
        } else if (error.code === '23503') {
          toast.error('Erro de referência - verifique se a multa e sessão existem');
        } else {
          toast.error(`Erro ao salvar recurso: ${error.message}`);
        }
        return null;
      }

      console.log('✅ === RECURSO SALVO COM SUCESSO ===');
      console.log('🆔 ID do recurso:', data.id);
      console.log('📊 Dados salvos:', {
        id: data.id,
        titulo: data.titulo,
        tipo: data.tipo_recurso,
        status: data.status,
        versao: data.versao,
        created_at: data.created_at
      });
      
      toast.success('✅ Recurso salvo com sucesso!');
      return data;
    } catch (error: any) {
      console.error('❌ === ERRO INESPERADO AO SALVAR RECURSO ===');
      console.error('🔍 Detalhes do erro:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        recursoData: {
          titulo: recursoData.titulo,
          tipo: recursoData.tipo_recurso,
          conteudo_length: recursoData.conteudo_recurso?.length
        }
      });
      
      toast.error(`Erro inesperado: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca recursos gerados por multa
   */
  async buscarRecursosPorMulta(multaId: string): Promise<RecursoGerado[]> {
    try {
      const { data, error } = await supabase
        .from('recursos_gerados')
        .select('*')
        .eq('multa_id', multaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar recursos por multa:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar recursos:', error);
      return [];
    }
  }

  /**
   * Busca recursos gerados por sessão de chat
   */
  async buscarRecursosPorChat(chatSessionId: string): Promise<RecursoGerado[]> {
    try {
      const { data, error } = await supabase
        .from('recursos_gerados')
        .select('*')
        .eq('chat_session_id', chatSessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar recursos por chat:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar recursos por chat:', error);
      return [];
    }
  }

  /**
   * Busca todos os recursos gerados da empresa
   */
  async buscarRecursosDaEmpresa(companyId: string, limit: number = 50): Promise<RecursoGerado[]> {
    try {
      const { data, error } = await supabase
        .from('recursos_gerados')
        .select(`
          *,
          multas:multa_id (
            numero_auto,
            placa_veiculo,
            data_infracao
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar recursos da empresa:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar recursos da empresa:', error);
      return [];
    }
  }

  /**
   * Atualiza o status de um recurso
   */
  async atualizarStatus(recursoId: string, novoStatus: RecursoGerado['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recursos_gerados')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', recursoId);

      if (error) {
        console.error('❌ Erro ao atualizar status do recurso:', error);
        toast.error('Erro ao atualizar status do recurso');
        return false;
      }

      toast.success('Status do recurso atualizado!');
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar status:', error);
      toast.error('Erro inesperado ao atualizar status');
      return false;
    }
  }

  /**
   * Atualiza o conteúdo de um recurso (cria nova versão)
   */
  async atualizarConteudo(
    recursoId: string, 
    novoConteudo: string, 
    novaFundamentacao?: string,
    novosArgumentos?: string[]
  ): Promise<boolean> {
    try {
      const updateData: any = {
        conteudo_recurso: novoConteudo,
        updated_at: new Date().toISOString()
      };

      if (novaFundamentacao) {
        updateData.fundamentacao_legal = novaFundamentacao;
      }

      if (novosArgumentos) {
        updateData.argumentos_principais = novosArgumentos;
      }

      const { error } = await supabase
        .from('recursos_gerados')
        .update(updateData)
        .eq('id', recursoId);

      if (error) {
        console.error('❌ Erro ao atualizar conteúdo do recurso:', error);
        toast.error('Erro ao atualizar conteúdo do recurso');
        return false;
      }

      toast.success('Recurso atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar conteúdo:', error);
      toast.error('Erro inesperado ao atualizar conteúdo');
      return false;
    }
  }

  /**
   * Extrai informações de um recurso do texto do n8n
   */
  extrairInformacoesRecurso(textoN8n: string): {
    titulo: string;
    conteudo: string;
    fundamentacao?: string;
    argumentos?: string[];
    tipo: string;
  } {
    // Extrair título (primeira linha ou padrão)
    const linhas = textoN8n.split('\n').filter(linha => linha.trim());
    let titulo = 'Recurso Gerado pela IA';
    
    // Tentar encontrar um título nas primeiras linhas
    for (const linha of linhas.slice(0, 3)) {
      if (linha.includes('RECURSO') || linha.includes('DEFESA') || linha.includes('PEDIDO')) {
        titulo = linha.trim();
        break;
      }
    }

    // Extrair fundamentação legal
    let fundamentacao = '';
    const fundamentacaoMatch = textoN8n.match(/(?:fundamenta[çc]ão|base legal|dispositivo legal)[\s\S]*?(?=\n\n|$)/i);
    if (fundamentacaoMatch) {
      fundamentacao = fundamentacaoMatch[0].trim();
    }

    // Extrair argumentos principais
    const argumentos: string[] = [];
    const argumentosRegex = /(?:^|\n)\s*[-•]\s*(.+?)(?=\n|$)/gm;
    let match;
    while ((match = argumentosRegex.exec(textoN8n)) !== null) {
      if (match[1] && match[1].trim().length > 10) {
        argumentos.push(match[1].trim());
      }
    }

    // Determinar tipo de recurso
    let tipo = 'defesa_previa';
    if (textoN8n.toLowerCase().includes('primeira instância') || textoN8n.toLowerCase().includes('primeira instancia')) {
      tipo = 'recurso_primeira_instancia';
    } else if (textoN8n.toLowerCase().includes('segunda instância') || textoN8n.toLowerCase().includes('segunda instancia')) {
      tipo = 'recurso_segunda_instancia';
    } else if (textoN8n.toLowerCase().includes('advertência') || textoN8n.toLowerCase().includes('advertencia')) {
      tipo = 'conversao_advertencia';
    }

    return {
      titulo,
      conteudo: textoN8n,
      fundamentacao: fundamentacao || undefined,
      argumentos: argumentos.length > 0 ? argumentos : undefined,
      tipo
    };
  }

  /**
   * Gera PDF do recurso usando jsPDF
   */
  async gerarPDF(recurso: RecursoGerado): Promise<Blob | null> {
    try {
      console.log('📄 Gerando PDF do recurso:', recurso.titulo);
      
      // Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      
      // Criar nova instância do PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Configurações de fonte e layout
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let currentY = margin;
      
      // Função auxiliar para adicionar texto com quebra de linha
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        // Verificar se precisa de nova página
        if (currentY + (lines.length * fontSize * 0.35) > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(lines, margin, currentY);
        currentY += lines.length * fontSize * 0.35 + 5;
      };
      
      // Cabeçalho do documento
      addText(recurso.titulo.toUpperCase(), 16, true);
      currentY += 5;
      
      // Informações do recurso
      addText(`Tipo: ${this.getTipoRecursoLabel(recurso.tipo_recurso)}`, 10);
      addText(`Status: ${recurso.status.toUpperCase()}`, 10);
      addText(`Gerado em: ${new Date(recurso.created_at!).toLocaleString('pt-BR')}`, 10);
      
      if (recurso.versao) {
        addText(`Versão: ${recurso.versao}`, 10);
      }
      
      currentY += 10;
      
      // Linha separadora
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Conteúdo do recurso
      addText('CONTEÚDO DO RECURSO:', 14, true);
      currentY += 5;
      addText(recurso.conteudo_recurso, 11);
      
      // Fundamentação legal (se disponível)
      if (recurso.fundamentacao_legal) {
        currentY += 10;
        addText('FUNDAMENTAÇÃO LEGAL:', 12, true);
        addText(recurso.fundamentacao_legal, 10);
      }
      
      // Argumentos principais (se disponíveis)
      if (recurso.argumentos_principais && recurso.argumentos_principais.length > 0) {
        currentY += 10;
        addText('ARGUMENTOS PRINCIPAIS:', 12, true);
        recurso.argumentos_principais.forEach((argumento, index) => {
          addText(`${index + 1}. ${argumento}`, 10);
        });
      }
      
      // Rodapé
      currentY += 20;
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      addText('Documento gerado automaticamente pelo Sistema de Recursos de Multas', 8);
      addText(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, 8);
      
      // Converter para blob
      const pdfBlob = pdf.output('blob');
      
      console.log('✅ PDF gerado com sucesso');
      return pdfBlob;
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do recurso');
      return null;
    }
  }
  
  /**
   * Função auxiliar para obter label do tipo de recurso
   */
  private getTipoRecursoLabel(tipo: string): string {
    switch (tipo) {
      case 'defesa_previa': return 'Defesa Prévia';
      case 'recurso_primeira_instancia': return 'Recurso de 1ª Instância';
      case 'recurso_segunda_instancia': return 'Recurso de 2ª Instância';
      case 'conversao_advertencia': return 'Conversão em Advertência';
      default: return tipo;
    }
  }

  /**
   * Faz download do recurso como arquivo
   */
  async downloadRecurso(recurso: RecursoGerado, formato: 'txt' | 'pdf' = 'txt'): Promise<void> {
    try {
      let blob: Blob | null = null;
      let nomeArquivo = '';

      if (formato === 'pdf') {
        blob = await this.gerarPDF(recurso);
        nomeArquivo = `recurso_${recurso.id?.substring(0, 8)}_${Date.now()}.pdf`;
      } else {
        const conteudo = `${recurso.titulo}\n\n${recurso.conteudo_recurso}`;
        blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
        nomeArquivo = `recurso_${recurso.id?.substring(0, 8)}_${Date.now()}.txt`;
      }

      if (!blob) {
        toast.error('Erro ao gerar arquivo para download');
        return;
      }

      // Criar link de download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Download iniciado!');
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do recurso');
    }
  }
}

export const recursosGeradosService = new RecursosGeradosService();
export default recursosGeradosService;