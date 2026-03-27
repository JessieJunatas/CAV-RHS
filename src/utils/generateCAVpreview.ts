/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase"
import { PDFDocument, StandardFonts } from "pdf-lib"

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

export async function generatePreviewUrl(
  form: any,
  preparedOptions: { id: string; full_name: string; position: string }[],
  submittedOptions: { id: string; full_name: string; position: string }[]
): Promise<string> {
  const { data: signedData, error: signedError } = await supabase.storage
    .from("templates")
    .createSignedUrl("jhs/CAV_Format_JHS.pdf", 60)

  if (signedError || !signedData?.signedUrl) {
    throw new Error("Could not generate signed URL for template: " + signedError?.message)
  }

  const existingPdfBytes = await fetch(signedData.signedUrl).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const pdfForm = pdfDoc.getForm()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const prep = preparedOptions.find(p => p.id === form.prepared_by)
  const sub = submittedOptions.find(s => s.id === form.submitted_by)
  const prepareName = prep?.full_name.toUpperCase() ?? ""
  const preparePosition = prep?.position ?? ""
  const submitName = sub?.full_name.toUpperCase() ?? ""
  const submitPosition = sub?.position ?? ""
  const today = new Date().toISOString()

  const name = (form.full_legal_name ?? "").toUpperCase()
  const { ordinal, month, year } = formatFullDateParts(form.date_issued)

  function setField(fieldName: string, value: string, bold = false, multiline = false) {
  try {
    const field = pdfForm.getTextField(fieldName)
    if (multiline) {
      field.enableMultiline()
      const PADDING = 2
      const widgets = field.acroField.getWidgets()
      for (const widget of widgets) {
        const rect = widget.getRectangle()
        widget.setRectangle({
          x: rect.x + PADDING,
          y: rect.y,
          width: Math.max(10, rect.width - PADDING * 2),
          height: rect.height,
        })
      }
    }
    field.setText(value ?? "")
    if (bold) field.updateAppearances(boldFont)
  } catch {
    console.warn(`Field "${fieldName}" not found in PDF`)
  }
  }

  setField("control_no", form.control_no ?? "")
  setField("student_name", name, true, true)
  setField("date_of_application", formatDate(form.date_of_application))
  setField("date_of_transmittal", formatDate(form.date_of_transmission))
  setField("prepared_by_name", prepareName, true)
  setField("prepared_by_position", preparePosition, true)
  setField("submitted_by_name", submitName, true)
  setField("submitted_by_position", submitPosition, true)

  setField("p2_date", formatDate(today))
  setField("p2_student_name", name, true)
  setField("p2_submitted_by_name", submitName, true)
  setField("p2_submitted_by_position", submitPosition, true)
  setField("p2_check_completion",     form.docs_completion     ? "( X ) Certification of Completion/Graduation" : "")
  setField("p2_check_english_medium", form.docs_english_medium ? "( X ) Certification of English as Meidum of Instruction" : "")
  setField("p2_check_form137",        form.docs_form137        ? "( X ) SF-10" : "")
  setField("p2_check_diploma",        form.docs_diploma        ? "( X ) Diploma" : "")

  setField("p3_student_name", name, true)

  const enrolledGrade = (form.enrolled_grade ?? "").trim()
  const enrolledSY = (form.enrolled_sy ?? "").trim()
  if (enrolledGrade || enrolledSY) {
    setField("p3_check_enrolled", "X")
    setField("p3_enrolled_grade", enrolledGrade)
    setField("p3_enrolled_sy", enrolledSY)
  }

  const completedGrade = (form.status_completed_grade ?? "").trim()
  const completedSY = (form.status_completed_sy ?? "").trim()
  if (completedGrade || completedSY) {
    setField("p3_check_completed", "X")
    setField("p3_completed_grade", completedGrade)
    setField("p3_completed_sy", completedSY)
  }

  const graduatedSY = (form.status_graduated_sy ?? "").trim()
  if (graduatedSY) {
    setField("p3_check_graduated", "X")
    setField("p3_graduated_sy", graduatedSY)
  }

  setField("p3_day", ordinal)
  setField("p3_month", month)
  setField("p3_year", year)
  setField("p3_request_name", name, true)
  setField("p3_submitted_by_name", submitName, true)
  setField("p3_submitted_by_position", submitPosition, true)

  setField("p4_student_name", name, true)
  setField("p4_sy_completed", form.school_year_completed ?? "")
  setField("p4_sy_graduated", formatDate(form.school_year_graduated))
  setField("p4_is_graduated", form.is_graduated ? "Completed" : "Attended")
  setField("p4_day", ordinal)
  setField("p4_month", month)
  setField("p4_year", year)
  setField("p4_submitted_by_name", submitName, true)
  setField("p4_submitted_by_position", submitPosition, true)

  pdfForm.flatten()

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" })
  return URL.createObjectURL(blob)
}