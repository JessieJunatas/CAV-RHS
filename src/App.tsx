import './App.css'
import Home from './pages/home/home'
import { Navbar } from './pages/navbar'
import { ThemeProvider } from "@/components/theme-provider"


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Navbar />
      <Home/>
    </ThemeProvider>
  )
}

export default App
