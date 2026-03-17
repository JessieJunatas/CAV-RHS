import {
  createContext, useContext, useRef, useState, useCallback, type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TriangleAlert } from "lucide-react"

type GuardFn = () => boolean

type NavigationGuardContextValue = {
  registerGuard: (fn: GuardFn) => () => void
  guardedNavigate: (path: string) => void
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null)

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const navigate    = useNavigate()
  const guardsRef   = useRef<Set<GuardFn>>(new Set())
  const pendingPath = useRef<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const registerGuard = useCallback((fn: GuardFn) => {
    guardsRef.current.add(fn)
    return () => guardsRef.current.delete(fn)
  }, [])

  const guardedNavigate = useCallback((path: string) => {
    const blocked = Array.from(guardsRef.current).some(fn => fn())
    if (blocked) {
      pendingPath.current = path
      setShowDialog(true)
    } else {
      navigate(path)
    }
  }, [navigate])

  const handleConfirm = () => {
    const dest = pendingPath.current ?? "/"
    pendingPath.current = null
    setShowDialog(false)
    navigate(dest)
  }

  const handleCancel = () => {
    pendingPath.current = null
    setShowDialog(false)
  }

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, guardedNavigate }}>
      {children}

      <AlertDialog open={showDialog} onOpenChange={open => { if (!open) handleCancel() }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base font-bold">Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              You have unsaved changes. If you leave now, everything you've entered will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel
              className="flex-1 rounded-xl h-10 m-0 text-sm"
              onClick={handleCancel}
            >
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
            >
              <TriangleAlert className="h-3.5 w-3.5" /> Discard &amp; Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  const ctx = useContext(NavigationGuardContext)
  if (!ctx) throw new Error("useNavigationGuard must be used inside NavigationGuardProvider")
  return ctx
}