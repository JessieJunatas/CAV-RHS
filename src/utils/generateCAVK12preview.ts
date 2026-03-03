import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib"

function drawCentered(
  page: PDFPage,
  text: string | undefined,
  centerX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = rgb(0, 0, 0)
) {
  if (!text) return
  const x = centerX - font.widthOfTextAtSize(text, size) / 2
  page.drawText(text, { x, y, size, font, color })
}

function formatDate(date: string) {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function formatFullDateParts(dateString: string) {
  if (!dateString) return { ordinal: "", month: "", year: "" }
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
  return { ordinal: getOrdinal(day), month, year: String(year) }
}

export async function generateK12PreviewUrl(
  form: any,
  preparedOptions: { id: string; full_name: string; position: string }[],
  submittedOptions: { id: string; full_name: string; position: string }[]
): Promise<string> {
  const existingPdfBytes = await fetch("/CAV_Format_K-12.pdf").then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pages = pdfDoc.getPages()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const prep = preparedOptions.find(p => p.id === form.prepared_by)
  const sub = submittedOptions.find(s => s.id === form.submitted_by)
  const prepareName = prep?.full_name.toUpperCase() ?? ""
  const preparePosition = prep?.position ?? ""
  const submitName = sub?.full_name.toUpperCase() ?? ""
  const submitPosition = sub?.position ?? ""
  const today = new Date().toISOString()

  const name = (form.full_legal_name ?? "").toUpperCase()
  const lrn = (form.lrn ?? "").trim()
  const { ordinal, month, year } = formatFullDateParts(form.date_issued)

  let fontSize = 11
  const maxWidth = 125
  while (boldFont.widthOfTextAtSize(name, fontSize) > maxWidth && fontSize > 9) fontSize -= 0.5

  const p1 = pages[0]
  drawCentered(p1, form.control_no, 126, 640, 11, font)
  drawCentered(p1, name, 236, 640, fontSize, boldFont)
  if (lrn) p1.drawText(lrn, { x: 204, y: 687, size: 11, font, color: rgb(0, 0, 0) })
  drawCentered(p1, formatDate(form.date_of_application), 378.5, 640, 11, font)
  drawCentered(p1, formatDate(form.date_of_transmission), 499.5, 640, 11, font)
  if (prepareName) p1.drawText(prepareName, { x: 92, y: 510, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (preparePosition) p1.drawText(preparePosition, { x: 92, y: 495, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  drawCentered(p1, submitName, 421.6, 390, fontSize, boldFont)
  drawCentered(p1, submitPosition, 421.6, 375, 10, boldFont)

  // ── Page 2 ──
  const p2 = pages[1]
  drawCentered(p2, formatDate(today), 306, 712, fontSize, boldFont)
  drawCentered(p2, name, 180, 640, fontSize, boldFont)
  drawCentered(p2, lrn, 170, 610, fontSize, boldFont)
  drawCentered(p2, submitName, 440, 350, fontSize, boldFont)
  drawCentered(p2, submitPosition, 440, 335, 10, boldFont)

  // ── Page 3 ──
  const p3 = pages[2]
  drawCentered(p3, name, 380, 665, fontSize, boldFont)
  drawCentered(p3, lrn, 230, 647, fontSize, boldFont)

  const enrolledGrade = (form.enrolled_grade ?? "").trim()
  const enrolledSY = (form.enrolled_sy ?? "").trim()
  if (enrolledGrade || enrolledSY) {
    p3.drawText("X", { x: 132, y: 611, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (enrolledGrade) p3.drawText(enrolledGrade, { x: 215, y: 611, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (enrolledSY) p3.drawText(enrolledSY, { x: 390, y: 611, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  const completedGrade = (form.status_completed_grade ?? "").trim()
  const completedSY = (form.status_completed_sy ?? "").trim()
  if (completedGrade || completedSY) {
    p3.drawText("X", { x: 132, y: 585, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (completedGrade) p3.drawText(completedGrade, { x: 215, y: 585, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (completedSY) p3.drawText(completedSY, { x: 390, y: 585, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  const graduatedSY = (form.status_graduated_sy ?? "").trim()
  if (graduatedSY) {
    p3.drawText("X", { x: 132, y: 559, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    p3.drawText(graduatedSY, { x: 150, y: 534, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  drawCentered(p3, ordinal, 305, 500, 10, boldFont)
  drawCentered(p3, month, 400, 500, 10, boldFont)
  drawCentered(p3, year, 470, 500, 10, boldFont)
  drawCentered(p3, name, 260, 480, fontSize, boldFont)
  drawCentered(p3, submitName, 421.6, 350, fontSize, boldFont)
  drawCentered(p3, submitPosition, 421.6, 335, 10, boldFont)

  // ── Page 4 ──
  const p4 = pages[3]
  drawCentered(p4, name, 310, 658, fontSize, boldFont)
  drawCentered(p4, lrn, 185, 640, fontSize, boldFont)
  if (form.school_year_completed) {
    p4.drawText(form.school_year_completed, { x: 307, y: 550, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  }
  if (form.school_year_graduated) {
    p4.drawText(formatDate(form.school_year_graduated), { x: 307, y: 532, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  }
  drawCentered(p4, ordinal, 295, 426, 10, boldFont)
  drawCentered(p4, month, 385, 426, 10, boldFont)
  drawCentered(p4, year, 465, 426, 10, boldFont)
  drawCentered(p4, submitName, 421.6, 290, fontSize, boldFont)
  drawCentered(p4, submitPosition, 421.6, 275, 10, boldFont)

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
  return URL.createObjectURL(blob)
}