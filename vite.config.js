import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react()],
  publicDir: '../public',
  build: {
    sourcemap: false,
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
