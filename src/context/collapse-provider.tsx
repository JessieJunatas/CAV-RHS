// src/context/collapse-provider.tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

interface CollapseContextValue {
  collapsed: boolean
  toggle: () => void
  /** Tailwind classes for consistent page-level horizontal padding */
  px: string
}

const CollapseContext = createContext<CollapseContextValue>({
  collapsed: false,
  toggle: () => {},
  px: "px-10",
})

export function CollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Resolve current user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load persisted state when user is known
  useEffect(() => {
    if (!userId) return

    supabase
      .from("user_settings")
      .select("collapsed")
      .eq("account_id", userId)
      .single()
      .then(({ data, error }) => {
        if (!error && data && typeof data.collapsed === "boolean") {
          setCollapsed(data.collapsed)
        }
      })
  }, [userId])

  const toggle = useCallback(async () => {
    const next = !collapsed
    setCollapsed(next)

    if (!userId) return

    await supabase
      .from("user_settings")
      .upsert(
        { account_id: userId, collapsed: next, updated_at: new Date().toISOString() },
        { onConflict: "account_id" }
      )
  }, [collapsed, userId])

  const px = collapsed ? "px-70" : "px-10"

  return (
    <CollapseContext.Provider value={{ collapsed, toggle, px }}>
      {children}
    </CollapseContext.Provider>
  )
}

export function useCollapse() {
  return useContext(CollapseContext)
}