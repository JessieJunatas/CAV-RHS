export const FORM_TYPE_LABELS: Record<number, string> = {
  1: "CAV — Junior High School",
  2: "CAV — K-12",
}

export const FORM_TYPE_SHORT: Record<number, string> = {
  1: "JHS",
  2: "K-12",
}

export function getFormTypeLabel(type: number | null | undefined): string {
  if (!type) return "Unknown Form"
  return FORM_TYPE_LABELS[type] ?? `Form Type ${type}`
}

export function getFormTypeShort(type: number | null | undefined): string {
  if (!type) return "—"
  return FORM_TYPE_SHORT[type] ?? `Type ${type}`
}