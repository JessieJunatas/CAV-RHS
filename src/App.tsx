import './App.css'
import Home from './pages/home/homeData'
import ViewPage from './pages/view/PreviewPage'
import EditPage from './pages/edit/EditPage'
import { Navbar } from './pages/navbar'
import { ThemeProvider } from "@/components/theme-provider"
import LoginPage from "./pages/LoginPage/login"
import FormRouter from './pages/home/Content/Forms/FormRouter'
import CAVPreview from './pages/home/Content/Forms/CAV/CAVpreview'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import ProtectedRoute from './components/route/route'
import Archive from "./pages/archive/Archive"
import About from './pages/Information/about'
import { Heart } from 'lucide-react'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/view/:id" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
              <Route path="/edit/:id" element={<EditPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
              <Route path="/forms/cav/view/:id" element={<ProtectedRoute><CAVPreview /></ProtectedRoute>} />
              <Route path="/forms/:formType" element={<ProtectedRoute><FormRouter /></ProtectedRoute>} />
            </Routes>
          </main>

          <footer className="py-2 px-4 border-t border-border/40 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center py-3 text-xs">

              <div className="flex-1 text-left font-mono text-muted-foreground/30">
                <span>
                  v{__APP_VERSION__} • built{" "}
                  {new Date(__BUILD_DATE__).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 justify-center font-medium text-muted-foreground/50">
                <span>Made with</span>
                <Heart className="h-3 w-3 fill-foreground text-foreground" />
                <span>by Rex & Jessie</span>
              </div>

              <div className="flex-1" />

            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App