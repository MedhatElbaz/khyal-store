import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For a GitHub Pages project site, set VITE_BASE_PATH=/repository-name/
// in the GitHub Actions workflow or build environment.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})
