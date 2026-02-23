import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"

function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("id", id)
        .single()

      if (!error && data) {
        setFormData(data)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleUpdate = async () => {
    if (!id) return

    setSaving(true)

    const { error } = await supabase
      .from("cav_forms")
      .update(formData)
      .eq("id", id)

    if (error) {
      alert("Update failed: " + error.message)
      setSaving(false)
      return
    }

    alert("Updated successfully!")
    navigate("/")
  }

  if (loading)
    return <div className="p-10 text-foreground">Loading...</div>

  if (!formData)
    return <div className="p-10 text-foreground">Record not found.</div>

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-10">
      <div className="w-full max-w-7xl rounded-2xl border border-border p-10">

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Edit Form</h1>
          <p className="text-sm text-muted-foreground">
            Editing item with ID: {id}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-16">

          {/* LEFT SIDE - FORM */}
          <Card className="p-8 rounded-2xl bg-card text-foreground">
            <div className="grid grid-cols-2 gap-6">

              <InputField label="Complete Name" name="full_legal_name" value={formData.full_legal_name} onChange={handleChange} />
              <InputField label="Date Issued" name="date_issued" value={formData.date_issued} onChange={handleChange} type="date" />
              <InputField label="Name of School" name="school_name" value={formData.school_name} onChange={handleChange} />
              <InputField label="School Year Completed" name="school_year_completed" value={formData.school_year_completed} onChange={handleChange} />
              <InputField label="School Address" name="school_address" value={formData.school_address} onChange={handleChange} />
              <InputField label="Date of Application" name="date_of_application" value={formData.date_of_application} onChange={handleChange} type="date" />
              <InputField label="School Year Graduated" name="school_year_graduated" value={formData.school_year_graduated} onChange={handleChange} type="date" />
              <InputField label="Control No." name="control_no" value={formData.control_no} onChange={handleChange} />

              <div className="col-span-2 flex justify-end pt-4">
                <Button onClick={handleUpdate} disabled={saving}>
                  {saving ? "Updating..." : "Update"}
                </Button>
              </div>

            </div>
          </Card>

          {/* RIGHT SIDE - PREVIEW */}
          <Card className="flex items-center justify-center p-10 rounded-2xl bg-card">
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-[320px] h-[160px] rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  PREVIEW
                </span>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
}: any) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        name={name}
        value={value || ""}
        onChange={onChange}
        type={type}
      />
    </div>
  )
}

export default EditPage