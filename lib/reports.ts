export type ReportSection = {
  id: string
  title: string
  columns: string[]
  rows: (string | number)[][]
}

export type ReportFormat = 'xlsx' | 'pptx' | 'docx'
const title = 'گزارش منابع انسانی الکتروکویر'
const footer = 'داده‌های نمایشی · دیدار'

export async function exportReport(format: ReportFormat, sections: ReportSection[]) {
  const filename = 'didar-hr-report.' + format

  if (format === 'xlsx') {
    const { Workbook } = (await import('exceljs')).default
    const workbook = new Workbook()
    workbook.title = title
    for (const section of sections) {
      const sheet = workbook.addWorksheet(section.title, { views: [{ state: 'frozen', ySplit: 3, rightToLeft: true }] })
      sheet.addRow([section.title])
      sheet.addRow([footer])
      sheet.addRow(section.columns)
      sheet.addRows(section.rows)
      sheet.columns.forEach(column => { column.width = 24 })
      sheet.getRow(3).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4E416E' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      })
      if (section.rows.length) sheet.autoFilter = { from: 'A3', to: { row: 3, column: section.columns.length } }
    }
    const data = await workbook.xlsx.writeBuffer()
    download(new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
    return
  }

  if (format === 'pptx') {
    const { default: PptxGenJS } = await import('pptxgenjs')
    const presentation = new PptxGenJS()
    presentation.layout = 'LAYOUT_WIDE'
    presentation.title = title
    presentation.rtlMode = true
    for (const section of sections) {
      const pageSize = 11
      const pages = Math.max(1, Math.ceil(section.rows.length / pageSize))
      for (let page = 0; page < pages; page++) {
        const slide = presentation.addSlide()
        slide.background = { color: '181B2A' }
        slide.addText(section.title, { x: .55, y: .45, w: 12.2, h: .55, align: 'right', rtlMode: true, color: 'F4EEFF', fontFace: 'Tahoma', fontSize: 28, bold: true })
        slide.addText(footer + (pages > 1 ? ' · ' + (page + 1) + ' / ' + pages : ''), { x: .6, y: 1.1, w: 12, h: .35, align: 'right', rtlMode: true, color: 'C9BDE8', fontSize: 12 })
        const rows = section.rows.slice(page * pageSize, (page + 1) * pageSize)
        const header = [...section.columns].reverse().map(text => ({ text, options: { fill: { color: '5E487C' }, bold: true } }))
        slide.addTable([header, ...rows.map(row => [...row].reverse().map(value => ({ text: String(value) })))], {
          x: .65, y: 1.65, w: 12, rowH: .41, fontSize: 12, align: 'right',
          fontFace: 'Tahoma', color: 'F5F1FF', fill: { color: '272C43' }, border: { color: '58546F', pt: .5 },
        })
      }
    }
    await presentation.writeFile({ fileName: filename })
    return
  }

  const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType } = await import('docx')
  const paragraph = (text: string, heading?: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2) =>
    new Paragraph({ text, heading, bidirectional: true, alignment: AlignmentType.RIGHT })
  const document = new Document({
    title,
    sections: [{
      children: [
        paragraph(title, HeadingLevel.HEADING_1), paragraph(footer),
        ...sections.flatMap(section => [
          paragraph(section.title, HeadingLevel.HEADING_2),
          new Table({
            visuallyRightToLeft: true, width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [section.columns, ...section.rows].map((row, index) => new TableRow({
              tableHeader: index === 0,
              children: row.map(value => new TableCell({
                shading: index === 0 ? { fill: 'E2D8F2' } : undefined,
                children: [paragraph(String(value))],
              })),
            })),
          }),
        ]),
      ],
    }],
  })
  download(await Packer.toBlob(document), filename)
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
