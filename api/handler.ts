import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any = null;
let loadError: Error | null = null;

try {
  app = (await import('../server/index.js')).default;
} catch (e: any) {
  loadError = e;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (loadError || !app) {
    res.status(500).json({
      error: 'Module load failed',
      message: loadError?.message ?? 'unknown',
      stack: loadError?.stack?.split('\n').slice(0, 5),
    });
    return;
  }
  app(req, res);
}
