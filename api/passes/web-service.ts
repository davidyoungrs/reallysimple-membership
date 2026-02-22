import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function handler(req: VercelRequest, res: VercelResponse) {
    res.status(200).json({ method: req.method, query: req.query });
}
