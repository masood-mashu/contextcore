import { contextBridge, ipcRenderer } from 'electron';

// Secure bridge between renderer (UI) and main process
// The renderer cannot access Node.js directly — it must go through this bridge
contextBridge.exposeInMainWorld('contextcore', {
  // Data fetching
  getContext:        ()      => ipcRenderer.invoke('get-context'),
  getContextHistory: (hours: number) => ipcRenderer.invoke('get-context-history', hours),
  getWeekSummary:    ()      => ipcRenderer.invoke('get-week-summary'),

  // Actions
  forceRefresh: ()           => ipcRenderer.invoke('force-refresh'),
  logMood:      (data: any)  => ipcRenderer.invoke('log-mood', data),
  getMirror:    ()           => ipcRenderer.invoke('get-mirror'),

  // Events from main → renderer
  onContextUpdated: (cb: (ctx: any) => void) =>
    ipcRenderer.on('context-updated', (_, data) => cb(data)),
  onNavigate: (cb: (page: string) => void) =>
    ipcRenderer.on('navigate', (_, page) => cb(page))
});