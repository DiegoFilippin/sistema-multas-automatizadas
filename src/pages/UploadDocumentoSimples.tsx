import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface DadosExtraidos {
  numeroAuto: string;
  dataInfracao: string;
  horaInfracao: string;
  localInfracao: string;
  codigoInfracao: string;
  descricaoInfracao: string;
  valorMulta: number;
  placaVeiculo: string;
  orgaoAutuador: string;
  observacoes: string;
}

const UploadDocumentoSimples: React.FC = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [etapa, setEtapa] = useState<'upload' | 'extraindo' | 'salvando' | 'concluido'>('upload');
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // ETAPA 1: Selecionar arquivo e converter para base64 IMEDIATAMENTE
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', file.name, file.size, file.type);
    setArquivo(file);
    setErro(null);
    setDadosExtraidos(null);
    setEtapa('upload');

    try {
      // Converter para base64 usando ArrayBuffer (mais robusto)
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mime = file.type || 'application/pdf';
      
      setBase64Data(base64);
      setMimeType(mime);
      console.log('✅ Arquivo convertido para base64:', { mime, length: base64.length });
      toast.success('Arquivo carregado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao converter arquivo:', error);
      setErro(`Erro ao ler o arquivo: ${error.message}`);
      toast.error('Erro ao ler o arquivo');
    }
  };

  // ETAPA 2: Extrair dados com Gemini OCR
  const extrairDados = async () => {
    if (!base64Data || !mimeType) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setErro('API do Gemini não configurada');
      toast.error('Configure VITE_GEMINI_API_KEY no arquivo .env');
      return;
    }

    setIsProcessing(true);
    setEtapa('extraindo');
    setErro(null);

    try {
      console.log('🔍 Iniciando extração com Gemini...');
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-pro',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const prompt = `Analise esta imagem de um auto de infração de trânsito brasileiro e extraia as informações em formato JSON.

Retorne APENAS um objeto JSON válido com estes campos:
{
  "numeroAuto": "número do auto de infração",
  "dataInfracao": "DD/MM/AAAA",
  "horaInfracao": "HH:MM",
  "localInfracao": "local da infração",
  "codigoInfracao": "código da infração",
  "descricaoInfracao": "descrição da infração",
  "valorMulta": 0,
  "placaVeiculo": "placa do veículo",
  "orgaoAutuador": "órgão autuador",
  "observacoes": "observações"
}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional. Use "" para campos não encontrados e 0 para valores numéricos não encontrados.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType } }
      ]);

      const response = await result.response;
      let text = response.text().trim();
      
      // Limpar resposta
      if (text.startsWith('```json')) text = text.slice(7);
      if (text.startsWith('```')) text = text.slice(3);
      if (text.endsWith('```')) text = text.slice(0, -3);
      text = text.trim();

      console.log('📄 Resposta do Gemini:', text);

      const dados = JSON.parse(text) as DadosExtraidos;
      setDadosExtraidos(dados);
      setEtapa('salvando');
      toast.success('Dados extraídos com sucesso!');
      
      console.log('✅ Dados extraídos:', dados);

    } catch (error: any) {
      console.error('❌ Erro na extração:', error);
      setErro(`Erro na extração: ${error.message}`);
      toast.error('Erro ao extrair dados do documento');
      setEtapa('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // ETAPA 3: Salvar no banco de dados
  const salvarNoBanco = async () => {
    if (!dadosExtraidos || !user?.company_id) {
      toast.error('Dados não disponíveis para salvar');
      return;
    }

    setIsProcessing(true);
    setErro(null);

    try {
      console.log('💾 Salvando no banco de dados...');

      // Converter data para formato do banco
      let dataInfracao = new Date().toISOString().split('T')[0];
      if (dadosExtraidos.dataInfracao) {
        const partes = dadosExtraidos.dataInfracao.split('/');
        if (partes.length === 3) {
          dataInfracao = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }

      const multaData = {
        company_id: user.company_id,
        numero_auto: dadosExtraidos.numeroAuto || 'N/I',
        placa_veiculo: dadosExtraidos.placaVeiculo || 'N/I',
        data_infracao: dataInfracao,
        local_infracao: dadosExtraidos.localInfracao || 'Não informado',
        codigo_infracao: dadosExtraidos.codigoInfracao || 'N/I',
        descricao_infracao: dadosExtraidos.descricaoInfracao || 'Não informado',
        valor_original: dadosExtraidos.valorMulta || 0,
        valor_final: dadosExtraidos.valorMulta || 0,
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        orgao_autuador: dadosExtraidos.orgaoAutuador || null,
        observacoes: dadosExtraidos.observacoes || null,
        status: 'pendente'
      };

      console.log('📝 Dados a salvar:', multaData);

      const { data, error } = await supabase
        .from('multas')
        .insert(multaData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Multa salva:', data);
      setEtapa('concluido');
      toast.success('Multa salva com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      setErro(`Erro ao salvar: ${error.message}`);
      toast.error('Erro ao salvar no banco de dados');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset para novo upload
  const resetar = () => {
    setArquivo(null);
    setBase64Data(null);
    setMimeType('');
    setDadosExtraidos(null);
    setErro(null);
    setEtapa('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload de Documento - Teste Simples</h1>

      {/* Indicador de Etapas */}
      <div className="flex items-center justify-between mb-8">
        <div className={`flex items-center ${etapa === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'upload' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {base64Data ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="ml-2 text-sm">Upload</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 mx-2" />
        <div className={`flex items-center ${etapa === 'extraindo' ? 'text-blue-600' : dadosExtraidos ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'extraindo' ? 'bg-blue-100' : dadosExtraidos ? 'bg-green-100' : 'bg-gray-100'}`}>
            {dadosExtraidos ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="ml-2 text-sm">Extração</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 mx-2" />
        <div className={`flex items-center ${etapa === 'concluido' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'concluido' ? 'bg-green-100' : 'bg-gray-100'}`}>
            {etapa === 'concluido' ? <CheckCircle className="w-5 h-5" /> : '3'}
          </div>
          <span className="ml-2 text-sm">Salvar</span>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          {erro}
        </div>
      )}

      {/* Upload de Arquivo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          1. Selecione o documento da multa
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Clique para selecionar ou arraste o arquivo</p>
            <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG (máx. 10MB)</p>
          </label>
        </div>
        
        {arquivo && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center">
            <FileText className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-gray-700">{arquivo.name}</span>
            {base64Data && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
          </div>
        )}
      </div>

      {/* Botão Extrair */}
      {base64Data && !dadosExtraidos && (
        <div className="mb-6">
          <button
            onClick={extrairDados}
            disabled={isProcessing}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Extraindo dados...
              </>
            ) : (
              '2. Extrair Dados do Documento'
            )}
          </button>
        </div>
      )}

      {/* Dados Extraídos */}
      {dadosExtraidos && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800 mb-3">Dados Extraídos:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Nº Auto:</strong> {dadosExtraidos.numeroAuto}</div>
            <div><strong>Placa:</strong> {dadosExtraidos.placaVeiculo}</div>
            <div><strong>Data:</strong> {dadosExtraidos.dataInfracao}</div>
            <div><strong>Hora:</strong> {dadosExtraidos.horaInfracao}</div>
            <div><strong>Código:</strong> {dadosExtraidos.codigoInfracao}</div>
            <div><strong>Valor:</strong> R$ {dadosExtraidos.valorMulta?.toFixed(2)}</div>
            <div className="col-span-2"><strong>Local:</strong> {dadosExtraidos.localInfracao}</div>
            <div className="col-span-2"><strong>Descrição:</strong> {dadosExtraidos.descricaoInfracao}</div>
            <div className="col-span-2"><strong>Órgão:</strong> {dadosExtraidos.orgaoAutuador}</div>
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      {dadosExtraidos && etapa !== 'concluido' && (
        <div className="mb-6">
          <button
            onClick={salvarNoBanco}
            disabled={isProcessing}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              '3. Salvar no Banco de Dados'
            )}
          </button>
        </div>
      )}

      {/* Concluído */}
      {etapa === 'concluido' && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
          <p className="text-green-800 font-medium">Multa salva com sucesso!</p>
          <button
            onClick={resetar}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fazer Novo Upload
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadDocumentoSimples;
