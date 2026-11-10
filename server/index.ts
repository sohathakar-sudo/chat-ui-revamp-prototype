// Small relay server: holds provider keys, relays requests, stores and logs nothing.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, type ChatTurn, type VoiceName } from '../shared/config.ts';
import { getReplyProvider, getSpeakProvider, getTranscribeProvider } from './providers/index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '../web/dist');
const PORT = Number(process.env.PORT) || config.serverPort;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2',
};

function readBody(req: http.IncomingMessage, limit = 25 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Keep the last N turns, start on a user turn, merge consecutive same-role turns. */
function prepareMessages(turns: ChatTurn[]): ChatTurn[] {
  const recent = turns
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-config.maxTurnsSentToLLM);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  const merged: ChatTurn[] = [];
  for (const t of recent) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content += '\n' + t.content;
    else merged.push({ role: t.role, content: t.content });
  }
  return merged;
}

async function handleReply(req: http.IncomingMessage, res: http.ServerResponse) {
  const { messages } = JSON.parse((await readBody(req)).toString() || '{}') as { messages?: ChatTurn[] };
  const prepared = prepareMessages(Array.isArray(messages) ? messages : []);
  if (!prepared.length) return json(res, 400, { error: 'no user message' });

  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs * 4);

  res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' });
  try {
    for await (const text of getReplyProvider().reply(prepared, config.persona, controller.signal)) {
      res.write(JSON.stringify({ t: text }) + '\n');
    }
    res.write(JSON.stringify({ done: true }) + '\n');
  } catch (err) {
    if (!controller.signal.aborted) {
      // Error type only; never the conversation content.
      console.error('reply failed:', (err as Error)?.name ?? 'error');
      res.write(JSON.stringify({ error: 'reply_failed' }) + '\n');
    }
  } finally {
    clearTimeout(timeout);
    res.end();
  }
}

async function handleTranscribe(req: http.IncomingMessage, res: http.ServerResponse) {
  const provider = getTranscribeProvider();
  if (!provider) return json(res, 501, { error: 'not_configured' });
  const audio = await readBody(req);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const text = await provider.transcribe(audio, String(req.headers['content-type'] || 'audio/webm'), controller.signal);
    json(res, 200, { text });
  } catch {
    json(res, 502, { error: 'transcribe_failed' });
  } finally { clearTimeout(t); }
}

async function handleSpeak(req: http.IncomingMessage, res: http.ServerResponse) {
  const provider = getSpeakProvider();
  if (!provider) return json(res, 501, { error: 'not_configured' });
  const { text, voice } = JSON.parse((await readBody(req)).toString() || '{}') as { text?: string; voice?: VoiceName };
  const v = voice && voice in config.voices ? voice : config.defaultVoice;
  if (!text) return json(res, 400, { error: 'no text' });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const out = await provider.speak(text, v, config.voices[v].providerVoiceId, controller.signal);
    res.writeHead(200, {
      'content-type': out.mimeType,
      'x-word-timings': out.timings ? encodeURIComponent(JSON.stringify(out.timings)) : '',
    });
    res.end(out.audio);
  } catch {
    json(res, 502, { error: 'speak_failed' });
  } finally { clearTimeout(t); }
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(distDir, url);
  if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(distDir, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404); res.end('Run "npm run build" first, or use "npm run dev".'); return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const url = (req.url || '').split('?')[0];
    if (url === '/api/status' && req.method === 'GET') {
      return json(res, 200, {
        llm: getReplyProvider().name,
        stt: getTranscribeProvider() ? 'server' : 'browser',
        tts: getSpeakProvider() ? 'server' : 'browser',
      });
    }
    if (url === '/api/reply' && req.method === 'POST') return await handleReply(req, res);
    if (url === '/api/transcribe' && req.method === 'POST') return await handleTranscribe(req, res);
    if (url === '/api/speak' && req.method === 'POST') return await handleSpeak(req, res);
    if (url.startsWith('/api/')) return json(res, 404, { error: 'not found' });
    serveStatic(req, res);
  } catch {
    if (!res.headersSent) json(res, 500, { error: 'server_error' });
    else res.end();
  }
}).listen(PORT, () => {
  console.log(`Wysa prototype server on http://localhost:${PORT} (LLM: ${getReplyProvider().name})`);
});
