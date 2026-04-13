// Handler voor POST /api/scan/foot — Claude Vision analyse van een voetfoto.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'scan-foot.md');
const SYSTEM_PROMPT = readFileSync(PROMPT_PATH, 'utf8');

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

function detectMimeFromBase64(b64) {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

export async function handleScanFoot(body, apiKey) {
  if (!body || typeof body.image_base64 !== 'string' || body.image_base64.length < 100) {
    return { status: 400, body: { error: 'image_base64 ontbreekt of is te kort' } };
  }
  const withA4 = body.with_a4_scale !== false;

  const raw = body.image_base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const mediaType = detectMimeFromBase64(raw);

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: raw } },
        { type: 'text', text: `Analyseer deze voetfoto. with_a4_scale=${withA4}` },
      ],
    }],
  });

  const text = response.content.map((c) => c.text || '').join('');
  try {
    const parsed = extractJson(text);
    return { status: 200, body: parsed };
  } catch (err) {
    console.error('scan-foot JSON parse fout:', text);
    return { status: 502, body: { confidence: 'low', message_to_user: 'De foto was niet goed bruikbaar. Probeer opnieuw met betere verlichting.' } };
  }
}
