import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: cambia '/finance-app/' por '/NOMBRE-DE-TU-REPO/' antes de
// hacer deploy a GitHub Pages. Si usas un dominio custom o Vercel/Netlify,
// deja base: '/'.
export default defineConfig({
  plugins: [react()],
  base: '/myfinanceapp/',
})
