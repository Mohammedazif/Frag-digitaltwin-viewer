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
      server.middlewares.use('/viewer-assets.json', (_req: any, res: any) => {
        const distPath = path.resolve(__dirname, 'dist')
        const templatesPath = path.resolve(__dirname, 'templates')
        const staticPath = path.resolve(__dirname, 'static')
        
        const files: { path: string, content: string }[] = []
        function walk(dir: string, base: string) {
          if (!fs.existsSync(dir)) return
          for (const item of fs.readdirSync(dir)) {
            const itemPath = path.join(dir, item)
            if (fs.statSync(itemPath).isDirectory()) {
              walk(itemPath, path.join(base, item))
            } else {
              if (item === 'viewer-assets.json') continue;
              const content = fs.readFileSync(itemPath, 'base64')
              files.push({ path: path.join(base, item).replace(/\\/g, '/'), content })
            }
          }
        }
        if (fs.existsSync(distPath)) {
          walk(distPath, '')
        }
        if (fs.existsSync(templatesPath)) {
          walk(templatesPath, 'templates')
        }
        if (fs.existsSync(staticPath)) {
          walk(staticPath, 'static')
        }
        
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })
    },
    closeBundle() {
      const distPath = path.resolve(__dirname, 'dist')
      const templatesPath = path.resolve(__dirname, 'templates')
      const staticPath = path.resolve(__dirname, 'static')
      if (!fs.existsSync(distPath)) return
      const outPath = path.join(distPath, 'viewer-assets.json')
      
      const files: { path: string, content: string }[] = []
      function walk(dir: string, base: string) {
        if (!fs.existsSync(dir)) return
        for (const item of fs.readdirSync(dir)) {
          const itemPath = path.join(dir, item)
          if (fs.statSync(itemPath).isDirectory()) {
            walk(itemPath, path.join(base, item))
          } else {
            if (item === 'viewer-assets.json') continue;
            const content = fs.readFileSync(itemPath, 'base64')
            files.push({ path: path.join(base, item).replace(/\\/g, '/'), content })
          }
        }
      }
      walk(distPath, '')
      walk(templatesPath, 'templates')
      walk(staticPath, 'static')
      fs.writeFileSync(outPath, JSON.stringify(files))
    }
  }
}

function backendFilesPlugin() {
  const backendPath = path.resolve(__dirname, 'backend')
  return {
    name: 'backend-files',
    configureServer(server: any) {
      server.middlewares.use('/backend', (req: any, res: any, next: any) => {
        // Strip query string and decode
        const rawUrl: string = req.url || ''
        const urlPath = rawUrl.split('?')[0]
        const filePath = path.join(backendPath, urlPath)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8')
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(content)
        } else {
          next()
        }
      })
    }
  }
}

function templatesPlugin() {
  const templatesPath = path.resolve(__dirname, 'templates')
  return {
    name: 'templates-plugin',
    configureServer(server: any) {
      server.middlewares.use('/templates', (req: any, res: any, next: any) => {
        const rawUrl: string = req.url || ''
        const urlPath = rawUrl.split('?')[0]
        
        if (urlPath === '' || urlPath === '/') {
          res.writeHead(301, { Location: '/templates/index.html' })
          res.end()
          return
        }
        
        const filePath = path.join(templatesPath, urlPath)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8')
          if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8')
          else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8')
          else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(content)
        } else {
          next()
        }
      })
    }
  }
}

function staticFolderPlugin() {
  const staticPath = path.resolve(__dirname, 'static')
  return {
    name: 'static-folder-plugin',
    configureServer(server: any) {
      server.middlewares.use('/static', (req: any, res: any, next: any) => {
        const rawUrl: string = req.url || ''
        const urlPath = rawUrl.split('?')[0]
        
        const filePath = path.join(staticPath, urlPath)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf-8')
          if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8')
          else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8')
          else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(content)
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), wasm(), topLevelAwait(), viewerAssetsPlugin(), backendFilesPlugin(), templatesPlugin(), staticFolderPlugin()],
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
