import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    dts({
      rollupTypes: true,
      insertTypesEntry: true,
      include: ['src/lib/**/*', 'src/index.ts', 'src/excel.ts'],
      exclude: ['src/demo/**/*'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        excel: resolve(__dirname, 'src/excel.ts'),
      },
      fileName: (format, entryName) => `${entryName === 'index' ? 'v-grid' : 'excel'}.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
    },
    minify: 'esbuild',
    cssMinify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      // zustand and xlsx are kept external to minimize bundle size.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'xlsx', 'zustand'],
      output: {
        // Inline the store chunk into the main bundle — eliminates stray createGridStore-*.js files
        inlineDynamicImports: false,
        manualChunks: undefined,
        // globals only needed for UMD/IIFE, not used here (ES + CJS only)
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    cssCodeSplit: false,
  },
  esbuild: {
    drop: ['console', 'debugger'],
    // Strip all comments (copyright/license) from the output
    legalComments: 'none',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
