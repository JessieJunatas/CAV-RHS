import { supabase } from "@/lib/supabase"

type AuditAction = "created" | "updated" | "archived" | "restored" | "deleted"

export async function logAudit({
  action,
  event,
  recordId,
  tableName = "cav_forms",
  oldData = null,
  newData = null,
}: {
  action: AuditAction
  event: string
  recordId: string 
  tableName?: string
  oldData?: any
  newData?: any
}) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  const { error } = await supabase.from("audit_logs").insert({
    action,
    event,
    table_name: tableName,
    record_id: recordId,
    user_id: userData.user.id,
    user_email: userData.user.email,
    old_data: oldData,
    new_data: newData,
  })

  if (error) {
    console.error("Audit insert failed:", error)
  }
}