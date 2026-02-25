import { useState } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react"

type Toast = { id: number; message: string }

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const navigate = useNavigate()

  const pushToast = (message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      pushToast(error.message)
      setLoading(false)
      return
    }

    navigate("/")
  }

  return (
    <>
      <form
        onSubmit={handleLogin}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your email below to login to your account
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <a                                              
                href="#"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
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
          </Field>

          <Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Login"
              )}
            </Button>
          </Field>

          <Field>
            <FieldDescription className="text-center">
              Don&apos;t have an account?{" "}
              <a href="/login" className="underline underline-offset-4">
                Sign up
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>

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