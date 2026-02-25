// types/audit.ts
export type AuditLog = {
  id: string
  audit_no: string
  action: string
  table_name: string
  record_id: string
  user_email: string
  event: string
  created_at: string
}