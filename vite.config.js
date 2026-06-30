import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/analyze-resume': 'https://placementgpt-backend.onrender.com',
      '/chat': 'https://placementgpt-backend.onrender.com',
    },
  },
})