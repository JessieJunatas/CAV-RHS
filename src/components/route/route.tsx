import { useEffect, useState, type JSX } from "react"
import { supabase } from "@/lib/supabase"
import { Navigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return null 

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}