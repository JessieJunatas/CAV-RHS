import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

export interface MaintenanceState {
  enabled: boolean
  message: string
}

const DEFAULT: MaintenanceState = {
  enabled: false,
  message:
    "This system is currently undergoing scheduled maintenance or an update. Please sit by!"
}

export function useMaintenance() {
  const [state, setState] = useState<MaintenanceState>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const stateRef = useRef<MaintenanceState>(DEFAULT)

  // ── Keep ref in sync after render (not during) ────────────────────────────
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ── Fetch on mount + realtime subscription ────────────────────────────────
  useEffect(() => {
    let ignore = false

    async function fetchConfig() {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "maintenance")
        .single()

      if (!ignore) {
        if (!error && data?.value) {
          setState({ ...DEFAULT, ...(data.value as Partial<MaintenanceState>) })
        }
        setLoading(false)
      }
    }

    fetchConfig()

    // Any browser / user that has this hook mounted will react instantly
    const channel = supabase
      .channel("app_config_maintenance")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_config",
          filter: "key=eq.maintenance",
        },
        (payload) => {
          if (!ignore && payload.new?.value) {
            setState({ ...DEFAULT, ...(payload.new.value as Partial<MaintenanceState>) })
          }
        }
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Write a partial patch back to Supabase ────────────────────────────────
  const persist = useCallback(async (patch: Partial<MaintenanceState>) => {
    setSaving(true)
    const next = { ...stateRef.current, ...patch }
    setState(next) // optimistic update

    const { error } = await supabase
      .from("app_config")
      .update({ value: next, updated_at: new Date().toISOString() })
      .eq("key", "maintenance")

    if (error) {
      // Roll back optimistic update on failure
      setState(stateRef.current)
      console.error("Failed to update maintenance config:", error.message)
    }

    setSaving(false)
  }, [])

  const setEnabled = (enabled: boolean) => persist({ enabled })
  const setMessage = (message: string) => persist({ message })

  return { ...state, loading, saving, setEnabled, setMessage }
}