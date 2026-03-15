import * as http from 'http';

const API_BASE = '127.0.0.1';
const API_PORT = 7337;

export interface ContextResponse {
  focus_state:             string;
  focus_score:             number;
  energy_level:            string;
  energy_score:            number;
  stress_level:            number;
  stress_category:         string;
  active_project?:         string;
  active_app?:             string;
  deep_work_minutes_today: number;
  meetings_today:          number;
  inferred_at:             number;
  inference_reason:        string;
  confidence:              number;
}

export interface FocusResponse {
  focus_state: string;
  focus_score: number;
  suggestion:  string;
}

// Generic HTTP GET helper
function get(path: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: API_BASE,
      port:     API_PORT,
      path,
      method:   'GET',
      headers:  { 'X-ContextCore-Token': token }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    });

    req.on('error', reject);

    // 5 second timeout — don't hang VS Code if API is down
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('ContextCore API timeout'));
    });

    req.end();
  });
}

// Generic HTTP POST helper
function post(path: string, token: string, data: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req  = http.request({
      hostname: API_BASE,
      port:     API_PORT,
      path,
      method:   'POST',
      headers:  {
        'Content-Type':           'application/json',
        'X-ContextCore-Token':    token,
        'Content-Length':         Buffer.byteLength(body)
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(resBody)); }
        catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isApiRunning(): Promise<boolean> {
  try {
    await get('/health', '');
    return true;
  } catch {
    return false;
  }
}

export async function getContext(token: string): Promise<ContextResponse> {
  const res = await get('/context', token);
  return res.context;
}

export async function getFocus(token: string): Promise<FocusResponse> {
  return await get('/context/focus', token);
}

export async function logMood(
  token: string,
  mood: number,
  energy: number,
  note?: string
): Promise<void> {
  await post('/mood', token, { mood, energy, note });
}