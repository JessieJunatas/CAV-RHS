import './App.css'
import Home from './pages/home/home'
import ViewPage from './pages/view/PreviewPage'
import EditPage from './pages/edit/EditPage'
import { Navbar } from './pages/navbar'
import { ThemeProvider } from "@/components/theme-provider"
import LoginPage from "./pages/LoginPage/login"
import FormRouter from './pages/home/Content/Forms/FormRouter' 
import CAVPreview from './pages/home/Content/Forms/CAV/CAVpreview'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import ProtectedRoute from './components/route/route'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/view/:id" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<EditPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forms/cav/view/:id" element={<ProtectedRoute><CAVPreview /></ProtectedRoute>} />
          <Route path="/forms/:formType" element={<ProtectedRoute><FormRouter /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App