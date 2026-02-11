import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths"
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          dest: 'pdfjs'
        }
      ]
    })
  ],
  base: './',
  worker: {
    format: 'es',
    plugins: []
  },
  optimizeDeps: {
    include: [
      '@chakra-ui/react',
      '@chakra-ui/system',
      '@emotion/react',
      '@emotion/styled',
      'framer-motion',
      'copy-to-clipboard',
      'lodash.mergewith'
    ]
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
})