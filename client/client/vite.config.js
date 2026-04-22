import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.svg', '*.png', '*.ico'],
      manifest: {
        name: 'Local Mesh Alert System',
        short_name: 'MeshAlert',
        description: 'BLE + WebRTC emergency mesh - offline capable',
        theme_color: '#dc3545',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  define: {
    global: 'globalThis',
    'process.nextTick': 'Promise.resolve',
    process: 'null'
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
