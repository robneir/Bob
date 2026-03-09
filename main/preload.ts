import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const bob = {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', updates),
  openSettings: () => ipcRenderer.invoke('settings:open'),

  // Widget control
  resizeWidget: (height: number) => ipcRenderer.invoke('widget:resize', height),
  hideWidget: () => ipcRenderer.invoke('widget:hide'),
  showWidget: () => ipcRenderer.invoke('widget:show'),

  // Audio transcription
  transcribeAudio: (audioData: ArrayBuffer, sampleRate: number) =>
    ipcRenderer.invoke('audio:transcribe', audioData, sampleRate),
  loadWhisperModel: () => ipcRenderer.invoke('whisper:load'),

  // Local model management
  listModels: () => ipcRenderer.invoke('models:list'),
  downloadModel: (modelId: string) => ipcRenderer.invoke('models:download', modelId),
  selectModel: (modelId: string) => ipcRenderer.invoke('models:select', modelId),
  onDownloadProgress: (
    cb: (data: {
      modelId: string
      status: string
      percent: number
      downloadedBytes: number
      totalBytes: number
      error?: string
    }) => void
  ) => {
    const handler = (
      _event: IpcRendererEvent,
      data: {
        modelId: string
        status: string
        percent: number
        downloadedBytes: number
        totalBytes: number
        error?: string
      }
    ) => cb(data)
    ipcRenderer.on('models:download-progress', handler)
    return () =>
      ipcRenderer.removeListener('models:download-progress', handler)
  },

  // LLM
  sendQuery: (text: string) => ipcRenderer.invoke('llm:query', text),
  clearConversation: () => ipcRenderer.invoke('llm:clear'),
  onStreamToken: (cb: (token: string) => void) => {
    const handler = (_event: IpcRendererEvent, token: string) => cb(token)
    ipcRenderer.on('llm:token', handler)
    return () => ipcRenderer.removeListener('llm:token', handler)
  },
  onStreamDone: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('llm:done', handler)
    return () => ipcRenderer.removeListener('llm:done', handler)
  },
  onStreamError: (cb: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, error: string) => cb(error)
    ipcRenderer.on('llm:error', handler)
    return () => ipcRenderer.removeListener('llm:error', handler)
  },
  onStatus: (cb: (status: { step: string; message: string; icon: string }) => void) => {
    const handler = (_event: IpcRendererEvent, status: { step: string; message: string; icon: string }) => cb(status)
    ipcRenderer.on('bob:status', handler)
    return () => ipcRenderer.removeListener('bob:status', handler)
  },

  // Recording state events from main process
  onStateChange: (
    cb: (state: string) => void
  ) => {
    const handler = (_event: IpcRendererEvent, state: string) => cb(state)
    ipcRenderer.on('bob:state', handler)
    return () => ipcRenderer.removeListener('bob:state', handler)
  },
  onRecordingStart: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('bob:recording-start', handler)
    return () => ipcRenderer.removeListener('bob:recording-start', handler)
  },
  onRecordingStop: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('bob:recording-stop', handler)
    return () => ipcRenderer.removeListener('bob:recording-stop', handler)
  },
}

contextBridge.exposeInMainWorld('bob', bob)

export type WavyAPI = typeof bob
