/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type FontSize = "small" | "medium" | "large"
type FontStyle = "Inter" | "Roboto" | "Poppins" | "Montserrat" | "Open Sans"

type AppearanceState = {
  fontSize: FontSize
  fontStyle: FontStyle
  setFontSize: (size: FontSize) => void
  setFontStyle: (style: FontStyle) => void
}

const FONT_FAMILY_MAP: Record<string, string> = {
  "Inter":      "'Inter', sans-serif",
  "Roboto":     "'Roboto', sans-serif",
  "Poppins":    "'Poppins', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Open Sans":  "'Open Sans', sans-serif",
}

const FONT_SIZE_MAP: Record<string, string> = {
  small:  "14px",
  medium: "16px",
  large:  "18px",
}

const DEFAULT_FONT_STYLE: FontStyle = "Roboto"
const DEFAULT_FONT_SIZE: FontSize = "medium"

function applyFontStyle(font: string) {
  document.documentElement.style.setProperty(
    "--app-font",
    FONT_FAMILY_MAP[font] ?? `'${font}', sans-serif`
  )
}

function applyFontSize(size: string) {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size] ?? "16px"
}

export function resetAppearanceToDefaults() {
  localStorage.removeItem("app-font-style")
  localStorage.removeItem("app-font-size")
  applyFontStyle(DEFAULT_FONT_STYLE)
  applyFontSize(DEFAULT_FONT_SIZE)
}

const initialState: AppearanceState = {
  fontSize: DEFAULT_FONT_SIZE,
  fontStyle: DEFAULT_FONT_STYLE,
  setFontSize: () => null,
  setFontStyle: () => null,
}

const AppearanceContext = createContext<AppearanceState>(initialState)

type AppearanceProviderProps = {
  children: React.ReactNode
  /** Passed from App.tsx after Supabase fetch — overrides localStorage immediately */
  forcedFontSize?: FontSize | null
  forcedFontStyle?: FontStyle | null
}

export function AppearanceProvider({
  children,
  forcedFontSize,
  forcedFontStyle,
}: AppearanceProviderProps) {
  const [fontSize, setFontSizeState] = useState<FontSize>(DEFAULT_FONT_SIZE)
  const [fontStyle, setFontStyleState] = useState<FontStyle>(DEFAULT_FONT_STYLE)
  const [userId, setUserId] = useState<string | null>(null)

  // Apply forced values the moment they arrive from Supabase (via App.tsx)
  // This is what makes appearance apply at the same speed as theme
  useEffect(() => {
    if (forcedFontSize) {
      setFontSizeState(forcedFontSize)
      applyFontSize(forcedFontSize)
      localStorage.setItem("app-font-size", forcedFontSize)
    }
  }, [forcedFontSize])

  useEffect(() => {
    if (forcedFontStyle) {
      setFontStyleState(forcedFontStyle)
      applyFontStyle(forcedFontStyle)
      localStorage.setItem("app-font-style", forcedFontStyle)
    }
  }, [forcedFontStyle])

  // Still get userId for saving changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) setUserId(session.user.id)
      if (event === 'SIGNED_OUT') setUserId(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const setFontSize = async (size: FontSize) => {
    setFontSizeState(size)
    applyFontSize(size)
    localStorage.setItem("app-font-size", size)
    if (!userId) return
    const { error } = await supabase
      .from("user_settings")
      .update({ font_size: size })
      .eq("account_id", userId)
    if (error) console.error("Failed to save font_size:", error)
  }

  const setFontStyle = async (style: FontStyle) => {
    setFontStyleState(style)
    applyFontStyle(style)
    localStorage.setItem("app-font-style", style)
    if (!userId) return
    const { error } = await supabase
      .from("user_settings")
      .update({ font_style: style })
      .eq("account_id", userId)
    if (error) console.error("Failed to save font_style:", error)
  }

  return (
    <AppearanceContext.Provider value={{ fontSize, fontStyle, setFontSize, setFontStyle }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export const useAppearance = () => {
  const context = useContext(AppearanceContext)
  if (context === undefined)
    throw new Error("useAppearance must be used within an AppearanceProvider")
  return context
}