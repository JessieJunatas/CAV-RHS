import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import pkg from "./package.json"   

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})