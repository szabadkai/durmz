import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/durmz/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/synthesis/engines/')) return 'synthesis-core';
          if (id.includes('/audioworklet/')) return 'audioworklet';
          if (id.includes('/midi/')) return 'midi';
          if (id.includes('/components/')) return 'ui-components';
        }
      }
    },
    // Enable SharedArrayBuffer for high-performance synthesis
    target: 'esnext'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  optimizeDeps: {
    exclude: ['*.worklet.ts']
  }
})
