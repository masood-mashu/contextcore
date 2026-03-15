import * as vscode from 'vscode';
import type { ContextResponse } from './client';

let currentPanel: vscode.WebviewPanel | null = null;

export function showContextPanel(
  context: vscode.ExtensionContext,
  ctx: ContextResponse | null
): void {
  // If panel already open, just update it
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    currentPanel.webview.html = buildHTML(ctx);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'contextcore.panel',
    'ContextCore',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  currentPanel.webview.html = buildHTML(ctx);

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    (msg: { command: string }) => {
      if (msg.command === 'refresh') {
        vscode.commands.executeCommand('contextcore.refreshContext');
      }
      if (msg.command === 'logMood') {
        vscode.commands.executeCommand('contextcore.logMood');
      }
    },
    undefined,
    context.subscriptions
  );

  currentPanel.onDidDispose(() => {
    currentPanel = null;
  });
}

export function updatePanel(ctx: ContextResponse): void {
  if (currentPanel) {
    currentPanel.webview.html = buildHTML(ctx);
  }
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildHTML(ctx: ContextResponse | null): string {
  if (!ctx) {
    return `<!DOCTYPE html><html><body style="background:#080810;color:#9090b0;
    font-family:monospace;padding:20px">
      <h3 style="color:#e8e8f0">⬡ ContextCore</h3>
      <p>Not connected. Start the API server first:</p>
      <code>node apps/api-server/dist/index.js</code>
    </body></html>`;
  }

  const stateColor: Record<string, string> = {
    deep_work:  '#00f5c4',
    scattered:  '#ffc46b',
    in_meeting: '#00c4ff',
    break:      '#6b6bff',
    unknown:    '#9090b0'
  };

  const color = stateColor[ctx.focus_state] ?? '#9090b0';

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #080810;
    color: #e8e8f0;
    font-family: 'Segoe UI', sans-serif;
    padding: 20px;
    font-size: 13px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .logo { font-size: 18px; font-weight: 800; color: #00f5c4; }
  .card {
    background: #161630;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .card-label {
    font-size: 10px;
    color: #5a5a7a;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .state-big { font-size: 24px; font-weight: 800; color: ${color}; }
  .score-bar {
    height: 4px;
    background: #1e1e3d;
    border-radius: 2px;
    margin-top: 10px;
  }
  .score-fill { height: 4px; border-radius: 2px; background: ${color}; }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .row:last-child { border-bottom: none; }
  .row-key { color: #9090b0; }
  .row-val { font-weight: 600; }
  .reason {
    background: rgba(0,245,196,0.06);
    border: 1px solid rgba(0,245,196,0.15);
    border-radius: 8px;
    padding: 12px;
    color: #9090b0;
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 12px;
  }
  button {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    margin-right: 8px;
  }
  .btn-primary { background: #00f5c4; color: #080810; }
  .btn-ghost {
    background: transparent;
    color: #9090b0;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .time { color: #5a5a7a; font-size: 11px; font-family: monospace; }
</style>
</head>
<body>
  <div class="header">
    <span style="font-size:20px">⬡</span>
    <span class="logo">ContextCore</span>
    <span class="time" style="margin-left:auto">
      ${new Date(ctx.inferred_at * 1000).toLocaleTimeString()}
    </span>
  </div>

  <div class="card">
    <div class="card-label">Focus State</div>
    <div class="state-big">${getFocusEmoji(ctx.focus_state)} ${getFocusLabel(ctx.focus_state)}</div>
    <div class="score-bar">
      <div class="score-fill" style="width:${ctx.focus_score * 10}%"></div>
    </div>
  </div>

  <div class="reason">${ctx.inference_reason}</div>

  <div class="card">
    <div class="row">
      <span class="row-key">Energy</span>
      <span class="row-val">${capitalize(ctx.energy_level)} (${ctx.energy_score}/10)</span>
    </div>
    <div class="row">
      <span class="row-key">Stress</span>
      <span class="row-val">${capitalize(ctx.stress_category)} (${ctx.stress_level}/10)</span>
    </div>
    <div class="row">
      <span class="row-key">Deep work today</span>
      <span class="row-val">${ctx.deep_work_minutes_today} min</span>
    </div>
    <div class="row">
      <span class="row-key">Meetings today</span>
      <span class="row-val">${ctx.meetings_today}</span>
    </div>
    ${ctx.active_project ? `
    <div class="row">
      <span class="row-key">Active project</span>
      <span class="row-val">${ctx.active_project}</span>
    </div>` : ''}
  </div>

  <button class="btn-primary" onclick="vsCode.postMessage({command:'refresh'})">
    ↻ Refresh
  </button>
  <button class="btn-ghost" onclick="vsCode.postMessage({command:'logMood'})">
    Log Mood
  </button>

  <script>const vsCode = acquireVsCodeApi();</script>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFocusEmoji(state: string): string {
  return { deep_work:'🎯', scattered:'🌀', in_meeting:'📅', break:'😴', unknown:'⚪' }[state] ?? '⚪';
}

function getFocusLabel(state: string): string {
  return { deep_work:'Deep Focus', scattered:'Scattered', in_meeting:'In Meeting', break:'Break', unknown:'Warming up' }[state] ?? state;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}