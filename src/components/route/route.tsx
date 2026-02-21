import { useEffect, useState, type JSX } from "react"
import { supabase } from "@/lib/supabase"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element
}) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (!session) return <Navigate to="/login" />

  return children
}