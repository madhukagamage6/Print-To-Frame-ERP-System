import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenAI } from '@google/genai'

function apiProxyPlugin() {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url === '/api/generate' || req.url === '/api/generate-invoice') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured' }));
                return;
              }

              const ai = new GoogleGenAI({ apiKey });
              const { prompt, mimeType, audioData } = parsed;

              if (!prompt) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing "prompt" field in request body' }));
                return;
              }

              const contents = [{ role: 'user', parts: [{ text: prompt }] }];
              if (mimeType && audioData) {
                contents[0].parts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: audioData
                  }
                });
              }

              const response = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents,
              });

              if (!response.text) {
                throw new Error('No text content in Gemini response');
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: response.text }));
            } catch (err) {
              console.error('API Proxy Error:', err.message);
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors out of the entry chunk. The big wins are docx and
        // recharts (used by only a couple of routes); lucide-react is imported
        // icon-by-icon everywhere, so its chunk buys cache stability rather
        // than a smaller initial download.
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          'vendor-sentry': ['@sentry/react'],
          'vendor-charts': ['recharts'],
          'vendor-docx': ['docx'],
          'vendor-genai': ['@google/genai'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})

