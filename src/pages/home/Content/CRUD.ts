import { supabase } from "@/lib/supabase"

interface CreateFormOptions {
  table: string
  data: any
  formType?: number
  userId: string
  userEmail: string
  label: string
}

export async function createForm({
  table,
  data,
  formType,
  userId,
  userEmail,
  label,
}: CreateFormOptions) {

  const insertPayload: any = {
    ...data,
    created_by: userId,
  }

  if (formType !== undefined) {
    insertPayload.form_type = formType
  }

  const { data: inserted, error } = await supabase
    .from(table)
    .insert([insertPayload])
    .select()
    .single()

  if (error) throw error

  await supabase.from("audit_logs").insert([
    {
      action: `${label} created for ${data.full_legal_name ?? "record"}`,
      user_email: userEmail,
    },
  ])

  return inserted
}