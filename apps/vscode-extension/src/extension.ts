import * as vscode from 'vscode';
import { isApiRunning, getContext, logMood } from './client';
import { createStatusBar, updateStatusBar, setStatusBarOffline, setStatusBarConnecting } from './statusBar';
import { showContextPanel, updatePanel } from './panel';
import type { ContextResponse } from './client';

let pollInterval: NodeJS.Timeout | null = null;
let lastContext:  ContextResponse | null = null;
let lastNotifState = '';
let lastNotifTime  = 0;

// ─── Activate ─────────────────────────────────────────────────────────────────
// Called once when VS Code loads the extension

export function activate(context: vscode.ExtensionContext): void {
  console.log('[ContextCore] Extension activated');

  // Create status bar item
  createStatusBar(context);
  setStatusBarConnecting();

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand('contextcore.showPanel', () => {
      showContextPanel(context, lastContext);
    }),

    vscode.commands.registerCommand('contextcore.refreshContext', async () => {
      await fetchAndUpdate();
      vscode.window.setStatusBarMessage('ContextCore refreshed', 2000);
    }),

    vscode.commands.registerCommand('contextcore.logMood', async () => {
      await openMoodPicker();
    }),

    vscode.commands.registerCommand('contextcore.setToken', async () => {
      const token = await vscode.window.showInputBox({
        prompt:      'Enter your ContextCore API token',
        placeHolder: 'cc-dev-token-2024',
        password:    true
      });
      if (token) {
        await vscode.workspace.getConfiguration('contextcore')
          .update('apiToken', token, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('✓ ContextCore token saved!');
        fetchAndUpdate();
      }
    })
  );

  // Start polling the API every 2 minutes
  fetchAndUpdate();
  pollInterval = setInterval(fetchAndUpdate, 2 * 60 * 1000);

  context.subscriptions.push({
    dispose: () => {
      if (pollInterval) clearInterval(pollInterval);
    }
  });
}

// ─── Deactivate ───────────────────────────────────────────────────────────────

export function deactivate(): void {
  if (pollInterval) clearInterval(pollInterval);
}

// ─── Core fetch loop ──────────────────────────────────────────────────────────

async function fetchAndUpdate(): Promise<void> {
  const token = vscode.workspace
    .getConfiguration('contextcore')
    .get<string>('apiToken', 'cc-dev-token-2024');

  // Check if API is running first
  const running = await isApiRunning();
  if (!running) {
    setStatusBarOffline();
    return;
  }

  try {
    const ctx = await getContext(token);
    lastContext = ctx;
    updateStatusBar(ctx);
    updatePanel(ctx);
    checkAndNotify(ctx);
  } catch (err) {
    console.error('[ContextCore] Fetch error:', err);
    setStatusBarOffline();
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
// Nudges when focus state changes — with a cooldown so it's not annoying

function checkAndNotify(ctx: ContextResponse): void {
  const config      = vscode.workspace.getConfiguration('contextcore');
  const notifEnabled = config.get<boolean>('notifications', true);
  if (!notifEnabled) return;

  const now      = Date.now();
  const cooldown = 20 * 60 * 1000; // 20 min between notifications

  if (ctx.focus_state === 'scattered' && lastNotifState !== 'scattered') {
    if (now - lastNotifTime > cooldown) {
      vscode.window.showInformationMessage(
        '🌀 ContextCore: You seem scattered. Try a 25-min Pomodoro?',
        'Start Timer', 'Dismiss'
      ).then((choice: string | undefined) => {
        if (choice === 'Start Timer') startPomodoroTimer();
      });
      lastNotifState = 'scattered';
      lastNotifTime  = now;
    }
  }

  if (ctx.focus_state === 'deep_work' && lastNotifState !== 'deep_work') {
    // Silently note the state change — don't interrupt deep work!
    lastNotifState = 'deep_work';
    lastNotifTime  = now;
  }
}

// ─── Mood picker ──────────────────────────────────────────────────────────────

async function openMoodPicker(): Promise<void> {
  const token = vscode.workspace
    .getConfiguration('contextcore')
    .get<string>('apiToken', 'cc-dev-token-2024');

  const moodPick = await vscode.window.showQuickPick([
    { label: '😩 1 — Rough',  value: 1 },
    { label: '😔 2 — Low',    value: 2 },
    { label: '😐 3 — Okay',   value: 3 },
    { label: '🙂 4 — Good',   value: 4 },
    { label: '🤩 5 — Great',  value: 5 }
  ], { placeHolder: 'How do you feel right now?' });

  if (!moodPick) return;

  const energyPick = await vscode.window.showQuickPick([
    { label: '💤 1 — Drained', value: 1 },
    { label: '🪫 2 — Low',     value: 2 },
    { label: '🔋 3 — Okay',    value: 3 },
    { label: '⚡ 4 — High',    value: 4 },
    { label: '🔥 5 — Wired',   value: 5 }
  ], { placeHolder: 'Energy level?' });

  if (!energyPick) return;

  await logMood(token, moodPick.value, energyPick.value);
  vscode.window.setStatusBarMessage('✓ Mood logged to ContextCore', 3000);

  // Refresh context after mood is logged
  await fetchAndUpdate();
}

// ─── Pomodoro timer ───────────────────────────────────────────────────────────

function startPomodoroTimer(): void {
  let remaining = 25 * 60;

  const timer = setInterval(() => {
    remaining--;
    const min = Math.floor(remaining / 60).toString().padStart(2, '0');
    const sec = (remaining % 60).toString().padStart(2, '0');
    vscode.window.setStatusBarMessage(`🎯 Focus: ${min}:${sec}`);

    if (remaining <= 0) {
      clearInterval(timer);
      vscode.window.showInformationMessage('✅ 25-minute focus session complete!');
    }
  }, 1000);
}