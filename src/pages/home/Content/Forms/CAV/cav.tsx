import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { createForm } from "../../CRUD"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DatePicker } from "@/components/ui/date-picker"
import {
  User, Calendar, School, MapPin, GraduationCap,
  Hash, Send, CheckCircle2, FileText,
  AlertCircle, Download, TriangleAlert,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"

type CavFormData = {
  full_legal_name: string
  date_issued: string
  school_name: string
  date_of_transmission: string
  school_year_completed: string
  school_address: string
  date_of_application: string
  school_year_graduated: string
  control_no: string
}

const EMPTY: CavFormData = {
  full_legal_name: "",
  date_issued: "",
  school_name: "",
  date_of_transmission: "",
  school_year_completed: "",
  school_address: "",
  date_of_application: "",
  school_year_graduated: "",
  control_no: "",
}

const FIELD_LABELS: Record<keyof CavFormData, string> = {
  full_legal_name: "Complete Name",
  date_issued: "Date Issued",
  school_name: "Name of School",
  date_of_transmission: "Date of Transmission",
  school_year_completed: "School Year Completed",
  school_address: "School Address",
  date_of_application: "Date of Application",
  school_year_graduated: "School Year Graduated",
  control_no: "Control No.",
}

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

async function generatePreviewUrl(form: any): Promise<string> {
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
    return { sentence: `${getOrdinal(day)} day            ${month}         ${year}` }
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
  if (name) p1.drawText(name, { x: 350, y: 646, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (name) p1.drawText(name, { x: 135, y: 493, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (sentence) p1.drawText(sentence, { x: 291, y: 505, size: 10, font: boldFont })

  const p2 = pages[1]
  if (name) p2.drawText(name, { x: 137, y: 689, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
  if (form.date_of_application) p2.drawText(formatDate(form.date_of_application), { x: 257, y: 758, size: 12, font: boldFont })

  const p3 = pages[2]
  if (form.control_no) p3.drawText(form.control_no, { x: 100, y: 697, size: 10, font })
  if (name) p3.drawText(name, { x: 200, y: 697, size: fontSize, font: boldFont, color: rgb(0, 0, 0) })
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

function CAV() {
  const [loading, setLoading] = useState(false)
  const [savedForm, setSavedForm] = useState<(CavFormData & { id: string }) | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [formData, setFormData] = useState<CavFormData>(EMPTY)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  const fields: {
    label: string
    name: keyof CavFormData
    type?: string
    colSpan?: string
    icon: React.ReactNode
  }[] = [
    { label: "Complete Name", name: "full_legal_name", icon: <User className="h-3.5 w-3.5" /> },
    { label: "Date Issued", name: "date_issued", type: "date", icon: <Calendar className="h-3.5 w-3.5" /> },
    { label: "Name of School", name: "school_name", colSpan: "col-span-2", icon: <School className="h-3.5 w-3.5" /> },
    { label: "School Year Completed", name: "school_year_completed", icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { label: "School Address", name: "school_address", colSpan: "col-span-2", icon: <MapPin className="h-3.5 w-3.5" /> },
    { label: "Date of Transmission", name: "date_of_transmission", type: "date", icon: <Send className="h-3.5 w-3.5" /> },
    { label: "Date of Application", name: "date_of_application", type: "date", icon: <Calendar className="h-3.5 w-3.5" /> },
    { label: "School Year Graduated", name: "school_year_graduated", type: "date", icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { label: "Control No.", name: "control_no", icon: <Hash className="h-3.5 w-3.5" /> },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([])
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleDateChange = (name: keyof CavFormData, value: string) => {
    setValidationErrors([])
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const filledCount = Object.values(formData).filter(Boolean).length
  const totalFields = Object.keys(formData).length
  const progress = Math.round((filledCount / totalFields) * 100)
  const isComplete = filledCount === totalFields

  const validate = (): string[] =>
    (Object.keys(formData) as (keyof CavFormData)[])
      .filter(key => !formData[key]?.trim())
      .map(key => FIELD_LABELS[key])

  const handleSubmit = async () => {
    const missing = validate()
    if (missing.length > 0) {
      setValidationErrors(missing)
      pushToast("error", "Missing required fields", `Please fill in: ${missing.join(", ")}.`)
      return
    }

    try {
      setLoading(true)
      setValidationErrors([])

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const created = await createForm({
        table: "cav_forms",
        data: formData,
        formType: 1,
        userId: userData.user.id,
        userEmail: userData.user.email!,
        label: "CAV Form",
      })

      if (!created?.id) throw new Error("Form creation failed")

      try {
        await logAudit({
          action: "created",
          event: `Created CAV form for ${formData.full_legal_name}`,
          recordId: created.id,
          newData: formData,
        })
      } catch (err: any) {
        console.error("Audit log failed:", err)
      }

      const saved = { ...formData, id: created.id }
      setSavedForm(saved)
      pushToast("success", "Form submitted", "Download the completed PDF from the preview panel.")

      setGeneratingPreview(true)
      const url = await generatePreviewUrl(saved)
      setPreviewUrl(url)
      setGeneratingPreview(false)

    } catch (err: any) {
      pushToast("error", "Submission failed", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!savedForm) return
    await generateCavPDF(savedForm)
  }

  return (
    <div className="bg-background text-foreground p-10">
      <div className="w-full max-w-6xl mx-auto">

        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
              New Record
            </Badge>
            <h1 className="text-xl font-bold tracking-tight">CAV Form</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Certification, Authentication, and Verification
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs text-muted-foreground">{filledCount} of {totalFields} fields filled</span>
            <div className="h-1.5 w-36 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 items-stretch">

          {/* LEFT — Form */}
          <Card className="p-6 rounded-2xl bg-card flex flex-col">
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              {fields.map((field) => {
                const isMissing = validationErrors.includes(field.label)
                return (
                  <div key={field.name} className={field.colSpan ?? ""}>
                    <label className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${isMissing ? "text-destructive" : "text-muted-foreground"}`}>
                      <span className={isMissing ? "text-destructive/70" : "text-muted-foreground/50"}>
                        {field.icon}
                      </span>
                      {field.label}
                      {formData[field.name] && !isMissing && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                      )}
                      {isMissing && (
                        <AlertCircle className="h-3 w-3 text-destructive ml-auto" />
                      )}
                    </label>

                    {field.type === "date" ? (
                      <DatePicker
                        value={formData[field.name]}
                        onChange={(val) => handleDateChange(field.name, val)}
                        disabled={!!savedForm}
                        placeholder="Pick a date"
                        className={isMissing ? "border-destructive/60 bg-destructive/5" : ""}
                      />
                    ) : (
                      <Input
                        type="text"
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        disabled={!!savedForm}
                        className={`h-9 rounded-lg text-sm transition-all focus-visible:ring-1 disabled:opacity-60 ${
                          isMissing
                            ? "border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30"
                            : "border-border/60 bg-background"
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pinned footer */}
            <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
              <p className="text-xs text-muted-foreground/50">
                {savedForm
                  ? "Form submitted successfully"
                  : isComplete
                  ? "All fields filled — ready to submit"
                  : `${totalFields - filledCount} field${totalFields - filledCount !== 1 ? "s" : ""} remaining`}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={loading || !!savedForm}
                size="sm"
                className="gap-1.5 min-w-[100px]"
              >
                {loading ? (
                  <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Submitting…</>
                ) : savedForm ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" />Submitted</>
                ) : "Submit"}
              </Button>
            </div>
          </Card>

          {/* RIGHT — PDF Preview */}
          <div className="flex flex-col gap-3">
            <Card className="flex-1 rounded-2xl bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Document Preview
                  </p>
                </div>
                {!savedForm ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground/50">
                    Submit to generate
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Ready
                  </Badge>
                )}
              </div>

              <div className="relative h-[500px] bg-muted/30">
                {!savedForm && !generatingPreview && (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">No preview yet</p>
                      <p className="text-xs text-muted-foreground/50">Fill in the form and submit to generate the PDF preview</p>
                    </div>
                    <div className="mt-2 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-muted-foreground/20 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/40">{progress}% complete</p>
                  </div>
                )}

                {generatingPreview && (
                  <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm">Generating preview…</p>
                  </div>
                )}

                {previewUrl && !generatingPreview && (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="h-full w-full border-0"
                    title="CAV PDF Preview"
                  />
                )}
              </div>
            </Card>

            <Button
              onClick={handleDownload}
              disabled={!savedForm || generatingPreview}
              className="w-full gap-2"
              size="sm"
            >
              <Download className="h-4 w-4" />
              {generatingPreview ? "Generating…" : "Download PDF"}
            </Button>
          </div>

        </div>
      </div>

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) =>
          toast.type === "error" ? (
            <Alert
              key={toast.id}
              variant="destructive"
              className="w-80 animate-in slide-in-from-bottom-2 fade-in shadow-lg"
            >
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          ) : (
            <Alert
              key={toast.id}
              className="w-80 animate-in slide-in-from-bottom-2 fade-in shadow-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          )
        )}
      </div>
    </div>
  )
}

export default CAV