import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export async function generatePreviewUrl(form: any): Promise<string> {
  const existingPdfBytes = await fetch("/CAV_Template.pdf").then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pages = pdfDoc.getPages()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const formatDate = (date: string) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const formatFullDateParts = (dateString: string) => {
    if (!dateString) return { sentence: "" }
    const date = new Date(dateString)
    const day = date.getDate()
    const year = date.getFullYear()
    const month = date.toLocaleString("en-US", { month: "long" })
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return n + "th"
      switch (n % 10) {
        case 1: return n + "st"
        case 2: return n + "nd"
        case 3: return n + "rd"
        default: return n + "th"
      }
    }
    return { sentence: `${getOrdinal(day)} day        ${month}        ${year}` }
  }

  const name = (form.full_legal_name ?? "").toUpperCase()
  const { sentence } = formatFullDateParts(form.date_issued)

  let fontSize = 11
  const maxWidth = 120
  let textWidth = boldFont.widthOfTextAtSize(name, fontSize)
  while (textWidth > maxWidth && fontSize > 9) {
    fontSize -= 0.5
    textWidth = boldFont.widthOfTextAtSize(name, fontSize)
  }

  const p1 = pages[0]
  if (name) p1.drawText(name, { x: 340, y: 646, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (name) p1.drawText(name, { x: 120, y: 493, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (sentence) p1.drawText(sentence, { x: 291, y: 505, size: 10, font: boldFont })

  const p2 = pages[1]
  if (name) p2.drawText(name, { x: 137, y: 689, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.date_of_application) p2.drawText(formatDate(form.date_of_application), { x: 257, y: 758, size: 12, font: boldFont })

  const p3 = pages[2]
  if (form.control_no) p3.drawText(form.control_no, { x: 100, y: 697, size: 10, font })
  if (name) p3.drawText(name, { x: 180, y: 697, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.date_of_application) p3.drawText(formatDate(form.date_of_application), { x: 325, y: 697, size: 12, font })
  if (form.date_of_transmission) p3.drawText(formatDate(form.date_of_transmission), { x: 450, y: 697, size: 12, font })

  const p4 = pages[3]
  if (name) p4.drawText(name, { x: 285, y: 675, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.school_name) p4.drawText(form.school_name, { x: 270, y: 605, size: fontSize, font: boldFont })
  if (form.school_address) p4.drawText(form.school_address, { x: 270, y: 590, size: fontSize, font: boldFont })
  if (form.school_year_completed) p4.drawText(form.school_year_completed, { x: 270, y: 570, size: 12, font: boldFont })
  if (form.school_year_graduated) p4.drawText(formatDate(form.school_year_graduated), { x: 270, y: 555, size: 12, font: boldFont })
  if (sentence) p4.drawText(sentence, { x: 291, y: 450, size: 10, font: boldFont })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
  return URL.createObjectURL(blob)
}