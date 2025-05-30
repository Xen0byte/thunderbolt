import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'extension/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'extension/popup/index.html',
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
  },
  server: {
    port: 5173,
    open: '/extension/popup/index.html',
  },
})
