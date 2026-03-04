import { supabase } from "@/lib/supabase"
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

function buildPdfFileName(fullName: string, date: Date) {
  const safeName = fullName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${safeName}_K12_${yyyy}-${mm}-${dd}.pdf`
}

export async function generateCavK12PDF(form: any) {
  let prepareName = ""
  let preparePosition = ""
  let submitName = ""
  let submitPosition = ""

  if (form.prepared_by) {
    const { data: prepData } = await supabase
      .from("signatories").select("full_name, position").eq("id", form.prepared_by).single()
    if (prepData) {
      prepareName = prepData.full_name.toUpperCase()
      preparePosition = prepData.position
    }
  }

  if (form.submitted_by) {
    const { data: subData } = await supabase
      .from("signatories").select("full_name, position").eq("id", form.submitted_by).single()
    if (subData) {
      submitName = subData.full_name.toUpperCase()
      submitPosition = subData.position
    }
  }

  const existingPdfBytes = await fetch("/CAV_Format_K-12.pdf").then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pages = pdfDoc.getPages()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const today = new Date().toISOString()

  const name = (form.full_legal_name ?? "").toUpperCase()
  const lrn = (form.lrn ?? "").trim()
  const { ordinal, month, year } = formatFullDateParts(form.date_issued)

  let fontSize = 11
  const maxWidth = 125
  while (boldFont.widthOfTextAtSize(name, fontSize) > maxWidth && fontSize > 7) fontSize -= 0.5

  const p1 = pages[0]
  drawCentered(p1, form.control_no, 126, 727, 11, font)
  drawCentered(p1, name, 236, 727, fontSize, boldFont)
  if (lrn) p1.drawText(lrn, { x: 204, y: 694, size: 11, font, color: rgb(0, 0, 0) })
  drawCentered(p1, formatDate(form.date_of_application), 378.5, 727, 11, font)
  drawCentered(p1, formatDate(form.date_of_transmission), 499.5, 727, 11, font)
  if (prepareName) p1.drawText(prepareName, { x: 92, y: 510, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  drawCentered(p1, preparePosition, 150, 495, 9, boldFont)
  drawCentered(p1, submitName, 421.6, 390, fontSize, boldFont)
  drawCentered(p1, submitPosition, 421.6, 375, 10, boldFont)

  const p2 = pages[1]
  drawCentered(p2, formatDate(today), 306, 712, fontSize, boldFont)
  drawCentered(p2, name, 200, 647, fontSize, boldFont)
  drawCentered(p2, lrn, 200, 618, fontSize, boldFont)
  drawCentered(p2, submitName, 440, 350, fontSize, boldFont)
  drawCentered(p2, submitPosition, 440, 335, 10, boldFont)

  const p3 = pages[2]
  drawCentered(p3, name, 380, 671, fontSize, boldFont)
  drawCentered(p3, lrn, 200, 651, fontSize, boldFont)

  const enrolledGrade = (form.enrolled_grade ?? "").trim()
  const enrolledSY = (form.enrolled_sy ?? "").trim()
  if (enrolledGrade || enrolledSY) {
    p3.drawText("X", { x: 132, y: 619, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (enrolledGrade) p3.drawText(enrolledGrade, { x: 215, y: 619, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (enrolledSY) p3.drawText(enrolledSY, { x: 390, y: 619, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  const completedGrade = (form.status_completed_grade ?? "").trim()
  const completedSY = (form.status_completed_sy ?? "").trim()
  if (completedGrade || completedSY) {
    p3.drawText("X", { x: 132, y: 594, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (completedGrade) p3.drawText(completedGrade, { x: 215, y: 594, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    if (completedSY) p3.drawText(completedSY, { x: 390, y: 594, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  const graduatedSY = (form.status_graduated_sy ?? "").trim()
  if (graduatedSY) {
    p3.drawText("X", { x: 132, y: 568, size: 10, font: boldFont, color: rgb(0, 0, 0) })
    p3.drawText(graduatedSY, { x: 213, y: 543, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  }

  drawCentered(p3, ordinal, 305, 507, 10, boldFont)
  drawCentered(p3, month, 400, 507, 10, boldFont)
  drawCentered(p3, year, 470, 507, 10, boldFont)
  drawCentered(p3, name, 260, 487, fontSize, boldFont)
  drawCentered(p3, submitName, 421.6, 350, fontSize, boldFont)
  drawCentered(p3, submitPosition, 421.6, 335, 10, boldFont)


  const p4 = pages[3]
  drawCentered(p4, name, 310, 662, fontSize, boldFont)
  drawCentered(p4, lrn, 185, 648, fontSize, boldFont)
  if (form.school_year_completed) {
    p4.drawText(form.school_year_completed, { x: 307, y: 555, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  }
  if (form.school_year_graduated) {
    p4.drawText(formatDate(form.school_year_graduated), { x: 307, y: 538, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  }
  drawCentered(p4, ordinal, 295, 434, 10, boldFont)
  drawCentered(p4, month, 385, 434, 10, boldFont)
  drawCentered(p4, year, 455, 434, 10, boldFont)
  drawCentered(p4, submitName, 421.6, 290, fontSize, boldFont)
  drawCentered(p4, submitPosition, 421.6, 275, 10, boldFont)

  const issuedDate = form.date_issued ? new Date(form.date_issued) : new Date()
  const yyyy = issuedDate.getFullYear()
  const mm = String(issuedDate.getMonth() + 1).padStart(2, "0")
  const dd = String(issuedDate.getDate()).padStart(2, "0")
  const title = `${name} - CAV K-12 - ${yyyy}-${mm}-${dd}`

  pdfDoc.setTitle(title)
  pdfDoc.setAuthor("Rizal High School")
  pdfDoc.setSubject("Certification, Authentication and Verification — K-12")
  pdfDoc.setCreator("RHS Auto-Forms System")

  const pdfBytes: Uint8Array = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
  const fileName = buildPdfFileName(form.full_legal_name ?? "Student", new Date())
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}