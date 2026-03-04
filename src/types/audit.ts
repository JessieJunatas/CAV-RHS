// types/audit.ts
export type AuditLog = {
  id: string
  audit_no: string
  action: string
  table_name: string
  record_id: string
  user_email: string
  event: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  created_at: string
}