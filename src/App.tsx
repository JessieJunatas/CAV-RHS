import './App.css'
import { useState, useEffect } from 'react'
import Home from './pages/home/homeData'
import ViewPage from './pages/view/PreviewPage'
import EditPage from './pages/edit/EditPage'
import { Navbar } from './pages/navbar'
import { ThemeProvider } from "@/components/theme-provider"
import LoginPage from "./pages/LoginPage/login"
import FormRouter from './pages/home/Content/Forms/FormRouter'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import ProtectedRoute from './components/route/route'
import ArchivePage from "./pages/archive/Archive"
import About from './pages/Information/about'
import { Heart } from 'lucide-react'
import Audit from './pages/Information/audit/audit'
import SignatoriesPage from './pages/Signatories/signatory'
import DocsPage from './pages/docs/docs'
import Settings from './pages/settings/Settings'
import { AppearanceProvider, resetAppearanceToDefaults } from './components/appearance-provider'
import { supabase } from '@/lib/supabase'

type Theme = 'dark' | 'light' | 'system'
type FontSize = 'small' | 'medium' | 'large'
type FontStyle = 'Inter' | 'Roboto' | 'Poppins' | 'Montserrat' | 'Open Sans'

const DEFAULT_THEME: Theme = 'dark'
const STORAGE_KEY = 'vite-ui-theme'

function resetThemeToDefaults() {
  localStorage.removeItem(STORAGE_KEY)
  const root = window.document.documentElement
  root.classList.remove('light', 'dark', 'system')
  root.classList.add(DEFAULT_THEME)
}

function Layout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/view/:id" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditPage /></ProtectedRoute>} />
          <Route path="/signatories" element={<ProtectedRoute><SignatoriesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/docs" element={<ProtectedRoute><DocsPage /></ProtectedRoute>} />
          <Route path="/forms/:formType" element={<ProtectedRoute><FormRouter /></ProtectedRoute>} />
        </Routes>
      </main>

      {!isAuthPage && (
        <footer className="sticky bottom-0 z-10 py-2 px-4 border-t border-border/40 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center py-3 text-xs">
            <div className="flex-1 text-left font-mono text-muted-foreground/50">
              <span>
                v{__APP_VERSION__} • built{" "}
                {new Date(__BUILD_DATE__).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-center font-medium text-muted-foreground/60">
              <span>Made with</span>
              <Heart className="h-3 w-3 fill-foreground text-foreground" />
              <span>by Rex & Jessie</span>
            </div>
            <div className="flex-1" />
          </div>
        </footer>
      )}
    </div>
  )
}

function App() {
  const [forcedTheme, setForcedTheme] = useState<Theme | null>(null)
  const [forcedFontSize, setForcedFontSize] = useState<FontSize | null>(null)
  const [forcedFontStyle, setForcedFontStyle] = useState<FontStyle | null>(null)

  useEffect(() => {
    async function fetchSettingsForUser(userId: string) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('theme, font_size, font_style')
        .eq('account_id', userId)
        .single()

      if (!error && data) {
        if (data.theme)      setForcedTheme(data.theme as Theme)
        if (data.font_size)  setForcedFontSize(data.font_size as FontSize)
        if (data.font_style) setForcedFontStyle(data.font_style as FontStyle)
      }
    }

    // Apply settings for whoever is already logged in on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchSettingsForUser(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          fetchSettingsForUser(session.user.id)
        }
        if (event === 'SIGNED_OUT') {
          // Reset everything — login page renders with clean defaults
          resetThemeToDefaults()
          resetAppearanceToDefaults()
          setForcedTheme(DEFAULT_THEME)
          setForcedFontSize(null)
          setForcedFontStyle(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider
      defaultTheme={DEFAULT_THEME}
      storageKey={STORAGE_KEY}
      forcedTheme={forcedTheme}
    >
      <AppearanceProvider
        forcedFontSize={forcedFontSize}
        forcedFontStyle={forcedFontStyle}
      >
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </AppearanceProvider>
    </ThemeProvider>
  )
}

export default App