/**
 * Debug detalhado da detecção de recursos
 * Investigar por que 'Contém indicadores suficientes: false'
 */

// Conteúdo da mensagem recebida pelo usuário
const mensagemRecebida = `[RECURSO GERADO]

À
PREFEITURA MUNICIPAL DE BLUMENAU – SETERB
Ref.: Auto de Infração nº BLU0589972
Autuado: DISK CAR LOCACAO DE VEICULOS SA
Veículo: VW/GOL 1.6L MB5 – Placa RDW0H45
Data da Infração: 15/03/2025
Código da Infração: 7455-0

DOS FATOS E FUNDAMENTOS

O presente recurso visa a anulação do Auto de Infração nº BLU0589972, que imputa ao veículo VW/GOL 1.6L MB5, placa RDW0H45, a infração de transitar em velocidade superior à máxima permitida em até 20%, conforme auto lavrado em 15 de março de 2025.

Em análise ao auto de infração e aos normativos do Manual Brasileiro de Fiscalização de Trânsito (MBFT), verifica-se que o documento apresenta falhas que comprometem sua validade jurídica, a saber:

1. Ausência da indicação expressa da velocidade máxima permitida no local da infração e da velocidade aferida pelo equipamento eletrônico, dado essencial para caracterização da infração de trânsito, conforme exigido pela Resolução nº 900/CONTRAN/2022 e pelo MBFT.

2. O auto refere fiscalização por equipamento fixo, mas não comprova a data da última aferição ou validade do equipamento utilizado para medição da velocidade, requisito indispensável para assegurar confiabilidade e regularidade da fiscalização.

3. A descrição do endereço do local da infração é genérica ("Rua Amazonas próximo número 840, Blumenau - Santa Catarina"), o que pode causar ambiguidade na identificação precisa do ponto da infração, dificultando o exercício pleno do direito de defesa.

Esses vícios formalmente qualificáveis violam os princípios constitucionais da legalidade e do devido processo legal (art. 5º, inciso LIV da Constituição Federal), bem como o artigo 281 do Código de Trânsito Brasileiro, que impõe requisitos para a validade do auto de infração.

Diante disso, requer-se o cancelamento do referido auto de infração.

Alternativamente, caso não seja este o entendimento, requer-se a conversão da penalidade em advertência por escrito, considerando a natureza leve da infração e ausência de reincidência do autuado no período legal, em atendimento ao artigo 267 do CTB.

Por fim, reitera-se o compromisso com o cumprimento das normas de trânsito e a preservação dos direitos fundamentais do cidadão.

Termos em que,
Pede deferimento.

Blumenau, 16 de setembro de 2025.

---

Fundamentação Legal:
- Art. 281, Código de Trânsito Brasileiro
- Art. 267, Código de Trânsito Brasileiro
- Resolução nº 900/CONTRAN/2022
- Manual Brasileiro de Fiscalização de Trânsito (MBFT)
- Art. 5º, inciso LIV, Constituição Federal

---

Solicito a gravação deste recurso para acompanhamento dos trâmites processuais.`;

console.log('🔍 === DEBUG DETALHADO DA DETECÇÃO ===\n');

// Testar cada indicador individualmente
const indicadoresRecurso = [
  '[RECURSO GERADO]',
  'RECURSO GERADO',
  '[RECURSO]',
  'RECURSO',
  'DEFESA',
  'EXCELENTÍSSIMO',
  'PEDIDO',
  'FUNDAMENTAÇÃO',
  'REQUER',
  'DEFERIMENTO',
  'ANULAÇÃO',
  'AUTO DE INFRAÇÃO'
];

const responseUpper = mensagemRecebida.toUpperCase();

console.log('📝 Testando cada indicador individualmente:');
indicadoresRecurso.forEach((indicador, index) => {
  const encontrado = responseUpper.includes(indicador.toUpperCase());
  console.log(`${(index + 1).toString().padStart(2, ' ')}. "${indicador}" -> ${encontrado ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
  
  if (encontrado) {
    // Mostrar onde foi encontrado
    const posicao = responseUpper.indexOf(indicador.toUpperCase());
    const contexto = mensagemRecebida.substring(Math.max(0, posicao - 20), posicao + indicador.length + 20);
    console.log(`    Contexto: "...${contexto}..."`);
  }
});

// Verificar indicadores encontrados
const indicadoresEncontrados = indicadoresRecurso.filter(indicador => 
  responseUpper.includes(indicador.toUpperCase())
);

console.log('\n📊 Resumo da detecção:');
console.log('- Indicadores encontrados:', indicadoresEncontrados.length);
console.log('- Lista:', indicadoresEncontrados);
console.log('- Tamanho do conteúdo:', mensagemRecebida.length, 'caracteres');
console.log('- Mínimo necessário: 200 caracteres');

const contemRecurso = indicadoresEncontrados.length > 0;
const isRecurso = contemRecurso && mensagemRecebida.length > 200;

console.log('\n🎯 Resultado final:');
console.log('- contemRecurso:', contemRecurso);
console.log('- isRecurso:', isRecurso);

if (isRecurso) {
  console.log('\n✅ RECURSO DEVERIA SER DETECTADO!');
} else {
  console.log('\n❌ RECURSO NÃO SERIA DETECTADO');
  if (!contemRecurso) {
    console.log('  Motivo: Nenhum indicador encontrado');
  }
  if (mensagemRecebida.length <= 200) {
    console.log('  Motivo: Conteúdo muito curto');
  }
}

// Verificar problemas específicos
console.log('\n🔧 === VERIFICAÇÕES ESPECÍFICAS ===');
console.log('1. Começa com [RECURSO GERADO]:', mensagemRecebida.startsWith('[RECURSO GERADO]'));
console.log('2. Contém "RECURSO":', mensagemRecebida.toUpperCase().includes('RECURSO'));
console.log('3. Contém "FUNDAMENTAÇÃO":', mensagemRecebida.toUpperCase().includes('FUNDAMENTAÇÃO'));
console.log('4. Contém "REQUER":', mensagemRecebida.toUpperCase().includes('REQUER'));
console.log('5. Contém "AUTO DE INFRAÇÃO":', mensagemRecebida.toUpperCase().includes('AUTO DE INFRAÇÃO'));

// Verificar se há caracteres especiais que podem estar causando problemas
console.log('\n🔍 === ANÁLISE DE CARACTERES ===');
console.log('Primeiros 200 caracteres:');
console.log('"' + mensagemRecebida.substring(0, 200) + '"');

console.log('\nCaracteres especiais encontrados:');
const caracteresEspeciais = mensagemRecebida.match(/[^\w\s\n\r.,;:!?()\[\]{}"'-]/g);
if (caracteresEspeciais) {
  console.log('Encontrados:', [...new Set(caracteresEspeciais)].join(', '));
} else {
  console.log('Nenhum caractere especial problemático encontrado');
}

console.log('\n✅ Debug concluído!');