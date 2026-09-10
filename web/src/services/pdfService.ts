import { jsPDF } from 'jspdf'
import type { Invoice, Project, Visit } from '../types'
import { visitTasks } from '../constants/dataSeed'
import { loadImageForPdf, loadInvoiceLogo, visitInstructions } from '../utils/helpers'

export async function downloadVisitReport(visit: Visit) {
  const pdf = new jsPDF()
  const date = new Date(visit.fecha)
  const dateText = date.toLocaleDateString('es-ES')
  const fileDate = date.toISOString().slice(0, 10)
  const safeName = `${visit.piscina}_${fileDate}`.replace(/[^a-zA-Z0-9_-]+/g, '_')

  try {
    const logo = await loadInvoiceLogo()
    pdf.addImage(logo, 'PNG', 160, 10, 28, 38)
  } catch {
    /* Logo opcional */
  }

  let y = 20
  const line = (label: string, value: string) => {
    if (y > 275) {
      pdf.addPage()
      y = 20
    }
    pdf.setFontSize(10)
    pdf.setTextColor(90, 110, 105)
    pdf.text(label, 20, y)
    pdf.setTextColor(25, 50, 54)
    pdf.text(value || '-', 75, y)
    y += 6.5
  }

  pdf.setFontSize(18)
  pdf.setTextColor(18, 61, 66)
  pdf.text('CLARITY - Reporte de Visita', 20, y)
  y += 10
  pdf.setFontSize(13)
  pdf.setTextColor(25, 50, 54)
  pdf.text(visit.piscina, 20, y)
  y += 7
  line('Fecha', dateText)
  y += 3

  pdf.setFontSize(12)
  pdf.setTextColor(18, 61, 66)
  pdf.text('Mediciones Químicas', 20, y)
  y += 7
  line('Cloro inicial', `${visit.cloroInicial} ppm`)
  line('pH inicial', String(visit.phInicial))
  line('Alcalinidad', `${visit.alcalinidadInicial} ppm`)
  line('Dureza cálcica', `${visit.durezaCalcica} ppm`)
  line('Ácido cianúrico', `${visit.acidoCianuro} ppm`)
  line('Tabletas de cloro', String(visit.chlorineTablets))
  y += 3

  pdf.setFontSize(12)
  pdf.setTextColor(18, 61, 66)
  pdf.text('Instrucciones de Tratamiento', 20, y)
  y += 7
  visitInstructions(visit).forEach(([label, instruction]) => line(label, instruction))
  y += 3

  pdf.setFontSize(12)
  pdf.setTextColor(18, 61, 66)
  pdf.text('Actividades Realizadas', 20, y)
  y += 7
  visitTasks.forEach(([key, label]) => {
    line(label, visit[key] ? '✓ Realizado' : '— No realizado')
  })

  if (visit.notas) {
    y += 3
    pdf.setFontSize(12)
    pdf.setTextColor(18, 61, 66)
    pdf.text('Notas / Observaciones', 20, y)
    y += 6
    pdf.setFontSize(9.5)
    pdf.setTextColor(25, 50, 54)
    const notes = pdf.splitTextToSize(visit.notas, 170)
    pdf.text(notes, 20, y)
    y += notes.length * 5 + 4
  }

  const rawPhotos: [string, string | undefined, number | undefined][] = [
    ['Llegada 1', visit.arrivalPhoto1, visit.arrivalPhoto1Time],
    ['Llegada 2', visit.arrivalPhoto2, visit.arrivalPhoto2Time],
    ['Salida limpieza 1', visit.afterPhoto1, visit.afterPhoto1Time],
    ['Salida limpieza 2', visit.afterPhoto2, visit.afterPhoto2Time],
    ['Salida propiedad', visit.exitPhoto, visit.exitPhotoTime]
  ]
  const validPhotos = rawPhotos.filter(([, url]) => Boolean(url)) as [string, string, number | undefined][]

  if (validPhotos.length > 0) {
    if (y > 175) {
      pdf.addPage()
      y = 20
    } else {
      y += 6
    }
    pdf.setFontSize(13)
    pdf.setTextColor(18, 61, 66)
    pdf.text('Registro Fotográfico', 20, y)
    y += 8

    const imgWidth = 80
    const imgHeight = 60
    const colSpacing = 10
    const startX = 20

    for (let i = 0; i < validPhotos.length; i++) {
      const [label, photoUrl, photoTime] = validPhotos[i]
      const col = i % 2
      const x = startX + col * (imgWidth + colSpacing)

      if (col === 0 && i > 0) {
        y += imgHeight + 14
      }

      if (y + imgHeight + 12 > 280) {
        pdf.addPage()
        y = 20
      }

      const timeText = photoTime ? ` (${new Date(photoTime).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })})` : ''
      pdf.setFontSize(9.5)
      pdf.setTextColor(90, 110, 105)
      pdf.text(`${label}${timeText}`, x, y)
      try {
        const img = await loadImageForPdf(photoUrl)
        pdf.addImage(img.dataUrl, 'JPEG', x, y + 2, imgWidth, imgHeight)
      } catch {
        pdf.setFontSize(8.5)
        pdf.setTextColor(180, 50, 50)
        pdf.text('(No disponible)', x, y + 10)
      }
    }
  }

  pdf.save(`${safeName}.pdf`)
}

export async function downloadInvoicePdf(invoice: Invoice) {
  const pdf = new jsPDF()
  const money = (value: number) => `CRC ${value.toLocaleString('es-CR')}`
  const drawMoney = (value: number, x: number, y: number) => pdf.text(money(value), x, y)
  const dueDate = new Date(invoice.fecha)
  dueDate.setMonth(dueDate.getMonth() + 1, 3)

  try {
    pdf.addImage(await loadInvoiceLogo(), 'PNG', 158, 10, 28, 38)
  } catch {
    /* El PDF sigue siendo válido aunque el logo no cargue. */
  }

  pdf.setFont('times', 'bold')
  pdf.setFontSize(18)
  pdf.text('Electronic Receipt', 24, 24)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text('Issuer:', 24, 40)
  pdf.text('Clarity Solutions Company', 58, 40)
  pdf.text('Business Activity:', 24, 48)
  pdf.text('Professional Pool Maintenance', 112, 48)
  pdf.text('Client:', 24, 64)
  pdf.text(invoice.owner, 58, 64)
  pdf.text('Pool:', 24, 72)
  pdf.text(invoice.poolName, 58, 72)
  pdf.text('Date:', 24, 80)
  pdf.text(new Date(invoice.fecha).toLocaleDateString('en-US'), 58, 80)
  pdf.text('Sale Condition:', 24, 88)
  pdf.text('Cash', 92, 88)

  pdf.setDrawColor(150)
  pdf.line(24, 98, 186, 98)

  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.text('Service Details', 24, 114)
  pdf.setFontSize(10)
  pdf.rect(24, 122, 162, 42)
  pdf.line(132, 122, 132, 164)
  pdf.line(164, 122, 164, 164)
  pdf.text('Description', 74, 130)
  pdf.text('Quantity', 136, 130)
  pdf.text('Unit', 170, 130)
  pdf.text('Price', 170, 138)

  pdf.setFont('times', 'normal')
  pdf.text('Monthly pool maintenance service according to proposal', 27, 148)
  pdf.text('(1 weekly visit, full cleaning, brushing, water parameter', 27, 155)
  pdf.text('check, supply and application of chemicals, basic equipment inspection).', 27, 162)
  pdf.text('1', 138, 148)
  drawMoney(invoice.subtotal, 168, 148)

  pdf.setDrawColor(150)
  pdf.line(24, 174, 186, 174)

  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.text('Summary', 24, 190)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text('•  Subtotal:', 30, 202)
  drawMoney(invoice.subtotal, 70, 202)
  pdf.text('•  IVA (' + (invoice.facturaElectronica ? '13' : '0') + '%):', 30, 212)
  drawMoney(invoice.iva, 76, 212)
  pdf.text('•  Total Due:', 30, 222)
  drawMoney(invoice.total, 76, 222)

  pdf.setDrawColor(150)
  pdf.line(24, 234, 186, 234)

  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.text('Notes', 24, 250)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text('Service corresponding to the monthly pool maintenance plan for', 24, 264)
  pdf.setFont('times', 'bold')
  pdf.text(invoice.periodo + '.', 24, 274)
  pdf.text('Payment Due Date:', 24, 288)
  pdf.setFont('times', 'normal')
  pdf.text(dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.', 76, 288)

  pdf.save(invoice.poolName + '_' + invoice.periodo.replace(/\s+/g, '_') + '.pdf')
}

export async function downloadProjectPdf(project: Project) {
  const pdf = new jsPDF()
  const money = (v: number) => 'CRC ' + v.toLocaleString('es-CR')
  const totalCost = project.items.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
  const basePrice = project.suggestedPrice || totalCost
  const ivaAmount = project.facturaElectronica ? basePrice * 0.13 : 0
  const finalTotal = basePrice + ivaAmount

  pdf.setFont('times', 'bold')
  pdf.setFontSize(18)
  pdf.text('COTIZACIÓN DE PROYECTO', 24, 24)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text('Issuer:', 24, 40)
  pdf.text('Clarity Solutions Company', 65, 40)
  pdf.text('Business Activity:', 24, 48)
  pdf.text('Professional Pool Services & Construction', 65, 48)
  pdf.text('Cliente / Atención:', 24, 64)
  pdf.text(project.clientName, 65, 64)
  pdf.text('Proyecto:', 24, 72)
  pdf.text(project.title, 65, 72)
  if (project.location) {
    pdf.text('Ubicación:', 24, 80)
    pdf.text(project.location, 65, 80)
  }
  pdf.text('Fecha de emisión:', 24, 88)
  pdf.text(new Date(project.fecha).toLocaleDateString('es-CR'), 65, 88)
  if (project.fechaVencimiento) {
    pdf.text('Válida hasta:', 24, 96)
    pdf.text(new Date(project.fechaVencimiento).toLocaleDateString('es-CR'), 65, 96)
  }
  try {
    pdf.addImage(await loadInvoiceLogo(), 'PNG', 158, 10, 28, 38)
  } catch {}

  const lineY = project.fechaVencimiento ? 104 : 98
  pdf.setDrawColor(150)
  pdf.line(24, lineY, 186, lineY)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.text('Desglose de Trabajos y Equipamiento', 24, lineY + 16)

  let y = lineY + 28
  pdf.setFontSize(10)
  project.items.forEach((item, index) => {
    if (y > 250) {
      pdf.addPage()
      y = 24
    }
    pdf.setFont('times', 'bold')
    pdf.text((index + 1) + '.', 24, y)
    pdf.setFont('times', 'normal')
    const lines = pdf.splitTextToSize(item.description, 115)
    pdf.text(lines, 32, y)
    pdf.text(money(item.price), 155, y)
    y += (lines.length * 6) + 4
  })

  pdf.setDrawColor(150)
  pdf.line(24, y + 4, 186, y + 4)
  y += 16
  pdf.setFont('times', 'bold')
  pdf.setFontSize(13)
  pdf.text('Resumen de Inversión', 24, y)
  y += 10
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text('•  Total de ítems / Mano de obra:', 30, y)
  pdf.text(money(totalCost), 130, y)
  y += 8
  if (project.suggestedPrice) {
    pdf.text('•  Precio Sugerido / Cotización:', 30, y)
    pdf.text(money(project.suggestedPrice), 130, y)
    y += 8
  }
  if (project.facturaElectronica) {
    pdf.text('•  IVA (' + (project.facturaElectronica ? '13' : '0') + '%):', 30, y)
    pdf.text(money(ivaAmount), 130, y)
    y += 8
    pdf.text('•  Monto Total con IVA:', 30, y)
    pdf.text(money(finalTotal), 130, y)
    y += 8
  }
  if (project.expectedProfit) {
    pdf.text('•  Ganancia Estimada (Interno):', 30, y)
    pdf.text(money(project.expectedProfit), 130, y)
    y += 8
  }

  if (project.notes) {
    y += 10
    pdf.setFont('times', 'bold')
    pdf.setFontSize(13)
    pdf.text('Notas y Observaciones', 24, y)
    y += 8
    pdf.setFont('times', 'normal')
    pdf.setFontSize(10)
    const noteLines = pdf.splitTextToSize(project.notes, 160)
    pdf.text(noteLines, 24, y)
  }

  const safeName = project.clientName.replace(/[^a-zA-Z0-9_-]+/g, '_')
  pdf.save('Cotizacion_' + safeName + '_' + project.title.slice(0, 15) + '.pdf')
}
