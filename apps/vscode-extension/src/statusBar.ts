import * as vscode from 'vscode';
import type { ContextResponse } from './client';

let statusBarItem: vscode.StatusBarItem | null = null;

export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100  // priority — higher = further left
  );

  statusBarItem.command = 'contextcore.showPanel';
  statusBarItem.tooltip = 'Click to open ContextCore panel';
  statusBarItem.text    = '⬡ ContextCore';
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

export function updateStatusBar(ctx: ContextResponse): void {
  if (!statusBarItem) return;

  const focusEmoji  = getFocusEmoji(ctx.focus_state);
  const energyEmoji = getEnergyEmoji(ctx.energy_level);

  // Format: 🎯 Deep Focus  ⚡ High
  statusBarItem.text    = `${focusEmoji} ${getFocusLabel(ctx.focus_state)}  ${energyEmoji} ${capitalize(ctx.energy_level)}`;
  statusBarItem.tooltip = buildTooltip(ctx);
  statusBarItem.backgroundColor = getBackgroundColor(ctx.focus_state);
}

export function setStatusBarOffline(): void {
  if (!statusBarItem) return;
  statusBarItem.text              = '⬡ CC Offline';
  statusBarItem.tooltip           = 'ContextCore API not running. Start with: node apps/api-server/dist/index.js';
  statusBarItem.backgroundColor   = new vscode.ThemeColor('statusBarItem.warningBackground');
}

export function setStatusBarConnecting(): void {
  if (!statusBarItem) return;
  statusBarItem.text    = '⬡ Connecting...';
  statusBarItem.tooltip = 'Connecting to ContextCore API...';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTooltip(ctx: ContextResponse): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`### ⬡ ContextCore\n\n`);
  md.appendMarkdown(`| | |\n|---|---|\n`);
  md.appendMarkdown(`| **Focus** | ${getFocusEmoji(ctx.focus_state)} ${getFocusLabel(ctx.focus_state)} (${ctx.focus_score}/10) |\n`);
  md.appendMarkdown(`| **Energy** | ${getEnergyEmoji(ctx.energy_level)} ${capitalize(ctx.energy_level)} (${ctx.energy_score}/10) |\n`);
  md.appendMarkdown(`| **Stress** | ${capitalize(ctx.stress_category)} (${ctx.stress_level}/10) |\n`);
  md.appendMarkdown(`| **Deep work** | ${ctx.deep_work_minutes_today} min today |\n`);
  if (ctx.active_project) {
    md.appendMarkdown(`| **Project** | ${ctx.active_project} |\n`);
  }
  md.appendMarkdown(`\n*${ctx.inference_reason}*\n\n`);
  md.appendMarkdown(`*Click to open dashboard*`);
  return md;
}

function getBackgroundColor(focusState: string): vscode.ThemeColor | undefined {
  if (focusState === 'deep_work') {
    return new vscode.ThemeColor('statusBarItem.prominentBackground');
  }
  if (focusState === 'scattered') {
    return new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  return undefined;
}

function getFocusEmoji(state: string): string {
  const map: Record<string, string> = {
    deep_work:  '🎯',
    scattered:  '🌀',
    in_meeting: '📅',
    break:      '😴',
    unknown:    '⚪'
  };
  return map[state] ?? '⚪';
}

function getEnergyEmoji(level: string): string {
  const map: Record<string, string> = {
    high:    '⚡',
    medium:  '🔋',
    low:     '🪫',
    unknown: '❓'
  };
  return map[level] ?? '🔋';
}

function getFocusLabel(state: string): string {
  const map: Record<string, string> = {
    deep_work:  'Deep Focus',
    scattered:  'Scattered',
    in_meeting: 'In Meeting',
    break:      'Break',
    unknown:    'Warming up'
  };
  return map[state] ?? state;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}