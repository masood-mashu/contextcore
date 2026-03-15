import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage } from 'electron';
import path from 'path';
import { computeAndSave } from '@contextcore/context-engine';
import { ContextStateRepository, MoodRepository, MirrorRepository } from '@contextcore/database';
import { closeDB } from '@contextcore/database';

const contextRepo = new ContextStateRepository();
const moodRepo    = new MoodRepository();
const mirrorRepo  = new MirrorRepository();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ─── App Ready ────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow();
  setupTray();

  // Notify renderer every 15 min when context updates
  setInterval(async () => {
    const state = await contextRepo.getLatest();
    if (mainWindow && state) {
      mainWindow.webContents.send('context-updated', state);
      updateTray(state);
    }
  }, 15 * 60 * 1000);
});

app.on('window-all-closed', (e: Event) => {
  e.preventDefault(); // Keep running in tray
});

app.on('before-quit', () => {
  closeDB();
});

// ─── Main Window ──────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:  1100,
    height: 750,
    minWidth:  800,
    minHeight: 600,
    backgroundColor: '#080810',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function setupTray(): void {
  // Use a blank image for now — replace with real icon later
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ContextCore');
  tray.on('click', showWindow);
  updateTrayMenu(null);
}

function updateTray(state: any): void {
  if (!tray) return;
  const emoji = getFocusEmoji(state.focus_state);
  tray.setTitle?.(`${emoji}`);
  updateTrayMenu(state);
}

function updateTrayMenu(state: any): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: state
        ? `${getFocusEmoji(state.focus_state)} ${getFocusLabel(state.focus_state)}`
        : '⬡ ContextCore',
      enabled: false
    },
    { type: 'separator' },
    { label: 'Open Dashboard', click: showWindow },
    { label: 'Force Refresh',  click: async () => { await computeAndSave(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-context', async () => {
  return await contextRepo.getLatest();
});

ipcMain.handle('get-context-history', async (_, hours: number) => {
  return await contextRepo.getHistory(hours);
});

ipcMain.handle('get-week-summary', async () => {
  return await contextRepo.getWeeklySummary();
});

ipcMain.handle('force-refresh', async () => {
  await computeAndSave();
  return await contextRepo.getLatest();
});

ipcMain.handle('log-mood', async (_, data: any) => {
  const { mood, energy, note, tags } = data;
  await moodRepo.insert(mood, energy, note, tags);
  await computeAndSave();
  return await contextRepo.getLatest();
});

ipcMain.handle('get-mirror', async () => {
  return await mirrorRepo.getLatest();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFocusEmoji(state: string): string {
  return ({ deep_work:'🎯', scattered:'🌀', in_meeting:'📅', break:'😴', unknown:'⚪' } as any)[state] ?? '⚪';
}

function getFocusLabel(state: string): string {
  return ({ deep_work:'Deep Focus', scattered:'Scattered', in_meeting:'In Meeting', break:'Break', unknown:'Warming up' } as any)[state] ?? state;
}