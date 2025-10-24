export interface EnderecoParseResult {
  endereco: string; // primeira parte (logradouro, numero, complemento, bairro)
  cidade: string;
  estado: string; // UF
  cep: string;
}

// Lista de UFs válidas para reconhecimento
const UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]);

function normalize(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/[\s,;|]+-+[\s,;|]*/g, ' - ') // normaliza hífens com espaços
    .replace(/\s*,\s*/g, ', ') // normaliza vírgulas
    .trim();
}

/**
 * Extrai CEP e remove do texto
 */
function extractCep(text: string): { cep: string; rest: string } {
  const cepMatch = text.match(/\b(\d{5}-?\d{3})\b/);
  if (!cepMatch) return { cep: '', rest: text };
  const cep = cepMatch[1];
  const rest = text.replace(cepMatch[0], '').replace(/\s{2,}/g, ' ').trim();
  return { cep, rest };
}

/**
 * Tenta extrair estado (UF) da cauda do texto e remove do restante
 */
function extractEstado(text: string): { estado: string; rest: string } {
  // Quebra em tokens por vírgula ou hífen para olhar a cauda
  const tokens = text
    .split(/[-,]/)
    .map(t => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return { estado: '', rest: text };

  let estado = '';
  // Procura último token que seja UF válido
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i].toUpperCase();
    if (UFS.has(tok)) {
      estado = tok;
      break;
    }
  }

  if (!estado) return { estado: '', rest: text };

  // Remove UF do texto original (apenas a última ocorrência)
  const rest = text.replace(new RegExp(`(?:,|-)\\s*${estado}\\b`), '').replace(/\\s{2,}/g, ' ').trim();
  return { estado, rest };
}

/**
 * Divide o restante em partes e determina cidade e a primeira parte do endereço
 */
function splitEndereco(text: string): { endereco: string; cidade: string } {
  // Usa múltiplos delimitadores comuns
  const parts = text
    .split(/[;,|]/)
    .flatMap(p => p.split('-'))
    .flatMap(p => p.split(','))
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { endereco: '', cidade: '' };
  }

  if (parts.length === 1) {
    // Só logradouro conhecido
    return { endereco: parts[0], cidade: '' };
  }

  // Heurística: último token tende a ser cidade
  const cidade = parts[parts.length - 1];
  const endereco = parts.slice(0, -1).join(', ');
  return { endereco, cidade };
}

/**
 * Parser robusto para diferentes formatos de endereço concatenado vindo do DB.
 * Aceita strings como:
 * - "Rua X, 123, Bairro Y, Cidade Z, SP 12345-678"
 * - "Rua X - Bairro Y - Cidade Z - SP"
 * - "Logradouro, Cidade, UF"
 * - "Logradouro"
 */
export function parseEndereco(raw: string): EnderecoParseResult {
  const input = normalize(raw || '');
  if (!input) {
    return { endereco: '', cidade: '', estado: '', cep: '' };
  }

  const { cep, rest: noCep } = extractCep(input);
  const { estado, rest: noUf } = extractEstado(noCep);
  const { endereco, cidade } = splitEndereco(noUf);

  return {
    endereco,
    cidade,
    estado,
    cep,
  };
}