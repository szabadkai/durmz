import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'synthesis-core': ['./src/synthesis/engines'],
          'audioworklet': ['./src/audioworklet'],
          'midi': ['./src/midi'],
          'ui-components': ['./src/components']
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
