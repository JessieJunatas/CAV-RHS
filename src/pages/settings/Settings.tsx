import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type UserSettings = {
  font_size: string
  font_style: string
}

const FONT_SIZES = [
  { value: "small",  label: "Compact",  px: "14px" },
  { value: "medium", label: "Default",  px: "16px" },
  { value: "large",  label: "Spacious", px: "18px" },
]

const FONT_STYLES = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans"]

function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    font_size: "medium",
    font_style: "Inter",
  })

  // Keep a ref so updateSetting always has the latest userId
  // without a stale-closure problem
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return

      userIdRef.current = data.user.id

      await ensureSettings(data.user.id)

      const saved = await loadSettings(data.user.id)
      if (saved) {
        setSettings(saved)
        applyFont(saved.font_style)
        applyFontSize(saved.font_size)
      }
    }
    init()
  }, [])

  const applyFont = (font: string) => {
    document.documentElement.style.setProperty("--app-font", `'${font}', sans-serif`)
  }

  const applyFontSize = (size: string) => {
    const map: Record<string, string> = { small: "14px", medium: "16px", large: "18px" }
    document.documentElement.style.fontSize = map[size]
  }

  const updateSetting = async (field: keyof UserSettings, value: string) => {
    // Optimistic update — UI reflects change immediately
    setSettings((prev) => ({ ...prev, [field]: value }))
    if (field === "font_style") applyFont(value)
    if (field === "font_size") applyFontSize(value)

    // Persist — use ref so we never have a stale userId
    const uid = userIdRef.current
    if (!uid) return

    const { error } = await supabase
      .from("user_settings")
      .update({ [field]: value })
      .eq("account_id", uid)

    if (error) console.error("Failed to save:", error)
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6 pt-16">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Preferences
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how the app looks and feels for you.
          </p>
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Font Size</p>
            <Badge variant="secondary" className="font-mono text-xs">
              {FONT_SIZES.find((s) => s.value === settings.font_size)?.px}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZES.map((size) => {
              const active = settings.font_size === size.value
              return (
                <button
                  key={size.value}
                  onClick={() => updateSetting("font_size", size.value)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-center transition-all duration-150",
                    active
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute top-2 right-2">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "font-semibold leading-none",
                      size.value === "small"  && "text-sm",
                      size.value === "medium" && "text-base",
                      size.value === "large"  && "text-lg",
                    )}
                  >
                    Aa
                  </span>
                  <span className="text-xs font-medium">{size.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Font Style */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Typeface</p>

          <div className="space-y-1.5">
            {FONT_STYLES.map((font) => {
              const active = settings.font_style === font
              return (
                <button
                  key={font}
                  onClick={() => updateSetting("font_style", font)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-150 text-left",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-muted-foreground/40 hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      Aa
                    </div>
                    <span className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>
                      {font}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      active ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}
                  >
                    {active && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground flex items-center gap-2 pb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Changes are saved automatically
        </p>

      </div>
    </div>
  )
}

/* ---------------- DATABASE HELPERS ---------------- */

export const loadSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("account_id", userId)
    .single()
  if (error) { console.error("Failed to load settings:", error); return null }
  return data
}

export const ensureSettings = async (userId: string) => {
  const { data } = await supabase
    .from("user_settings")
    .select("id")
    .eq("account_id", userId)
    .maybeSingle()
  if (!data) {
    const { error } = await supabase.from("user_settings").insert({ account_id: userId })
    if (error) console.error("Failed to create settings:", error)
  }
}

export default Settings