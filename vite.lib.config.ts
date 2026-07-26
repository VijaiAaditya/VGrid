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
      include: ['src/lib/**/*', 'src/excel.ts'],
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
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'xlsx', 'zustand'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          zustand: 'create',
          xlsx: 'XLSX',
        },
      },
    },
    cssCodeSplit: false,
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
