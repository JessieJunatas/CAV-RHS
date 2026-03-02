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

  try {
  await supabase.from("audit_logs").insert([
    {
      action: `${label} created for ${data.full_legal_name ?? "record"}`,
      user_email: userEmail,
      user_id: userId,
      table_name: table,
      record_id: inserted.id.toString(),
    },

  ])
  } catch (err: any) {
    console.error("Audit log failed:", err)
  }
  

  return inserted
}