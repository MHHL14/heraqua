// Handler voor POST /api/scan/gait — Claude-analyse van een MediaPipe pose-tijdreeks.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'scan-gait.md');
const SYSTEM_PROMPT = readFileSync(PROMPT_PATH, 'utf8');

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

function downsampleFrames(frames, targetCount = 90) {
  if (!Array.isArray(frames) || frames.length <= targetCount) return frames || [];
  const step = Math.floor(frames.length / targetCount);
  const out = [];
  for (let i = 0; i < frames.length; i += step) out.push(frames[i]);
  return out;
}

function compactFrames(frames) {
  return frames.map((f) => ({
    t: Number(f.t?.toFixed?.(3) ?? f.t),
    lm: (f.landmarks || f.lm || []).map((p) => p.map((v) => Number(v?.toFixed?.(3) ?? v))),
  }));
}

export async function handleScanGait(body, apiKey) {
  if (!body || !Array.isArray(body.frames)) {
    return { status: 400, body: { error: 'frames ontbreekt' } };
  }
  const frames = compactFrames(downsampleFrames(body.frames));
  const summary = {
    fps: body.fps || 30,
    duration_sec: body.duration_sec || 0,
    num_passes: body.num_passes || 0,
    frame_count: frames.length,
  };

  if (summary.num_passes < 3) {
    return {
      status: 200,
      body: {
        confidence: 'low',
        message_to_user: 'Ik heb te weinig van je looppassen kunnen zien. Probeer opnieuw met 3 of meer volledige passes voor de camera.',
      },
    };
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: `Pose-data samenvatting: ${JSON.stringify(summary)}\n\nFrames (gedownsampled):\n${JSON.stringify(frames)}`,
      }],
    }],
  });

  const text = response.content.map((c) => c.text || '').join('');
  try {
    const parsed = extractJson(text);
    return { status: 200, body: parsed };
  } catch (err) {
    console.error('scan-gait JSON parse fout:', text);
    return { status: 502, body: { confidence: 'low', message_to_user: 'Ik kon je loopstijl niet goed interpreteren. Probeer opnieuw.' } };
  }
}
