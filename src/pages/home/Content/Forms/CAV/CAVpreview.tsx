import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { generateCavPDF } from "@/utils/generateCAVpdf"

type SignatoryInfo = {
  id: string
  full_name: string
  position: string
}

type CavPreviewData = {
  id: string
  full_legal_name: string
  date_issued: string
  school_name: string
  date_of_transmission: string
  school_year_completed: string
  school_address: string
  date_of_application: string
  school_year_graduated: string
  control_no: string
  prepared: SignatoryInfo | null
  submitted: SignatoryInfo | null
}

function CAVPreview() {
  const { id } = useParams()
  const [form, setForm] = useState<CavPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) {
        setErrorMsg("Invalid form ID.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("cav_forms")
        .select(`
          id,
          full_legal_name,
          date_issued,
          school_name,
          date_of_transmission,
          school_year_completed,
          school_address,
          date_of_application,
          school_year_graduated,
          control_no,
          prepared:prepared_by (
            id,
            full_name,
            position
          ),
          submitted:submitted_by (
            id,
            full_name,
            position
          )
        `)
        .eq("id", id)
        .maybeSingle<CavPreviewData>()

      if (error) {
        console.error("Preview fetch error:", error)
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      if (!data) {
        setErrorMsg("Form not found.")
        setLoading(false)
        return
      }

      setForm(data as CavPreviewData)
      setLoading(false)
    }

    fetchForm()
  }, [id])

  const formatDate = (date?: string) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading form...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {errorMsg}
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="p-16 bg-white">
      <div className="max-w-4xl mx-auto border p-12">

        <h1 className="text-center font-bold text-xl mb-8">
          CERTIFICATION, AUTHENTICATION AND VERIFICATION
        </h1>

        <p className="mb-6">
          This is to certify that{" "}
          <b>{form.full_legal_name}</b> has completed the required
          documentation and verification process.
        </p>

        <div className="space-y-2 text-sm">
          <p><strong>Date Issued:</strong> {formatDate(form.date_issued)}</p>
          <p><strong>School Name:</strong> {form.school_name}</p>
          <p><strong>School Address:</strong> {form.school_address}</p>
          <p><strong>School Year Completed:</strong> {form.school_year_completed}</p>
          <p><strong>Date of Application:</strong> {formatDate(form.date_of_application)}</p>
          <p><strong>Date of Transmission:</strong> {formatDate(form.date_of_transmission)}</p>
          <p><strong>School Year Graduated:</strong> {formatDate(form.school_year_graduated)}</p>
          <p><strong>Control No:</strong> {form.control_no}</p>
        </div>

        {/* Signatories Section */}
        <div className="mt-20 grid grid-cols-2">

          {/* Prepared By */}
          <div>
            <p className="font-semibold mb-8">Prepared by:</p>
            {form.prepared ? (
              <>
                <p className="font-bold">{form.prepared.full_name}</p>
                <p>{form.prepared.position}</p>
              </>
            ) : (
              <p className="text-gray-400">Not assigned</p>
            )}
          </div>

          {/* Submitted By */}
          <div className="text-right">
            <p className="font-semibold mb-8">Submitted by:</p>
            {form.submitted ? (
              <>
                <p className="font-bold">{form.submitted.full_name}</p>
                <p>{form.submitted.position}</p>
              </>
            ) : (
              <p className="text-gray-400">Not assigned</p>
            )}
          </div>

        </div>

        {/* PDF Button */}
        <div className="mt-16 flex justify-end print:hidden">
          <button
            onClick={() => generateCavPDF(form)}
            className="bg-black text-white px-6 py-2 rounded"
          >
            Generate PDF
          </button>
        </div>

      </div>
    </div>
  )
}

export default CAVPreview