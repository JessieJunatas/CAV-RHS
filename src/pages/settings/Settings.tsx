/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAppearance } from "@/components/appearance-provider"
import { cn } from "@/lib/utils"
import { Check, Type, FileText, ChevronRight, Paintbrush, Layout } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const FONT_SIZES = [
  { value: "small",  label: "Compact",  px: "14px", scale: 0.875 },
  { value: "medium", label: "Default",  px: "16px", scale: 1 },
  { value: "large",  label: "Spacious", px: "18px", scale: 1.125 },
]

const FONT_CATEGORIES = [
  {
    id: "sans",
    label: "Sans Serif",
    fonts: ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans"],
  },
  {
    id: "serif",
    label: "Serif",
    fonts: ["Playfair Display", "Merriweather", "Lora", "PT Serif", "Libre Baskerville"],
  },
  {
    id: "mono",
    label: "Monospace",
    fonts: ["JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Space Mono"],
  },
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

const PREVIEW_TEXT: Record<string, string> = {
  sans:  "The quick brown fox jumps over the lazy dog.",
  serif: "Wisdom begins in wonder — and ends in clarity.",
  mono:  "const greet = (name) => `Hello, ${name}!`",
}

const TABS = [
  { id: "appearance", label: "Appearance", icon: Paintbrush },
  { id: "system",     label: "System",     icon: Layout },
]

function Settings() {
  const { fontSize, fontStyle, setFontSize, setFontStyle } = useAppearance()
  const [activeTab, setActiveTab] = useState<"appearance" | "system">("appearance")
  const [activeCategory, setActiveCategory] = useState("sans")
  const [hoverFont, setHoverFont] = useState<string | null>(null)
  const navigate = useNavigate()

  const currentCategory = FONT_CATEGORIES.find(c => c.id === activeCategory)!
  const previewFont = hoverFont ?? fontStyle
  const previewText = PREVIEW_TEXT[activeCategory]

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-120 space-y-7">

        {/* Page header */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-1.5">
            Preferences
          </p>
          <h1 className="text-[1.6rem] font-semibold tracking-tight leading-none">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Customize how the interface looks and feels.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-3 py-2.5 transition-all duration-150",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── APPEARANCE TAB ── */}
        {activeTab === "appearance" && (
          <div className="space-y-7">

            {/* Font Size */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Font Size</p>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {FONT_SIZES.find(s => s.value === fontSize)?.px}
                </span>
              </div>

              <div className="relative grid grid-cols-3 gap-px rounded-xl border border-border bg-border overflow-hidden">
                {FONT_SIZES.map((size) => {
                  const active = fontSize === size.value
                  return (
                    <button
                      key={size.value}
                      onClick={() => setFontSize(size.value as any)}
                      className={cn(
                        "relative flex flex-col items-center gap-1 py-4 transition-all duration-200 select-none",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <span className="font-bold leading-none" style={{ fontSize: `${size.scale * 16}px` }}>
                        Ag
                      </span>
                      <span className="text-[11px] font-medium opacity-80">{size.label}</span>
                      {active && (
                        <span className="absolute top-1.5 right-1.5">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            <Separator />

            {/* Typeface */}
            <section className="space-y-4">
              <p className="text-sm font-semibold">Typeface</p>

              <div
                className="rounded-xl border border-border bg-muted/40 px-5 py-4 transition-all duration-300"
                style={{ fontFamily: FONT_FAMILY_MAP[previewFont] ?? FONT_FAMILY_MAP["Inter"] }}
              >
                <p className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Type className="w-3 h-3" />
                  <span style={{ fontFamily: "inherit" }}>
                    {hoverFont ? "Preview" : "Active"} · {hoverFont ?? fontStyle}
                  </span>
                </p>
                <p
                  className="leading-relaxed text-foreground"
                  style={{ fontSize: FONT_SIZES.find(s => s.value === fontSize)?.px }}
                >
                  {previewText}
                </p>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                {FONT_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id
                  const hasSelected = cat.fonts.includes(fontStyle)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "relative flex-1 text-xs font-semibold rounded-lg px-2 py-2 transition-all duration-150",
                        isActive
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {cat.label}
                      {hasSelected && !isActive && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Font list */}
              <div className="space-y-1">
                {currentCategory.fonts.map((font) => {
                  const active = fontStyle === font
                  return (
                    <button
                      key={font}
                      onClick={() => setFontStyle(font as any)}
                      onMouseEnter={() => setHoverFont(font)}
                      onMouseLeave={() => setHoverFont(null)}
                      className={cn(
                        "group w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-150 text-left",
                        active
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50"
                      )}
                    >
                      <div
                        className={cn(
                          "shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center text-base font-bold transition-all duration-150",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/70 text-foreground border-border group-hover:border-muted-foreground/30"
                        )}
                        style={{ fontFamily: FONT_FAMILY_MAP[font] }}
                      >
                        Ag
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold leading-none mb-1.5 transition-colors",
                          active ? "text-primary" : "text-foreground"
                        )}>
                          {font}
                        </p>
                        <p
                          className="text-xs text-muted-foreground truncate leading-none"
                          style={{ fontFamily: FONT_FAMILY_MAP[font] }}
                        >
                          The quick brown fox
                        </p>
                      </div>
                      <div className={cn(
                        "shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                        active
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/25 group-hover:border-muted-foreground/50"
                      )}>
                        {active && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="flex items-center gap-2 pb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_1px_rgb(52_211_153/0.5)]" />
              <p className="text-xs text-muted-foreground">Changes are saved automatically</p>
            </div>
          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {activeTab === "system" && (
          <div className="space-y-7">
            <section className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Document Templates</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage the PDF templates used for generating CAV documents.
                </p>
              </div>

              <Separator />

              <button
                onClick={() => navigate('/settings/pdf-template')}
                className="w-full flex items-center gap-3.5 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-muted-foreground/30 px-4 py-3.5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 group-hover:border-muted-foreground/30 transition-all">
                  <FileText className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">PDF Field Editor</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Place and configure form fields on the CAV template
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </section>
          </div>
        )}

      </div>
    </div>
  )
}

export default Settings