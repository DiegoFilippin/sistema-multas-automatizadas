import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Configuração para servir arquivos estáticos corretamente
  publicDir: 'public',
  assetsInclude: ['**/*.worker.js', '**/*.worker.min.js'],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  }
})
