import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    navigate("/")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card shadow-lg rounded-2xl">

        <div className="text-center space-y-2 ">
          <h1 className="text-4xl font-bold">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to your dashboard
          </p>
        </div>

        <div className="space-y-3">

          <div>
            <label className="text-sm text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-destructive">
              {errorMsg}
            </p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? "Signing in..." : "Login"}
          </Button>

        </div>
      </Card>
    </div>
  )
}