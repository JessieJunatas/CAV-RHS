import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, Mail, Lock, AlertTriangle } from "lucide-react"

// ---- Toast model ----
type Toast = {
  id: number
  message: string
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const navigate = useNavigate()

  const pushToast = (message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])

    // auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      pushToast(error.message)
      setLoading(false)
      return
    }

    navigate("/")
  }

  return (
    <>
      <div className="flex pt-50 items-center justify-center">
        <Card className="w-full max-w-md border-1 border-accent p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            Having trouble? <span className="underline cursor-pointer">Reset password</span>
          </div>
        </Card>
      </div>

      {/* Toast Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            variant="destructive"
            className="w-60 animate-in slide-in-from-bottom-2 fade-in"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{toast.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </>
  )
}
