/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAppearance } from "@/components/appearance-provider"
import { cn } from "@/lib/utils"
import { Check, FileText, ChevronRight, Paintbrush, Layout, AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMaintenance } from "@/hooks/use-maintenance"

const FONT_SIZES = [
  { value: "small",  label: "Small",  px: "14px", scale: 0.875 },
  { value: "medium", label: "Medium", px: "16px", scale: 1     },
  { value: "large",  label: "Large",  px: "18px", scale: 1.125 },
]

const FONT_CATEGORIES = [
  { id: "sans",  label: "Sans-serif", fonts: ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans"] },
  { id: "serif", label: "Serif",      fonts: ["Playfair Display", "Merriweather", "Lora", "PT Serif", "Libre Baskerville"] },
  { id: "mono",  label: "Monospace",  fonts: ["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Space Mono"] },
]

const FONT_FAMILY_MAP: Record<string, string> = {
  "Inter":             "'Inter', sans-serif",
  "Roboto":            "'Roboto', sans-serif",
  "Poppins":           "'Poppins', sans-serif",
  "Montserrat":        "'Montserrat', sans-serif",
  "Open Sans":         "'Open Sans', sans-serif",
  "Playfair Display":  "'Playfair Display', serif",
  "Merriweather":      "'Merriweather', serif",
  "Lora":              "'Lora', serif",
  "PT Serif":          "'PT Serif', serif",
  "Libre Baskerville": "'Libre Baskerville', serif",
  "JetBrains Mono":    "'JetBrains Mono', monospace",
  "Fira Code":         "'Fira Code', monospace",
  "Source Code Pro":   "'Source Code Pro', monospace",
  "IBM Plex Mono":     "'IBM Plex Mono', monospace",
  "Space Mono":        "'Space Mono', monospace",
}

const TABS = [
  { id: "appearance", label: "Appearance", icon: Paintbrush },
  { id: "system",     label: "System",     icon: Layout },
]

function Settings() {
  const { fontSize, fontStyle, setFontSize, setFontStyle } = useAppearance()
  const [activeTab, setActiveTab] = useState<"appearance" | "system">("appearance")
  const [activeCategory, setActiveCategory] = useState(
    FONT_CATEGORIES.find(c => c.fonts.includes(fontStyle))?.id ?? "sans"
  )
  const navigate = useNavigate()
  const maintenance = useMaintenance()

  const currentFonts = FONT_CATEGORIES.find(c => c.id === activeCategory)!.fonts

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-4xl px-6 pt-10 pb-16">

        {/* ── Page header ── */}
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1.5">
            Preferences
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how the interface looks and feels.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border w-fit mb-8">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-all duration-150",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {/* Red dot on System tab when maintenance is active */}
                {tab.id === "system" && maintenance.enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                )}
              </button>
            )
          })}
        </div>

        {/* ── APPEARANCE TAB ── */}
        {activeTab === "appearance" && (
          <div className="space-y-8">

            {/* Text Size */}
            <section>
              <p className="text-sm font-semibold mb-1">Text Size</p>
              <p className="text-xs text-muted-foreground mb-4">
                How large text appears across the app
              </p>
              <div className="grid grid-cols-3 gap-3">
                {FONT_SIZES.map((size) => {
                  const active = fontSize === size.value
                  return (
                    <button
                      key={size.value}
                      onClick={() => setFontSize(size.value as any)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-3 py-7 rounded-2xl border-2 transition-all duration-150 select-none",
                        active
                          ? "border-foreground bg-foreground/5"
                          : "border-border bg-card hover:border-foreground/30 hover:bg-muted/40"
                      )}
                    >
                      {active && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" strokeWidth={2.5} />
                        </span>
                      )}
                      <span
                        className="font-semibold text-foreground leading-none"
                        style={{ fontSize: `${size.scale * 28}px` }}
                      >
                        Aa
                      </span>
                      <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                        {size.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="border-t border-border" />

            {/* Font Style */}
            <section>
              <p className="text-sm font-semibold mb-1">Font Style</p>
              <p className="text-xs text-muted-foreground mb-4">
                The typeface used throughout the interface
              </p>

              {/* Category pills */}
              <div className="flex gap-2 mb-3">
                {FONT_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id
                  const hasSelected = cat.fonts.includes(fontStyle)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "relative text-xs font-medium rounded-full px-4 py-1.5 border transition-all duration-150",
                        isActive
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
                      )}
                    >
                      {cat.label}
                      {hasSelected && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Font list */}
              <div className="space-y-2">
                {currentFonts.map((font) => {
                  const active = fontStyle === font
                  return (
                    <button
                      key={font}
                      onClick={() => setFontStyle(font as any)}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-150 text-left",
                        active
                          ? "border-foreground bg-foreground/5"
                          : "border-border bg-card hover:border-foreground/20 hover:bg-muted/30"
                      )}
                    >
                      <span
                        className="shrink-0 text-2xl font-bold text-foreground w-10 leading-none"
                        style={{ fontFamily: FONT_FAMILY_MAP[font] }}
                      >
                        Ag
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-none mb-1">{font}</p>
                        <p
                          className="text-xs text-muted-foreground truncate"
                          style={{ fontFamily: FONT_FAMILY_MAP[font] }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                      <div className={cn(
                        "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        active ? "bg-foreground border-foreground" : "border-border"
                      )}>
                        {active && <Check className="w-3 h-3 text-background" strokeWidth={2.5} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {activeTab === "system" && (
          <div className="space-y-8">
            {/* ── Document Templates ── */}
            <section>
              <p className="text-sm font-semibold mb-1">Document Templates</p>
              <p className="text-xs text-muted-foreground mb-4">
                Manage PDF templates for CAV documents
              </p>
              <button
                onClick={() => navigate('/settings/pdf-template')}
                className="w-full flex items-center gap-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-foreground/20 px-4 py-4 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl border border-border bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">PDF Field Editor</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Place and configure form fields on the CAV template
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </section>

          </div>
        )}

      </div>
    </div>
  )
}

export default Settings