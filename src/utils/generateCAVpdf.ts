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

export async function generateCavPDF(form: any) {
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

  const existingPdfBytes = await fetch("/CAV_Format.pdf").then(res => res.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pages = pdfDoc.getPages()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const name = (form.full_legal_name ?? "").toUpperCase()
  const { ordinal, month, year } = formatFullDateParts(form.date_issued)

  let fontSize = 11
  const maxWidth = 190
  while (boldFont.widthOfTextAtSize(name, fontSize) > maxWidth && fontSize > 7) fontSize -= 0.5

  // --- Page 1 (CAV Form 4) ---
  const p1 = pages[0]
  drawCentered(p1, name, 391.5, 652, fontSize, boldFont)
  drawCentered(p1, name, 179.2, 500, fontSize, boldFont)
  drawCentered(p1, ordinal, 299, 513, 10, boldFont)
  drawCentered(p1, month, 379.8, 513, 10, boldFont)
  drawCentered(p1, year, 431.8, 513, 10, boldFont)
  drawCentered(p1, submitName, 440, 350, fontSize, boldFont)
  drawCentered(p1, submitPosition, 440, 335, 10, boldFont)

  // --- Page 2 (CAV Form 5) ---
  const p2 = pages[1]
  drawCentered(p2, name, 194, 688, fontSize, boldFont)
  drawCentered(p2, formatDate(form.date_of_application), 306, 757, 11, boldFont)
  drawCentered(p2, submitName, 440, 350, fontSize, boldFont)
  drawCentered(p2, submitPosition, 440, 335, 10, boldFont)

  // --- Page 3 (Transmittal table) ---
  const p3 = pages[2]
  drawCentered(p3, form.control_no, 126, 718, 10, font)
  drawCentered(p3, name, 246, 718, fontSize, boldFont)
  drawCentered(p3, formatDate(form.date_of_application), 392.5, 718, 10, font)
  drawCentered(p3, formatDate(form.date_of_transmission), 499.5, 718, 10, font)
  drawCentered(p3, prepareName, 240, 535, fontSize, boldFont)
  drawCentered(p3, preparePosition, 240, 520, 10, boldFont)
  drawCentered(p3, submitName, 421.6, 390, fontSize, boldFont)
  drawCentered(p3, submitPosition, 421.6, 375, 10, boldFont)

  const p4 = pages[3]
  drawCentered(p4, name, 328.5, 661, fontSize, boldFont)
  if (form.school_name) p4.drawText(form.school_name, { x: 270, y: 589, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.school_address) p4.drawText(form.school_address, { x: 270, y: 571, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.school_year_completed) p4.drawText(form.school_year_completed, { x: 270, y: 554, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  if (form.school_year_graduated) p4.drawText(formatDate(form.school_year_graduated), { x: 270, y: 537, size: 11, font: boldFont, color: rgb(0, 0, 0) })
  drawCentered(p4, ordinal, 309, 433, 10, boldFont)
  drawCentered(p4, month, 374.7, 433, 10, boldFont)
  drawCentered(p4, year, 430.7, 433, 10, boldFont)
  drawCentered(p4, submitName, 421.6, 290, fontSize, boldFont)
  drawCentered(p4, submitPosition, 421.6, 275, 10, boldFont)

  const pdfBytes: Uint8Array = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
  window.open(URL.createObjectURL(blob), "_blank")
}