import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const bob = {
  // --- Settings ---
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', updates),
  openSettings: () => ipcRenderer.invoke('settings:open'),

  // --- Widget ---
  resizeWidget: (height: number) => ipcRenderer.invoke('widget:resize', height),
  hideWidget: () => ipcRenderer.invoke('widget:hide'),
  showWidget: () => ipcRenderer.invoke('widget:show'),

  // --- Audio ---
  transcribeAudio: (audioData: ArrayBuffer, sampleRate: number) =>
    ipcRenderer.invoke('audio:transcribe', audioData, sampleRate),
  loadWhisperModel: () => ipcRenderer.invoke('whisper:load'),

  // --- CLI / PTY ---
  spawnCli: () => ipcRenderer.invoke('pty:spawn'),
  writePty: (data: string) => ipcRenderer.invoke('pty:write', data),
  resizePty: (cols: number, rows: number) =>
    ipcRenderer.invoke('pty:resize', cols, rows),
  killPty: () => ipcRenderer.invoke('pty:kill'),
  isPtyAlive: () => ipcRenderer.invoke('pty:alive'),

  onPtyData: (callback: (data: string) => void) => {
    const handler = (_e: IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on('pty:data', handler)
    return () => ipcRenderer.removeListener('pty:data', handler)
  },
  onPtyExit: (callback: (code: number) => void) => {
    const handler = (_e: IpcRendererEvent, code: number) => callback(code)
    ipcRenderer.on('pty:exit', handler)
    return () => ipcRenderer.removeListener('pty:exit', handler)
  },

  // --- CLI Providers ---
  detectProviders: () => ipcRenderer.invoke('cli:detect'),

  // --- Recording State ---
  onStateChange: (callback: (state: string) => void) => {
    const handler = (_e: IpcRendererEvent, state: string) => callback(state)
    ipcRenderer.on('bob:state', handler)
    return () => ipcRenderer.removeListener('bob:state', handler)
  },
  onRecordingStart: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('bob:recording-start', handler)
    return () => ipcRenderer.removeListener('bob:recording-start', handler)
  },
  onRecordingStop: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('bob:recording-stop', handler)
    return () => ipcRenderer.removeListener('bob:recording-stop', handler)
  },
}

contextBridge.exposeInMainWorld('bob', bob)

export type BobAPI = typeof bob
