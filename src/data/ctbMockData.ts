// Dados mock dos artigos do CTB Digital para demonstração
// Evita problemas de CORS ao fazer scraping direto do frontend

export interface CTBArticleMock {
  articleNumber: string;
  title: string;
  content: string;
  comments?: string;
  author?: string;
  url: string;
}

export const ctbMockArticles: CTBArticleMock[] = [
  {
    articleNumber: "1",
    title: "O trânsito de qualquer natureza nas vias terrestres do território nacional",
    content: "O trânsito de qualquer natureza nas vias terrestres do território nacional, abertas à circulação, rege-se por este Código. § 1º Considera-se trânsito a utilização das vias por pessoas, veículos e animais, isolados ou em grupos, conduzidos ou não, para fins de circulação, parada, estacionamento e operações de carga ou descarga. § 2º O trânsito, em condições seguras, é um direito de todos e dever dos órgãos e entidades componentes do Sistema Nacional de Trânsito, a estes cabendo, no âmbito das respectivas competências, adotar as medidas destinadas a assegurar esse direito. § 3º Os órgãos e entidades componentes do Sistema Nacional de Trânsito respondem, no âmbito das respectivas competências, objetivamente, por danos causados aos cidadãos em virtude de ação, omissão ou erro na execução e manutenção de programas, projetos e serviços que garantam o exercício do direito do trânsito seguro.",
    comments: "Este artigo estabelece o princípio fundamental do Código de Trânsito Brasileiro, definindo que todas as vias terrestres do país estão sujeitas às suas normas. É importante destacar que o conceito de trânsito é amplo, incluindo não apenas veículos, mas também pedestres e animais. O direito ao trânsito seguro é garantido constitucionalmente, e os órgãos de trânsito têm responsabilidade objetiva por danos causados por falhas em seus serviços.",
    author: "Dr. João Silva - Especialista em Direito de Trânsito",
    url: "https://www.ctbdigital.com.br/artigo/art1"
  },
  {
    articleNumber: "2",
    title: "São vias terrestres urbanas e rurais",
    content: "São vias terrestres urbanas e rurais as ruas, as avenidas, os logradouros, os caminhos, as passagens, as estradas e as rodovias, que terão seu uso regulamentado pelo órgão ou entidade com circunscrição sobre elas, de acordo com as peculiaridades locais e as circunstâncias especiais. Parágrafo único. Para os efeitos deste Código, são consideradas vias terrestres as praias abertas à circulação pública, as vias internas pertencentes aos condomínios constituídos por unidades autônomas e as vias e áreas de estacionamento de estabelecimentos privados de uso coletivo.",
    comments: "Este artigo amplia significativamente o conceito de vias terrestres, incluindo até mesmo praias e áreas privadas de uso coletivo. Isso significa que as normas do CTB se aplicam também em shopping centers, condomínios e outros locais privados com circulação pública. É uma extensão importante da competência dos órgãos de trânsito.",
    author: "Dra. Maria Santos - Consultora em Legislação de Trânsito",
    url: "https://www.ctbdigital.com.br/artigo/art2"
  },
  {
    articleNumber: "161",
    title: "Constitui infração de trânsito a inobservância de qualquer preceito deste Código",
    content: "Constitui infração de trânsito a inobservância de qualquer preceito deste Código, da legislação complementar ou das resoluções do CONTRAN, sendo o infrator sujeito às penalidades e medidas administrativas indicadas em cada artigo, além das punições previstas no Capítulo XIX. § 1º As infrações classificam-se, de acordo com sua gravidade, em: I - leves; II - médias; III - graves; IV - gravíssimas. § 2º Respondem pela infração, conjunta ou isoladamente: I - o condutor do veículo; II - o proprietário ou o possuidor do veículo; III - o embarcador e o transportador, nas infrações relativas ao transporte de produtos perigosos; IV - o responsável pela execução da obra ou do evento; V - os demais responsáveis estabelecidos neste Código. § 3º Ao proprietário caberá sempre a responsabilidade pela infração referente à prévia regularização e ao registro do licenciamento do veículo.",
    comments: "Este é um dos artigos mais importantes do CTB, pois estabelece o conceito de infração de trânsito e sua classificação. A responsabilidade solidária entre condutor e proprietário é fundamental para a efetividade da fiscalização. Note-se que mesmo sem identificar o condutor, o proprietário pode ser responsabilizado por certas infrações, especialmente aquelas relacionadas ao veículo.",
    author: "Dr. Carlos Oliveira - Especialista em Infrações de Trânsito",
    url: "https://www.ctbdigital.com.br/artigo/art161"
  },
  {
    articleNumber: "165",
    title: "Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa",
    content: "Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência: Infração - gravíssima; Penalidade - multa (dez vezes) e suspensão do direito de dirigir por 12 (doze) meses; Medida administrativa - recolhimento do documento de habilitação e retenção do veículo até a apresentação de condutor habilitado e recolhimento do veículo à depositária. § 1º Nas mesmas penalidades incorre quem, mesmo sem estar sob a influência de álcool ou substância psicoativa que determine dependência, deixar de submeter-se a qualquer dos procedimentos previstos no art. 277 deste Código. § 2º A infração prevista no caput também se caracteriza pelo cometimento de qualquer das seguintes condutas: I - concentração de álcool por litro de sangue igual ou superior a 6 (seis) decigramas, ou igual ou superior a 0,3 (três décimos) miligrama por litro de ar alveolar expirado; II - sinais que indiquem, na forma disciplinada pelo CONTRAN, alteração da capacidade psicomotora.",
    comments: "A Lei Seca é uma das mais rigorosas do mundo. Importante notar que a recusa aos testes também configura infração. Os sinais de alteração psicomotora podem ser constatados mesmo sem exame específico, através de observação clínica. A penalidade é severa: multa multiplicada por 10, suspensão por um ano e retenção do veículo.",
    author: "Dra. Ana Costa - Especialista em Lei Seca",
    url: "https://www.ctbdigital.com.br/artigo/art165"
  },
  {
    articleNumber: "218",
    title: "Transitar em velocidade superior à máxima permitida para o local",
    content: "Transitar em velocidade superior à máxima permitida para o local, medida por instrumento ou equipamento hábil: I - em rodovias, vias de trânsito rápido e vias arteriais: a) quando a velocidade for superior à máxima em até 20% (vinte por cento): Infração - média; Penalidade - multa; b) quando a velocidade for superior à máxima em mais de 20% (vinte por cento) até 50% (cinquenta por cento): Infração - grave; Penalidade - multa; c) quando a velocidade for superior à máxima em mais de 50% (cinquenta por cento): Infração - gravíssima; Penalidade - multa (três vezes), suspensão do direito de dirigir e curso de reciclagem; II - demais vias: a) quando a velocidade for superior à máxima em até 20% (vinte por cento): Infração - leve; Penalidade - multa; b) quando a velocidade for superior à máxima em mais de 20% (vinte por cento) até 50% (cinquenta por cento): Infração - média; Penalidade - multa; c) quando a velocidade for superior à máxima em mais de 50% (cinquenta por cento): Infração - grave; Penalidade - multa.",
    comments: "O excesso de velocidade tem graduação diferente conforme o tipo de via e o percentual de excesso. Em rodovias, as penalidades são mais severas. Acima de 50% do limite em rodovias, além da multa triplicada, há suspensão da CNH. É importante observar que a margem de tolerância não está prevista no CTB, sendo estabelecida por resolução do CONTRAN.",
    author: "Dr. Pedro Almeida - Especialista em Infrações de Velocidade",
    url: "https://www.ctbdigital.com.br/artigo/art218"
  },
  {
    articleNumber: "244",
    title: "Conduzir motocicleta, motoneta e ciclomotor",
    content: "Conduzir motocicleta, motoneta e ciclomotor: I - sem usar capacete de segurança com viseira ou óculos protetores: Infração - gravíssima; Penalidade - multa e suspensão do direito de dirigir; Medida administrativa - retenção do veículo até regularização; II - transportando passageiro sem o capacete de segurança: Infração - gravíssima; Penalidade - multa e suspensão do direito de dirigir; Medida administrativa - retenção do veículo até regularização; III - fazendo malabarismo ou equilibrando-se apenas em uma roda: Infração - gravíssima; Penalidade - multa e suspensão do direito de dirigir; Medida administrativa - remoção do veículo; IV - com os faróis apagados: Infração - média; Penalidade - multa; V - rebocando outro veículo: Infração - média; Penalidade - multa; Medida administrativa - retenção do veículo até regularização.",
    comments: "As motocicletas têm regras específicas muito rigorosas. O uso do capacete é obrigatório tanto para condutor quanto para passageiro, e a falta resulta em suspensão da CNH. Manobras perigosas como 'empinar' também levam à suspensão. O farol deve permanecer sempre aceso, mesmo durante o dia.",
    author: "Dr. Roberto Lima - Especialista em Legislação para Motociclistas",
    url: "https://www.ctbdigital.com.br/artigo/art244"
  },
  {
    articleNumber: "267",
    title: "Deixar o condutor ou passageiro de usar o cinto de segurança",
    content: "Deixar o condutor ou passageiro de usar o cinto de segurança, conforme previsto no art. 65: Infração - grave; Penalidade - multa; Medida administrativa - retenção do veículo até colocação do cinto pelo infrator. Parágrafo único. Deixar de observar as normas de segurança para transporte de menores de 10 (dez) anos: Infração - gravíssima; Penalidade - multa; Medida administrativa - retenção do veículo até que a irregularidade seja sanada.",
    comments: "O uso do cinto de segurança é obrigatório para todos os ocupantes do veículo. Para crianças menores de 10 anos, há regras específicas sobre cadeirinhas e assentos de elevação, cuja inobservância resulta em infração gravíssima. A retenção do veículo só é liberada após a correção da irregularidade.",
    author: "Dra. Lucia Fernandes - Especialista em Segurança Veicular",
    url: "https://www.ctbdigital.com.br/artigo/art267"
  }
];

// Função para buscar artigo mock por número
export function getMockArticleByNumber(articleNumber: string): CTBArticleMock | null {
  return ctbMockArticles.find(article => article.articleNumber === articleNumber) || null;
}

// Função para obter range de artigos mock
export function getMockArticleRange(start: number, end: number): CTBArticleMock[] {
  return ctbMockArticles.filter(article => {
    const num = parseInt(article.articleNumber);
    return num >= start && num <= end;
  });
}

// Função para obter todos os artigos mock disponíveis
export function getAllMockArticles(): CTBArticleMock[] {
  return [...ctbMockArticles];
}