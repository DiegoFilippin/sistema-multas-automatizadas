/**
 * Utilitários para classificação e processamento de multas
 */

// Valores de referência para classificação de multas (2024)
const VALORES_MULTA = {
  LEVE: 293.47,
  MEDIA: 586.94,
  GRAVE: 880.41,
  GRAVISSIMA: 1760.82
};

// Códigos de infração que são considerados leves
const CODIGOS_MULTA_LEVE = [
  '50110', // Dirigir sem atenção ou sem os cuidados indispensáveis à segurança
  '50120', // Deixar de guardar distância de segurança lateral e frontal
  '50130', // Deixar de dar preferência de passagem a pedestre
  '50140', // Estacionar em desacordo com a regulamentação
  '50150', // Parar em local proibido
  '50160', // Conduzir veículo com equipamento obrigatório ineficiente
  '50170', // Conduzir veículo sem equipamento obrigatório
  '50180', // Usar equipamento que produza som ou ruído
  '50190', // Conduzir veículo com descarga livre ou silenciador defeituoso
  '50200', // Usar buzina em situação que não a permitida
  '74550', // Estacionar em local e horário proibidos
  '74560', // Parar em local proibido
  '74570', // Estacionar afastado da guia da calçada
  '74580', // Estacionar em desacordo com a regulamentação
  '74590', // Estacionar na contramão de direção
];

/**
 * Interface para dados de multa
 */
export interface MultaData {
  valor_original: number;
  valor_final: number;
  codigo_infracao: string;
  descricao_infracao?: string;
}

/**
 * Verifica se uma multa é considerada leve
 * @param multa - Dados da multa
 * @returns true se a multa for leve
 */
export function isMultaLeve(multa: MultaData): boolean {
  // Verifica pelo valor (critério principal)
  const valorParaAnalise = multa.valor_final || multa.valor_original;
  const isLevePorValor = valorParaAnalise <= VALORES_MULTA.LEVE;
  
  // Verifica pelo código de infração
  const isLevePorCodigo = CODIGOS_MULTA_LEVE.includes(multa.codigo_infracao);
  
  // Considera leve se atender pelo menos um dos critérios
  return isLevePorValor || isLevePorCodigo;
}

/**
 * Classifica a gravidade da multa
 * @param multa - Dados da multa
 * @returns Classificação da multa
 */
export function classificarGravidadeMulta(multa: MultaData): 'leve' | 'media' | 'grave' | 'gravissima' {
  const valor = multa.valor_final || multa.valor_original;
  
  if (valor <= VALORES_MULTA.LEVE) {
    return 'leve';
  } else if (valor <= VALORES_MULTA.MEDIA) {
    return 'media';
  } else if (valor <= VALORES_MULTA.GRAVE) {
    return 'grave';
  } else {
    return 'gravissima';
  }
}

/**
 * Verifica se uma multa leve pode ser convertida em advertência
 * conforme Art. 267 do CTB
 * @param multa - Dados da multa
 * @param possuiHistoricoMultas - Se o condutor possui multas nos últimos 12 meses
 * @returns true se pode ser convertida em advertência
 */
export function podeConverterEmAdvertencia(multa: MultaData, possuiHistoricoMultas: boolean): boolean {
  // Só pode converter se for multa leve E não possuir histórico de multas
  return isMultaLeve(multa) && !possuiHistoricoMultas;
}

/**
 * Gera o texto de orientação para conversão em advertência
 * @param multa - Dados da multa
 * @returns Texto explicativo sobre a conversão
 */
export function getTextoConversaoAdvertencia(multa: MultaData): string {
  return `Esta multa pode ser convertida em advertência por escrito conforme o Art. 267 do Código de Trânsito Brasileiro (CTB), pois:

` +
    `1. É classificada como infração LEVE (valor: R$ ${(multa.valor_final || multa.valor_original).toFixed(2)})
` +
    `2. O condutor não possui registro de multas nos últimos 12 meses
` +
    `3. Atende aos requisitos do Art. 267 do CTB

` +
    `A IA será orientada a gerar um documento de pedido de conversão de multa em advertência por escrito.`;
}

/**
 * Valores de referência para consulta
 */
export const VALORES_REFERENCIA = VALORES_MULTA;
export const CODIGOS_LEVES = CODIGOS_MULTA_LEVE