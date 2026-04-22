import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.nextTick': 'Promise.resolve',
    process: 'null'
  },
  server: {
    hmr: {
      overlay: false
    }
  },

})
