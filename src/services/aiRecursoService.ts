import openaiAssistantService, { OpenAIAssistantService } from './openaiAssistantService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentoProcessado } from './geminiOcrService';

interface RecursoGerado {
  titulo: string;
  argumentacao: string;
  fundamentacao_legal: string;
  pedido: string;
  tipo: 'defesa_previa' | 'recurso_primeira_instancia' | 'recurso_segunda_instancia';
}

export class AiRecursoService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('VITE_GOOGLE_API_KEY não encontrada. Serviço Gemini não estará disponível.');
    }
  }

  isConfigured(): boolean {
    return !!this.genAI;
  }

 async gerarRecurso(dadosMulta: DocumentoProcessado, nomeCliente: string, tipoDocumento: 'defesa_previa' | 'conversao_advertencia' = 'defesa_previa'): Promise<RecursoGerado> {
    console.log('=== INÍCIO DA GERAÇÃO DE RECURSO ===');
    console.log('Dados da multa recebidos:', dadosMulta);
    console.log('Nome do cliente:', nomeCliente);
    console.log('Tipo de documento:', tipoDocumento);
    
    // Verificar configurações das APIs
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const openaiAssistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    console.log('Configurações das APIs:');
    console.log('- OpenAI API Key configurada:', !!openaiKey);
    console.log('- OpenAI Assistant ID configurada:', !!openaiAssistantId);
    console.log('- Gemini API Key configurada:', !!geminiKey);
    console.log('- OpenAI Assistant Service configurado:', OpenAIAssistantService.isConfigured());
    console.log('- Gemini Service configurado:', !!this.genAI);
    
    let ultimoErro: any = null;
    
    // Priorizar OpenAI Assistant se estiver configurado
    if (OpenAIAssistantService.isConfigured()) {
      try {
        console.log('🤖 TENTATIVA 1: Usando OpenAI Assistant para gerar recurso');
        console.log('Assistant ID sendo usado:', openaiAssistantId);
        const resultado = await openaiAssistantService.gerarRecurso(dadosMulta, nomeCliente, tipoDocumento);
        console.log('✅ OpenAI Assistant gerou recurso com sucesso!');
        console.log('Título gerado:', resultado.titulo);
        return resultado;
      } catch (error) {
        ultimoErro = error;
        console.error('❌ ERRO ao usar OpenAI Assistant, tentando fallback para Gemini:', error);
        
        // Log detalhado do erro para debug
        if (error instanceof Error) {
          console.error('Detalhes do erro OpenAI:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
      }
    }

    // Fallback para Gemini se OpenAI não estiver disponível ou falhar
    if (!this.genAI) {
      console.error('❌ Nenhum serviço de IA configurado. Último erro OpenAI:', ultimoErro);
      console.log('🔄 USANDO FALLBACK ESTÁTICO - Nenhuma API de IA disponível');
      return this.criarRecursoFallbackEstatico(dadosMulta, nomeCliente);
    }

    // Tentar Gemini com múltiplas tentativas
    console.log('🔄 Tentando Gemini como fallback...');
    const maxTentativas = 3;
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        console.log(`🔄 TENTATIVA ${tentativa}: Usando Gemini como fallback para gerar recurso`);
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const isConversaoAdvertencia = tipoDocumento === 'conversao_advertencia';
      
      const prompt = `
Você é um especialista em direito de trânsito e deve gerar um documento COMPLETO e PROFISSIONAL, pronto para envio ao órgão competente.

${isConversaoAdvertencia ? 'TIPO DE DOCUMENTO: PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO' : 'TIPO DE DOCUMENTO: DEFESA PRÉVIA'}

DADOS DA MULTA:
- Auto de Infração: ${dadosMulta.numeroAuto}
- Data da Infração: ${dadosMulta.dataInfracao}
- Hora: ${dadosMulta.horaInfracao}
- Local: ${dadosMulta.localInfracao}
- Placa do Veículo: ${dadosMulta.placaVeiculo}
- Tipo de Infração: ${dadosMulta.descricaoInfracao}
- Código da Infração: ${dadosMulta.codigoInfracao}
- Valor da Multa: R$ ${dadosMulta.valorMulta}
- Órgão Autuador: ${dadosMulta.orgaoAutuador}
- Agente: ${dadosMulta.agente}

DADOS DO REQUERENTE:
- Nome: ${nomeCliente}

${isConversaoAdvertencia ? `INSTRUÇÕES ESPECÍFICAS PARA CONVERSÃO EM ADVERTÊNCIA:
1. Gere um PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO
2. Fundamente no Art. 267 do Código de Trânsito Brasileiro (CTB)
3. Destaque que se trata de infração LEVE
4. Mencione que o condutor NÃO possui registro de multas nos últimos 12 meses
5. Solicite a aplicação da penalidade de advertência por escrito em substituição à multa
6. Use linguagem formal e respeitosa
7. Inclua todos os dados da infração e do requerente
8. Estruture como requerimento administrativo formal` : `INSTRUÇÕES ESPECÍFICAS PARA DEFESA PRÉVIA:
1. Gere um documento COMPLETO e FORMAL, pronto para protocolo
2. Inclua cabeçalho com destinatário (órgão autuador)
3. Identifique completamente o requerente e o veículo
4. Analise tecnicamente a infração e identifique vícios específicos
5. Use fundamentação legal detalhada com artigos específicos
6. Estruture o pedido de forma clara e objetiva
7. Inclua local, data e campo para assinatura
8. Use linguagem jurídica formal mas acessível`}

RETORNE APENAS UM JSON VÁLIDO com a seguinte estrutura:
{
  "titulo": "${isConversaoAdvertencia ? 'PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO - Auto de Infração nº [numero]' : 'DEFESA PRÉVIA - Auto de Infração nº [numero]'}",
  "argumentacao": "Documento completo formatado profissionalmente com todas as seções necessárias",
  "fundamentacao_legal": "${isConversaoAdvertencia ? 'Art. 267 do Código de Trânsito Brasileiro (Lei 9.503/97) e demais artigos aplicáveis' : 'Artigos específicos do CTB e resoluções CONTRAN aplicáveis'}",
  "pedido": "Pedido formal estruturado",
  "tipo": "${isConversaoAdvertencia ? 'conversao_advertencia' : 'defesa_previa'}"
}

IMPORTANTE: 
- O campo 'argumentacao' deve conter o documento COMPLETO formatado
- Use quebras de linha (\n) para formatação
- Inclua todas as seções necessárias
- Retorne APENAS o JSON, sem texto adicional
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let jsonStr = response.text().trim();

      // Limpar possíveis marcadores de código
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remover possíveis caracteres especiais no início/fim
      jsonStr = jsonStr.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

      console.log('Resposta bruta da IA para recurso:', response.text());
      console.log('JSON limpo para parsing:', jsonStr);

      try {
        const recursoGerado = JSON.parse(jsonStr);
        
        // Validar estrutura do objeto
        if (!recursoGerado.titulo || !recursoGerado.argumentacao || !recursoGerado.fundamentacao_legal || !recursoGerado.pedido) {
          throw new Error('Estrutura de resposta inválida');
        }

        console.log('✅ Gemini gerou recurso com sucesso!');
        console.log('Título gerado:', recursoGerado.titulo);
        
        return {
          titulo: recursoGerado.titulo,
          argumentacao: recursoGerado.argumentacao,
          fundamentacao_legal: recursoGerado.fundamentacao_legal,
          pedido: recursoGerado.pedido,
          tipo: recursoGerado.tipo || 'defesa_previa'
        };

      } catch (parseError) {
        console.error(`Tentativa ${tentativa} - Erro ao fazer parsing da resposta da IA:`, parseError);
        console.error('Resposta que causou erro:', jsonStr);
        
        if (tentativa === maxTentativas) {
          console.log('❌ Todas as tentativas de parsing do Gemini falharam, usando fallback estático');
          console.log('🔄 USANDO FALLBACK ESTÁTICO - Falha no parsing do Gemini');
          return this.criarRecursoFallbackEstatico(dadosMulta, nomeCliente);
        }
        
        // Continuar para próxima tentativa
        continue;
      }

      } catch (error) {
        ultimoErro = error;
        console.error(`Tentativa ${tentativa} - Erro ao gerar recurso com Gemini:`, error);
        
        if (tentativa === maxTentativas) {
          console.error('Todas as tentativas com Gemini falharam');
          break;
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000 * tentativa));
      }
    }
    
    // Fallback final em caso de erro em ambos os serviços
    console.log('❌ TODAS AS TENTATIVAS DE IA FALHARAM!');
    console.log('🔄 USANDO FALLBACK ESTÁTICO FINAL - Falha em OpenAI e Gemini');
    console.log('Último erro registrado:', ultimoErro);
    return this.criarRecursoFallbackEstatico(dadosMulta, nomeCliente);
  }
  
  private criarRecursoFallbackEstatico(dadosMulta: DocumentoProcessado, nomeCliente: string): RecursoGerado {
    console.log('📄 GERANDO RECURSO COM FALLBACK ESTÁTICO');
    console.log('Dados da multa para fallback:', {
      numeroAuto: dadosMulta.numeroAuto,
      placaVeiculo: dadosMulta.placaVeiculo,
      orgaoAutuador: dadosMulta.orgaoAutuador
    });
    console.log('Nome do cliente para fallback:', nomeCliente);
    
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const orgaoDestinatario = dadosMulta.orgaoAutuador || 'Órgão de Trânsito Competente';
    
    const documentoCompleto = `AO ${orgaoDestinatario.toUpperCase()}\n\n` +
      `DEFESA PRÉVIA\n` +
      `Auto de Infração nº ${dadosMulta.numeroAuto}\n\n` +
      `IDENTIFICAÇÃO DO REQUERENTE:\n` +
      `Nome: ${nomeCliente}\n` +
      `Qualidade: Proprietário/Condutor do veículo\n\n` +
      `IDENTIFICAÇÃO DO VEÍCULO:\n` +
      `Placa: ${dadosMulta.placaVeiculo}\n\n` +
      `DADOS DA AUTUAÇÃO:\n` +
      `Auto de Infração: ${dadosMulta.numeroAuto}\n` +
      `Data da Infração: ${dadosMulta.dataInfracao}\n` +
      `Horário: ${dadosMulta.horaInfracao}\n` +
      `Local: ${dadosMulta.localInfracao}\n` +
      `Código da Infração: ${dadosMulta.codigoInfracao}\n` +
      `Descrição: ${dadosMulta.descricaoInfracao}\n` +
      `Valor da Multa: R$ ${dadosMulta.valorMulta}\n` +
      `Agente Autuador: ${dadosMulta.agente}\n\n` +
      `ARGUMENTAÇÃO:\n\n` +
      `Venho, respeitosamente, por meio desta, apresentar DEFESA PRÉVIA referente ao Auto de Infração em epígrafe, com fundamento nos artigos 280 e seguintes do Código de Trânsito Brasileiro.\n\n` +
      `Após minuciosa análise do auto de infração, verifico a existência de irregularidades formais e materiais que comprometem a validade do ato administrativo, conforme demonstrado a seguir:\n\n` +
      `1. VÍCIOS FORMAIS: O auto de infração não atende aos requisitos mínimos estabelecidos pelo art. 280 do CTB, apresentando inconsistências que maculam sua validade.\n\n` +
      `2. AUSÊNCIA DE ELEMENTOS ESSENCIAIS: Conforme determina a legislação de trânsito, o auto deve conter informações precisas e completas, o que não se verifica no presente caso.\n\n` +
      `3. VIOLAÇÃO AO DEVIDO PROCESSO LEGAL: O procedimento adotado não observou as garantias constitucionais do contraditório e da ampla defesa.\n\n` +
      `FUNDAMENTAÇÃO LEGAL:\n\n` +
      `- Artigos 280, 281 e 282 do Código de Trânsito Brasileiro (Lei 9.503/97)\n` +
      `- Resolução CONTRAN nº 619/2016\n` +
      `- Artigo 5º, incisos LIV e LV da Constituição Federal\n` +
      `- Lei nº 9.784/99 (Lei do Processo Administrativo)\n\n` +
      `PEDIDO:\n\n` +
      `Diante do exposto e com fundamento na legislação citada, REQUER-SE:\n\n` +
      `a) O recebimento da presente defesa prévia;\n` +
      `b) A análise detalhada das irregularidades apontadas;\n` +
      `c) O ARQUIVAMENTO do Auto de Infração nº ${dadosMulta.numeroAuto} por vício insanável;\n` +
      `d) A não aplicação da penalidade de multa no valor de R$ ${dadosMulta.valorMulta};\n` +
      `e) A não pontuação na CNH do condutor.\n\n` +
      `Termos em que pede deferimento.\n\n` +
      `Local e Data: _________________, ${dataAtual}\n\n` +
      `_________________________________\n` +
      `${nomeCliente}\n` +
      `Requerente`;
    
    const recursoFallback = {
      titulo: `DEFESA PRÉVIA - Auto de Infração nº ${dadosMulta.numeroAuto}`,
      argumentacao: documentoCompleto,
      fundamentacao_legal: `Artigos 280, 281 e 282 do Código de Trânsito Brasileiro (Lei 9.503/97), Resolução CONTRAN nº 619/2016, Artigo 5º, incisos LIV e LV da Constituição Federal, Lei nº 9.784/99 (Lei do Processo Administrativo).`,
      pedido: `Arquivamento do Auto de Infração nº ${dadosMulta.numeroAuto} por vício insanável e não aplicação da penalidade de multa no valor de R$ ${dadosMulta.valorMulta}.`,
      tipo: 'defesa_previa' as const
    };
    
    console.log('✅ Recurso fallback estático gerado com sucesso!');
    console.log('Título do recurso fallback:', recursoFallback.titulo);
    console.log('=== FIM DA GERAÇÃO DE RECURSO (FALLBACK ESTÁTICO) ===');
    
    return recursoFallback;
  }
}

export default new AiRecursoService();
export type { RecursoGerado };
