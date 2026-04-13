// POST /api/scan/gait — MediaPipe pose-frames naar Claude (Vercel serverless wrapper).
import { handleScanGait } from '../../backend/handlers/scan-gait.js';
import { applyCors, checkAuth, checkRate, readJsonBody, requireApiKey } from '../_lib/shared.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // pose-frames JSON is typisch ~50-100 KB
    },
  },
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!checkAuth(req, res)) return;
  if (!checkRate(req, res)) return;
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  try {
    const body = await readJsonBody(req);
    const { status, body: resBody } = await handleScanGait(body, apiKey);
    res.status(status).json(resBody);
  } catch (err) {
    console.error('scan-gait handler crash:', err);
    res.status(500).json({ confidence: 'low', message_to_user: 'Er ging iets mis. Probeer opnieuw.' });
  }
}
