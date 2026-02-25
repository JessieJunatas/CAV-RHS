
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
        <a href="#" className="flex items-center gap-2 font-bold">
          <img src="/RHS-Logo.png" alt="RHS Logo" className="size-8 object-contain" />
          Auto-Forms
        </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
      <div className="absolute inset-0">
        <img
          src="/bg.webp"
          alt="Image"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>
      </div>
    </div>
  )
}
