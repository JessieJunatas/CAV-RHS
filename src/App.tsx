import './App.css'
import { useEffect } from 'react'
import Home from './pages/home/homeData'
import ViewPage from './pages/view/PreviewPage'
import EditPage from './pages/edit/EditPage'
import { Navbar } from './pages/navbar'
import { ThemeProvider } from "@/context/theme-provider"
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
import PDFFieldEditor from './components/pdf-editor'

const DEFAULT_THEME = 'dark'
const STORAGE_KEY = 'vite-ui-theme'

async function applyUserTheme(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme')
    .eq('account_id', userId)
    .single()

  if (!error && data?.theme) {
    localStorage.setItem(STORAGE_KEY, data.theme)
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(data.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : data.theme
    )
  }
}

function resetThemeToDefaults() {
  localStorage.removeItem(STORAGE_KEY)
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(DEFAULT_THEME)
}

// Routes where the footer and normal scroll layout should not apply.
// These are fullscreen tool pages that manage their own layout.
const FULLSCREEN_TOOL_ROUTES = ['/settings/pdf-template']

function Layout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const isFullscreenTool = FULLSCREEN_TOOL_ROUTES.includes(location.pathname)

  return (
    <div className={isFullscreenTool ? "flex flex-col h-screen overflow-hidden" : "flex flex-col min-h-screen"}>
      {!isAuthPage && <Navbar />}

      <main className={isFullscreenTool ? "flex-1 overflow-hidden" : "flex-1"}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/view/:id" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditPage /></ProtectedRoute>} />
          <Route path="/signatories" element={<ProtectedRoute><SignatoriesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/pdf-template" element={<ProtectedRoute><PDFFieldEditor supabase={supabase} bucketName="templates" /></ProtectedRoute>} />          <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/docs" element={<ProtectedRoute><DocsPage /></ProtectedRoute>} />
          <Route path="/forms/:formType" element={<ProtectedRoute><FormRouter /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Footer hidden on auth pages AND fullscreen tool pages */}
      {!isAuthPage && !isFullscreenTool && (
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
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) applyUserTheme(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        applyUserTheme(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        resetThemeToDefaults()
        resetAppearanceToDefaults()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider defaultTheme={DEFAULT_THEME} storageKey={STORAGE_KEY}>
      <AppearanceProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </AppearanceProvider>
    </ThemeProvider>
  )
}

export default App