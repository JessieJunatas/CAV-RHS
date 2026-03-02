import { supabase } from "@/lib/supabase"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

function formatDate(date: string) {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatFullDateParts(dateString: string) {
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

export async function generateCavPDF(form: any) {
  let prepareName = ""
  let preparePosition = ""
  let submitName = ""
  let submitPosition = ""

  if (form.prepared_by) {
    const { data: prepData } = await supabase
      .from("signatories")
      .select("full_name, position")
      .eq("id", form.prepared_by)
      .single()
    if (prepData) {
      prepareName = prepData.full_name.toUpperCase()
      preparePosition = prepData.position
    }
  }

  if (form.submitted_by) {
    const { data: subData } = await supabase
      .from("signatories")
      .select("full_name, position")
      .eq("id", form.submitted_by)
      .single()
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
  const { sentence } = formatFullDateParts(form.date_issued)

  let fontSize = 11
  const maxWidth = 120
  let textWidth = boldFont.widthOfTextAtSize(name, fontSize)
  while (textWidth > maxWidth && fontSize > 9) {
    fontSize -= 0.5
    textWidth = boldFont.widthOfTextAtSize(name, fontSize)
  }

const p1 = pages[0]
  if (name) p1.drawText(name, { x: 350, y: 645, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (name) p1.drawText(name, { x: 135, y: 493, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (sentence) p1.drawText(sentence, { x: 291, y: 505, size: 10, font: boldFont })
  // if (prepareName) p1.drawText(prepareName, { x: 120, y: 450, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  // if (preparePosition) p1.drawText(preparePosition, { x: 120, y: 435, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  if (submitName) p1.drawText(submitName, { x: 380, y: 350, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (submitPosition) p1.drawText(submitPosition, { x: 410, y: 335, size: 10, font: boldFont, color: rgb(0, 0, 0) })

  const p2 = pages[1]
  if (name) p2.drawText(name, { x: 137, y: 679, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.date_of_application) p2.drawText(formatDate(form.date_of_application), { x: 267, y: 750, size: 12, font: boldFont })
  if (submitName) p2.drawText(submitName, { x: 380, y: 350, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (submitPosition) p2.drawText(submitPosition, { x: 410, y: 335, size: 10, font: boldFont, color: rgb(0, 0, 0) })

  const p3 = pages[2]
  if (form.control_no) p3.drawText(form.control_no, { x: 100, y: 697, size: 10, font })
  if (name) p3.drawText(name, { x: 195, y: 685, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.date_of_application) p3.drawText(formatDate(form.date_of_application), { x: 325, y: 697, size: 12, font })
  if (form.date_of_transmission) p3.drawText(formatDate(form.date_of_transmission), { x: 450, y: 697, size: 12, font })
  if (prepareName) p3.drawText(prepareName, { x: 90, y: 535, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (preparePosition) p3.drawText(preparePosition, { x: 140, y: 520, size: 10, font: boldFont, color: rgb(0, 0, 0) })
  if (submitName) p3.drawText(submitName, { x: 380, y: 390, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (submitPosition) p3.drawText(submitPosition, { x: 410, y: 375, size: 10, font: boldFont, color: rgb(0, 0, 0) })

  const p4 = pages[3]
  if (name) p4.drawText(name, { x: 285, y: 655, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.school_name) p4.drawText(form.school_name, { x: 270, y: 585, size: fontSize, font: boldFont })
  if (form.school_address) p4.drawText(form.school_address, { x: 270, y: 565, size: fontSize, font: boldFont })
  if (form.school_year_completed) p4.drawText(form.school_year_completed, { x: 270, y: 550, size: 12, font: boldFont })
  if (form.school_year_graduated) p4.drawText(formatDate(form.school_year_graduated), { x: 270, y: 535, size: 12, font: boldFont })
  if (sentence) p4.drawText(sentence, { x: 291, y: 425, size: 10, font: boldFont })
  if (submitName) p4.drawText(submitName, { x: 380, y: 290, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (submitPosition) p4.drawText(submitPosition, { x: 410, y: 275, size: 10, font: boldFont, color: rgb(0, 0, 0) })

  const pdfBytes: Uint8Array = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank")
}