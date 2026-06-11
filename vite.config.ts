import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/')) {
            try {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const apiPath = url.pathname.replace('/api/', '');

              // Handle dynamic routes
              let filename = apiPath;
              let pathOverride: string | null = null;
              if (apiPath.startsWith('get-card-by-slug/')) {
                filename = 'get-card-by-slug';
              } else if (apiPath.startsWith('v1/')) {
                filename = 'apple-webhook';
                pathOverride = apiPath.replace('v1/', '');
              }

              const filePath = path.join(process.cwd(), 'api', `${filename}.ts`);

              if (fs.existsSync(filePath)) {
                // Query parsing
                (req as any).query = Object.fromEntries(url.searchParams);
                if (pathOverride !== null) {
                  (req as any).query.path = pathOverride;
                }
                // Body parsing for JSON
                if (req.method === 'POST' || req.method === 'PUT') {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const rawBuffer = Buffer.concat(buffers);
                  (req as any).__rawBody = rawBuffer; // Export for Stripe verification
                  const data = rawBuffer.toString();
                  if (data) {
                    try {
                      (req as any).body = JSON.parse(data);
                    } catch (e) {
                      // If JSON parsing fails (e.g., Stripe webhooks or binary), ignore
                      (req as any).body = {};
                    }
                  } else {
                    (req as any).body = {};
                  }
                }

                // Polyfill res.status and res.json for Vercel-like API
                if (!(res as any).status) {
                  (res as any).status = (statusCode: number) => {
                    res.statusCode = statusCode;
                    return res;
                  };
                }

                if (!(res as any).json) {
                  (res as any).json = (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return res;
                  };
                }

                if (!(res as any).send) {
                  (res as any).send = (body: any) => {
                    if (Buffer.isBuffer(body)) {
                      res.end(body);
                    } else if (typeof body === 'object') {
                      if (!res.getHeader('Content-Type')) {
                        res.setHeader('Content-Type', 'application/json');
                      }
                      res.end(JSON.stringify(body));
                    } else {
                      res.end(body);
                    }
                    return res;
                  };
                }

                // Invalidate cache to allow hot reloading of API files
                const mod = await server.ssrLoadModule(filePath);

                // Execute the handler with Node.js native req/res (Vercel style)
                try {
                  await mod.default(req, res);
                } catch (err) {
                  console.error('API execution error:', err);
                  throw err;
                }
                return;
              }
            } catch (error: unknown) {
              console.error('API handler error:', error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              const errorStack = error instanceof Error ? error.stack : '';
              fs.appendFileSync('debug.log', `API Handler Error: ${errorMessage}\n${errorStack}\n`);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Internal server error', details: errorMessage }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(process.env.VITE_USE_MOCK_CLERK === 'true'
        ? { "@clerk/clerk-react": path.resolve(__dirname, "./src/components/MockClerk.tsx") }
        : {}),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Keep huge, isolated libraries separate
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('@clerk')) return 'vendor-clerk';
            
            // Group React and everything else into core to fix circularity
            return 'vendor-core'; 
          }
        }
      }
    }
  }
})
