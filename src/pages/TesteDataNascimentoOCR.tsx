import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import GeminiOcrService, { DocumentoPessoalProcessado } from '@/services/geminiOcrService';
import { toast } from 'sonner';

export default function TesteDataNascimentoOCR() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [parsedJson, setParsedJson] = useState<DocumentoPessoalProcessado | null>(null);
  const [resultado, setResultado] = useState<DocumentoPessoalProcessado | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const appendLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString()} — ${msg}`]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResultado(null);
    setParsedJson(null);
    setRawResponse('');
    setLogs([]);
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
      appendLog(`Arquivo selecionado: ${f.name} (${f.type}, ${f.size} bytes)`);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      toast.warning('Selecione um documento (CNH/RG/CPF) para testar');
      return;
    }
    if (!GeminiOcrService.isConfigured()) {
      toast.error('Gemini não configurado (VITE_GEMINI_API_KEY ausente)');
      appendLog('Erro: VITE_GEMINI_API_KEY não está configurada');
      return;
    }

    setIsProcessing(true);
    appendLog('Iniciando processamento com GeminiOcrService.extrairDadosPessoais');

    try {
      const service = new GeminiOcrService();
      const result = await service.extrairDadosPessoais(file);

      // Atenção: extrairDadosPessoais já retorna objeto tipado
      setResultado(result);
      setParsedJson(result);
      setRawResponse(JSON.stringify(result, null, 2));

      appendLog(`Resultado recebido. Nome: ${result.nome || '(vazio)'}`);
      appendLog(`CPF: ${result.cpf || '(vazio)'} | CNH: ${result.cnh || '(vazio)'}`);
      appendLog(`Data Nascimento: ${result.dataNascimento || '(não retornada)'}`);
      appendLog('Campos de endereço, telefone e email também disponíveis no JSON.');

      if (!result.dataNascimento) {
        toast.warning('Gemini não retornou data de nascimento para este documento');
      } else {
        toast.success('Data de nascimento extraída pelo Gemini');
      }
    } catch (error: unknown) {
      console.error('Erro no processamento OCR de documento pessoal:', error);
      const message = error instanceof Error ? error.message : 'Falha ao processar documento';
      toast.error(`Erro: ${message}`);
      appendLog(`Erro: ${message}`);
    } finally {
      setIsProcessing(false);
      appendLog('Processamento finalizado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Teste de Extração de Data de Nascimento (Gemini OCR)</h1>
        <p className="text-gray-600 mb-4">Faça upload de uma imagem de documento pessoal (CNH/RG/CPF) para ver exatamente o que o Gemini está retornando, com ênfase em <strong>dataNascimento</strong>.</p>

        <div className="flex items-center gap-4">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" /> Selecionar arquivo
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>

          <button
            onClick={handleProcess}
            disabled={!file || isProcessing}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700"
          >
            {isProcessing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>) : (<><CheckCircle className="w-4 h-4 mr-2" /> Processar com IA</>)}
          </button>
        </div>

        {imagePreview && (
          <div className="mt-6">
            <h2 className="text-lg font-medium mb-2">Imagem enviada</h2>
            <div className="border rounded p-2 inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-64 object-contain" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Resposta bruta do Gemini</h2>
        <p className="text-gray-600 mb-4">Objeto resultante retornado por <code>extrairDadosPessoais</code>.</p>
        <pre className="bg-gray-900 text-green-200 p-4 rounded overflow-auto max-h-80 text-sm whitespace-pre-wrap">{rawResponse || '— sem resposta —'}</pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">JSON parseado</h2>
        <p className="text-gray-600 mb-4">Visualização do objeto estruturado.</p>
        <div className="overflow-auto">
          <pre className="bg-gray-100 text-gray-800 p-4 rounded max-h-80 text-sm whitespace-pre-wrap">{parsedJson ? JSON.stringify(parsedJson, null, 2) : '— sem dados —'}</pre>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Campo específico: dataNascimento</h2>
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="font-mono">{resultado?.dataNascimento || '— não retornado —'}</span>
        </div>
        {!resultado?.dataNascimento && (
          <p className="text-yellow-700 mt-2 inline-flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> O campo não foi retornado pelo Gemini para este documento.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Logs detalhados</h2>
        <ul className="space-y-1 text-sm">
          {logs.length === 0 ? (
            <li className="text-gray-600">— sem logs —</li>
          ) : (
            logs.map((l, idx) => (
              <li key={idx} className="font-mono">{l}</li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}