import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin para capturar retorno POST de pasarelas de pago (Flow) y convertir a GET
function flowPostReturnPlugin(): Plugin {
  return {
    name: 'flow-post-return-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url && req.url.startsWith('/catalogo')) {
          // Responder 303 See Other para forzar navegación GET preservando query parameters
          res.writeHead(303, { Location: req.url });
          res.end();
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), flowPostReturnPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
