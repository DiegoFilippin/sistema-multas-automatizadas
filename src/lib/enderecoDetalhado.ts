export interface EnderecoDetalhado {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

/**
 * Extrai dados detalhados de endereço de uma string concatenada
 * Aceita formatos como:
 * - "Rua José Pedro Correia Filho, 123, Apto 101, Centro, Palhoça, SC 88135-000"
 * - "Av. Principal, 456 - Bloco A - Jardim das Flores"
 * - "Rua das Palmeiras, 789, Casa 2, Vila Nova"
 */
export function parseEnderecoDetalhado(endereco: string): EnderecoDetalhado {
  const resultado: EnderecoDetalhado = {
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  };

  if (!endereco || endereco.trim() === '') {
    return resultado;
  }

  const input = endereco.trim();

  // Extrair CEP
  const cepMatch = input.match(/\b(\d{5}-?\d{3})\b/);
  if (cepMatch) {
    resultado.cep = cepMatch[1];
  }

  // Extrair Estado (UF)
  const ufMatch = input.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  if (ufMatch) {
    resultado.estado = ufMatch[1];
  }

  // Remover CEP e UF para processar o resto
  const resto = input
    .replace(/\b\d{5}-?\d{3}\b/g, '')
    .replace(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Dividir por vírgulas e hífens
  const partes = resto
    .split(/[,-]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (partes.length === 0) {
    return resultado;
  }

  // Primeira parte é sempre o logradouro base
  const logradouroBase = partes[0] || '';
  let parteAtual = 1;

  // Procurar por número na segunda parte ou na primeira parte
  let numeroEncontrado = false;
  
  // Verificar se há número na primeira parte (ex: "Rua das Flores 123")
  const numeroNaLogradouro = logradouroBase.match(/^(.+?)\s+(\d+[A-Za-z]?)(.*)$/);
  if (numeroNaLogradouro) {
    resultado.logradouro = numeroNaLogradouro[1].trim();
    resultado.numero = numeroNaLogradouro[2];
    const resto = numeroNaLogradouro[3].trim();
    if (resto) {
      resultado.complemento = resto;
    }
    numeroEncontrado = true;
  } else {
    resultado.logradouro = logradouroBase;
  }

  // Se não encontrou número na primeira parte, procurar na segunda
  if (!numeroEncontrado && partes.length > 1) {
    const segundaParte = partes[1];
    const numeroMatch = segundaParte.match(/^(\d+[A-Za-z]?)(.*)$/);
    if (numeroMatch) {
      resultado.numero = numeroMatch[1];
      const resto = numeroMatch[2].trim();
      if (resto) {
        resultado.complemento = resto;
      }
      numeroEncontrado = true;
      parteAtual = 2;
    }
  }

  // Processar partes restantes para complemento, bairro e cidade
  const partesRestantes = partes.slice(parteAtual);
  
  // Palavras-chave que indicam complemento
  const complementoKeywords = /^(apto|apartamento|ap|bloco|bl|casa|sala|sl|conjunto|cj|lote|andar|fundos|frente|sobrado|galp[aã]o|loja|escrit[oó]rio|cobertura|térreo|terreo)[\s\d]/i;
  
  let complementoIndex = -1;
  let bairroIndex = -1;
  let cidadeIndex = -1;

  // Identificar qual parte é complemento, bairro e cidade
  for (let i = 0; i < partesRestantes.length; i++) {
    const parte = partesRestantes[i];
    
    if (complementoIndex === -1 && (complementoKeywords.test(parte) || /^\d+/.test(parte))) {
      complementoIndex = i;
    } else if (bairroIndex === -1 && complementoIndex !== -1) {
      bairroIndex = i;
    } else if (cidadeIndex === -1 && bairroIndex !== -1) {
      cidadeIndex = i;
      break; // Cidade é geralmente a última parte relevante
    }
  }

  // Se não identificou padrões específicos, usar heurística simples
  if (complementoIndex === -1 && bairroIndex === -1 && cidadeIndex === -1) {
    if (partesRestantes.length >= 3) {
      // Assumir: [complemento], [bairro], [cidade]
      if (!resultado.complemento) resultado.complemento = partesRestantes[0];
      resultado.bairro = partesRestantes[1];
      resultado.cidade = partesRestantes[2];
    } else if (partesRestantes.length === 2) {
      // Assumir: [bairro], [cidade]
      resultado.bairro = partesRestantes[0];
      resultado.cidade = partesRestantes[1];
    } else if (partesRestantes.length === 1) {
      // Pode ser bairro ou cidade - assumir cidade se não temos bairro
      if (resultado.bairro === '') {
        resultado.cidade = partesRestantes[0];
      } else {
        resultado.bairro = partesRestantes[0];
      }
    }
  } else {
    // Usar índices identificados
    if (complementoIndex >= 0 && !resultado.complemento) {
      resultado.complemento = partesRestantes[complementoIndex];
    }
    if (bairroIndex >= 0) {
      resultado.bairro = partesRestantes[bairroIndex];
    }
    if (cidadeIndex >= 0) {
      resultado.cidade = partesRestantes[cidadeIndex];
    }
  }

  return resultado;
}

/**
 * Converte um EnderecoDetalhado de volta para string concatenada
 */
export function enderecoDetalhadoParaString(endereco: EnderecoDetalhado): string {
  const partes: string[] = [];
  
  if (endereco.logradouro) {
    let logradouroParte = endereco.logradouro;
    if (endereco.numero) {
      logradouroParte += `, ${endereco.numero}`;
      if (endereco.complemento) {
        logradouroParte += `, ${endereco.complemento}`;
      }
    }
    partes.push(logradouroParte);
  }
  
  if (endereco.bairro) {
    partes.push(endereco.bairro);
  }
  
  if (endereco.cidade) {
    partes.push(endereco.cidade);
  }
  
  if (endereco.estado) {
    partes.push(endereco.estado);
  }
  
  if (endereco.cep) {
    partes.push(endereco.cep);
  }
  
  return partes.join(', ');
}