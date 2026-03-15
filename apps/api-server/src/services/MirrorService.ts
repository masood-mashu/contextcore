import http from 'http';
import { ContextStateRepository, MirrorRepository } from '@contextcore/database';

const contextRepo = new ContextStateRepository();
const mirrorRepo  = new MirrorRepository();

const OLLAMA_HOST  = 'localhost';
const OLLAMA_PORT  = 11434;
const OLLAMA_MODEL = 'phi3:mini';

export async function generateMirror(forceRegenerate = false): Promise<string> {
  const today  = new Date().toISOString().split('T')[0];
  const cached = await mirrorRepo.getByDate(today);

  if (cached && !forceRegenerate) {
    return cached.summary;
  }

  const history = await contextRepo.getHistory(24);

  if (history.length === 0) {
    const msg = "Not enough data yet — keep working and check back tomorrow!";
    await mirrorRepo.upsert(today, msg, 'rule-based');
    return msg;
  }

  const digest = buildDigest(history);

  try {
    const ollamaRunning = await isOllamaRunning();
    console.log('[Mirror] Ollama running:', ollamaRunning);
    if (ollamaRunning) {
      console.log('[Mirror] Calling Ollama...');
      const summary = await callOllama(digest);
      console.log('[Mirror] Ollama response received');
      await mirrorRepo.upsert(today, summary, OLLAMA_MODEL);
      return summary;
    }
  } catch (err) {
    console.log('[Mirror] Ollama error:', err);
  }

  const summary = buildRuleBasedSummary(digest);
  await mirrorRepo.upsert(today, summary, 'rule-based');
  return summary;
}

function buildDigest(history: any[]) {
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 5;

  return {
    avgFocus:  avg(history.map(s => s.focus_score)),
    avgEnergy: avg(history.map(s => s.energy_score)),
    avgStress: avg(history.map(s => s.stress_level)),
    deepWork:  Math.max(...history.map(s => s.deep_work_minutes_today)),
    meetings:  Math.max(...history.map(s => s.meetings_today)),
    dominant:  mostCommon(history.map(s => s.focus_state)),
    peakHour:  findPeakHour(history),
    date:      new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
  };
}

async function isOllamaRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: '/api/tags', method: 'GET' },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function callOllama(digest: any): Promise<string> {
  const prompt = buildPrompt(digest);

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:   OLLAMA_MODEL,
      prompt,
      stream:  false,
      options: { temperature: 0.7, num_predict: 150 }
    });

    const req = http.request({
      hostname: OLLAMA_HOST,
      port:     OLLAMA_PORT,
      path:     '/api/generate',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.response?.trim() ?? buildRuleBasedSummary(digest));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Ollama timeout'));
    });

    req.write(body);
    req.end();
  });
}

function buildPrompt(d: any): string {
  return `You are ContextCore Mirror — a private, honest daily debrief AI.
Speak directly to the user in 2nd person. Be concise (3-4 sentences max).
Be warm but data-driven. End with one concrete suggestion for tomorrow.

Today's data (${d.date}):
- Average focus score: ${d.avgFocus.toFixed(1)}/10
- Average energy score: ${d.avgEnergy.toFixed(1)}/10
- Average stress score: ${d.avgStress.toFixed(1)}/10
- Deep work: ${d.deepWork} minutes
- Meetings: ${d.meetings}
- Dominant focus state: ${d.dominant}
${d.peakHour ? `- Peak focus hour: ${d.peakHour}:00` : ''}

Write the debrief now (no preamble, start directly):`;
}

function buildRuleBasedSummary(d: any): string {
  const parts: string[] = [];
  if (d.avgFocus >= 7) {
    parts.push(`Strong focus day — averaged ${d.avgFocus.toFixed(1)}/10 with ${d.deepWork} min of deep work.`);
  } else if (d.avgFocus >= 5) {
    parts.push(`Decent day with ${d.deepWork} min of deep work, though focus varied throughout.`);
  } else {
    parts.push(`Fragmented day — only ${d.deepWork} min of deep work. Focus averaged ${d.avgFocus.toFixed(1)}/10.`);
  }
  if (d.meetings > 3) parts.push(`${d.meetings} meetings likely drained your energy budget.`);
  if (d.avgStress >= 6) {
    parts.push(`Stress was elevated. Try protecting your first hour tomorrow.`);
  } else {
    parts.push(`Stress stayed manageable. Good.`);
  }
  parts.push(d.avgFocus < 5
    ? `Tomorrow: block 9–11 AM for focused work.`
    : `Tomorrow: build on today's momentum.`);
  return parts.join(' ');
}

function mostCommon(arr: string[]): string {
  const freq: Record<string, number> = {};
  arr.forEach(v => freq[v] = (freq[v] ?? 0) + 1);
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
}

function findPeakHour(history: any[]): number | null {
  if (!history.length) return null;
  return new Date([...history].sort((a, b) => b.focus_score - a.focus_score)[0].inferred_at * 1000).getHours();
}