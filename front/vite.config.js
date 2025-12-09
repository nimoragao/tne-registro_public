import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
 
// Configuración de Vite para Electron + React
export default defineConfig({
  base: './', // 👈 rutas relativas (evita pantalla en blanco en Electron)
  plugins: [react()],
  build: {
    outDir: 'dist', // carpeta de salida del build
    emptyOutDir: true, // limpia la carpeta antes de construir
  },
  server: {
    port: 5173, // puerto en modo dev
    strictPort: true, // si está ocupado, no cambia de puerto
  },
})