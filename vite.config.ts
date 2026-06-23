import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import fs from 'fs'

function viewerAssetsPlugin() {
  return {
    name: 'viewer-assets',
    configureServer(server: any) {
      server.middlewares.use('/api/viewer-assets', (_req: any, res: any) => {
        const distPath = path.resolve(__dirname, 'dist')
        if (!fs.existsSync(distPath)) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not built' }))
          return
        }
        
        const files: { path: string, content: string }[] = []
        function walk(dir: string, base: string) {
          for (const item of fs.readdirSync(dir)) {
            const itemPath = path.join(dir, item)
            if (fs.statSync(itemPath).isDirectory()) {
              walk(itemPath, path.join(base, item))
            } else {
              const content = fs.readFileSync(itemPath, 'base64')
              files.push({ path: path.join(base, item).replace(/\\/g, '/'), content })
            }
          }
        }
        walk(distPath, '')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), viewerAssetsPlugin()],
  server: {
    proxy: {
      '/api/fin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@thatopen/fragments', 'web-ifc'],
  },
  worker: {
    format: 'es',
  },
  build: {
    // Disable chunk size warning
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        viewer: path.resolve(__dirname, 'viewer.html')
      },
      output: {
        // Manual chunking to avoid OOM during build
        manualChunks: {
          'three': ['three'],
          'thatopen': ['@thatopen/fragments', '@thatopen/components'],
          'react': ['react', 'react-dom'],
        }
      }
    }
  }
})
