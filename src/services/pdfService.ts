import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface RecursoData {
  fundamentacao: string
  observacoes?: string
}

export interface MultaData {
  numero_auto: string
  data_infracao: string
  horario_infracao?: string
  local_infracao: string
  codigo_infracao: string
  descricao_infracao: string
  valor_multa: number
  placa_veiculo: string
  orgao_autuador?: string
}

export interface ClienteData {
  nome: string
  cpf_cnpj: string
  endereco?: string
  email?: string
  telefone?: string
}

export interface RecursoPDFData {
  recurso: RecursoData
  multa: MultaData
  cliente: ClienteData
}

class PDFService {
  private doc!: jsPDF
  private pageWidth!: number
  private pageHeight!: number
  private margin = 20
  private yPosition = 30
  private lineHeight = 6
  private sectionSpacing = 15
  private bottomMargin = 30



  private checkPageBreak(requiredSpace: number): void {
    if (this.yPosition + requiredSpace > this.pageHeight - this.bottomMargin) {
      this.doc.addPage()
      this.yPosition = 30
    }
  }

  private addTitle(text: string, fontSize: number = 18): void {
    this.checkPageBreak(fontSize + 10)
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.pageWidth / 2, this.yPosition, { align: 'center' })
    this.yPosition += fontSize + 10
  }

  private addSectionHeader(text: string, fontSize: number = 14): void {
    this.checkPageBreak(fontSize + 10)
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.yPosition)
    this.yPosition += fontSize
  }

  private addText(text: string, fontSize: number = 10, bold: boolean = false): void {
    this.checkPageBreak(this.lineHeight + 2)
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.text(text, this.margin, this.yPosition)
    this.yPosition += this.lineHeight
  }

  private addMultilineText(text: string, fontSize: number = 10, bold: boolean = false): void {
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    
    const splitText = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin)
    const textHeight = splitText.length * this.lineHeight
    
    // Verificar se o texto inteiro cabe na página atual
    if (this.yPosition + textHeight > this.pageHeight - this.bottomMargin) {
      // Se não cabe, verificar se pelo menos algumas linhas cabem
      const availableSpace = this.pageHeight - this.bottomMargin - this.yPosition
      const linesThatFit = Math.floor(availableSpace / this.lineHeight)
      
      if (linesThatFit > 0) {
        // Adicionar as linhas que cabem na página atual
        const textThatFits = splitText.slice(0, linesThatFit)
        this.doc.text(textThatFits, this.margin, this.yPosition)
        
        // Adicionar nova página e continuar com o resto do texto
        this.doc.addPage()
        this.yPosition = 30
        
        const remainingText = splitText.slice(linesThatFit)
        if (remainingText.length > 0) {
          this.doc.text(remainingText, this.margin, this.yPosition)
          this.yPosition += remainingText.length * this.lineHeight
        }
      } else {
        // Se nenhuma linha cabe, adicionar nova página
        this.doc.addPage()
        this.yPosition = 30
        this.doc.text(splitText, this.margin, this.yPosition)
        this.yPosition += textHeight
      }
    } else {
      // Se cabe tudo na página atual
      this.doc.text(splitText, this.margin, this.yPosition)
      this.yPosition += textHeight
    }
  }

  private addSpacing(space: number = 10): void {
    this.yPosition += space
  }

  private addFooter(): void {
    const currentPage = this.doc.getCurrentPageInfo().pageNumber
    const totalPages = this.doc.getNumberOfPages()
    
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'italic')
    
    // Data e hora de geração
    const dateTime = `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
    this.doc.text(dateTime, this.margin, this.pageHeight - 20)
    
    // Número da página
    const pageInfo = `Página ${currentPage} de ${totalPages}`
    this.doc.text(pageInfo, this.pageWidth - this.margin, this.pageHeight - 20, { align: 'right' })
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  private formatCpfCnpj(cpfCnpj: string): string {
    const numbers = cpfCnpj.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return cpfCnpj
  }

  generateRecursoPDF(data: RecursoPDFData): void {
    const { recurso, multa, cliente } = data
    
    // Criar novo documento PDF
    this.doc = new jsPDF()
    this.pageWidth = this.doc.internal.pageSize.width
    this.pageHeight = this.doc.internal.pageSize.height
    this.yPosition = 30
    
    // Cabeçalho
    this.addText('AO DEPARTAMENTO NACIONAL DE INFRAESTRUTURA DE TRANSPORTES', 12, true)
    this.addSpacing(20)
    
    // Título
    this.addTitle('DEFESA PRÉVIA')
    this.addText(`Auto de Infração nº ${multa.numero_auto}`, 12, true)
    this.addSpacing(20)
    
    // Identificação do Requerente
    this.addSectionHeader('IDENTIFICAÇÃO DO REQUERENTE:')
    this.addText(`Nome: ${cliente.nome}`, 11)
    this.addText('Qualidade: Proprietário/Condutor do veículo', 11)
    if (cliente.cpf_cnpj) {
      this.addText(`CPF/CNPJ: ${this.formatCpfCnpj(cliente.cpf_cnpj)}`, 11)
    }
    if (cliente.endereco) {
      this.addText(`Endereço: ${cliente.endereco}`, 11)
    }
    this.addSpacing(15)
    
    // Identificação do Veículo
    this.addSectionHeader('IDENTIFICAÇÃO DO VEÍCULO:')
    this.addText(`Placa: ${multa.placa_veiculo}`, 11)
    this.addSpacing(15)
    
    // Dados da Autuação
    this.addSectionHeader('DADOS DA AUTUAÇÃO:')
    this.addText(`Auto de Infração: ${multa.numero_auto}`, 11)
    this.addText(`Data da Infração: ${this.formatDate(multa.data_infracao)}`, 11)
    if (multa.horario_infracao) {
      this.addText(`Horário: ${multa.horario_infracao}`, 11)
    }
    this.addText(`Local: ${multa.local_infracao}`, 11)
    this.addText(`Código da Infração: ${multa.codigo_infracao}`, 11)
    this.addText(`Descrição: ${multa.descricao_infracao}`, 11)
    this.addText(`Valor da Multa: ${this.formatCurrency(multa.valor_multa)}`, 11)
    if (multa.orgao_autuador) {
      this.addText(`Agente Autuador: ${multa.orgao_autuador}`, 11)
    }
    this.addSpacing(20)
    
    // Argumentação
    this.addSectionHeader('ARGUMENTAÇÃO:')
    this.addSpacing(5)
    this.addMultilineText('Venho, respeitosamente, apresentar DEFESA PRÉVIA ao Auto de Infração em epígrafe, alegando irregularidades no processo de autuação que comprometem a validade do ato administrativo.', 11)
    this.addSpacing(10)
    this.addMultilineText('Após análise do auto de infração, verifico a existência de vícios que maculam sua validade, devendo ser arquivado por não atender aos requisitos legais estabelecidos pelo Código de Trânsito Brasileiro.', 11)
    this.addSpacing(15)
    
    // Fundamentação Legal
    this.addSectionHeader('FUNDAMENTAÇÃO LEGAL:')
    this.addSpacing(5)
    this.addMultilineText(recurso.fundamentacao, 11)
    this.addSpacing(15)
    
    // Pedido
    this.addSectionHeader('PEDIDO:')
    this.addSpacing(5)
    this.addMultilineText('Diante do exposto, REQUER-SE:', 11)
    this.addSpacing(5)
    this.addText(`a) O recebimento da presente defesa prévia;`, 11)
    this.addText(`b) O ARQUIVAMENTO do Auto de Infração nº ${multa.numero_auto} por vício insanável;`, 11)
    this.addText(`c) A não aplicação da penalidade de multa no valor de ${this.formatCurrency(multa.valor_multa)}.`, 11)
    this.addSpacing(10)
    this.addText('Termos em que pede deferimento.', 11)
    this.addSpacing(30)
    
    // Local e Data
    const hoje = new Date()
    this.addText(`Local e Data: _________________, ${hoje.toLocaleDateString('pt-BR')}`, 11)
    this.addSpacing(30)
    
    // Assinatura
    this.addText('_________________________________', 11)
    this.addText(cliente.nome, 11, true)
    this.addText('Requerente', 11)
    
    // Observações (se houver)
    if (recurso.observacoes) {
      this.addSpacing(20)
      this.addSectionHeader('OBSERVAÇÕES:')
      this.addSpacing(5)
      this.addMultilineText(recurso.observacoes, 11)
    }
    
    // Adicionar rodapé em todas as páginas
    const totalPages = this.doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.addFooter()
    }
    
    // Salvar o PDF
    const fileName = `defesa_previa_${multa.numero_auto}_${new Date().getTime()}.pdf`
    this.doc.save(fileName)
  }
}

export const pdfService = new PDFService()
export default pdfService