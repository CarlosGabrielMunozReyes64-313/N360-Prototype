import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config aparte de vite.config.ts a propósito: las pruebas no necesitan el
// plugin de Babel del React Compiler (solo optimiza el build) y saltárselo
// hace que la suite arranque bastante más rápido.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./pruebas/setup.ts'],
    include: ['pruebas/**/*.test.ts', 'pruebas/**/*.test.tsx', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**', 'src/data/**', 'src/export/**'],
    },
  },
})
