import path from 'path'
import {
  app,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  screen,
  BrowserWindow,
} from 'electron'
import serve from 'electron-serve'
import Store from 'electron-store'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

// Settings store
const settingsStore = new Store({
  name: 'bob-settings',
  defaults: {
    provider: 'local' as string,
    localModel: '' as string, // ID of selected local model
    downloadedModels: {} as Record<string, string>, // { modelId: localPath }
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    shortcut: 'CommandOrControl+Shift+Space',
    interactionMode: 'toggle' as string,
    whisperModel: 'base',
    setupComplete: false,
    theme: 'dark' as string,
  },
})

let widgetWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isRecording = false

const WIDGET_WIDTH = 420
const WIDGET_HEIGHT_COLLAPSED = 64
const WIDGET_MARGIN = 16

function getWidgetPosition() {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  return {
    x: width - WIDGET_WIDTH - WIDGET_MARGIN,
    y: height - WIDGET_HEIGHT_COLLAPSED - WIDGET_MARGIN,
  }
}

function createWidgetWindow() {
  const pos = getWidgetPosition()

  widgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT_COLLAPSED,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  widgetWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })
  widgetWindow.setAlwaysOnTop(true, 'floating')

  if (process.platform === 'darwin') {
    widgetWindow.setWindowButtonVisibility(false)
  }

  return widgetWindow
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 720,
    height: 560,
    frame: false,
    titleBarStyle: 'hiddenInset',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

function resizeWidget(height: number) {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  const display = screen.getPrimaryDisplay()
  const { width, height: screenHeight } = display.workAreaSize
  widgetWindow.setBounds({
    x: width - WIDGET_WIDTH - WIDGET_MARGIN,
    y: screenHeight - height - WIDGET_MARGIN,
    width: WIDGET_WIDTH,
    height: height,
  })
}

function createFallbackTrayIcon(): Electron.NativeImage {
  // Create a simple 16x16 tray icon with a "W" shape as a data URL
  // This is a 16x16 PNG with a simple waveform pattern
  const size = 16
  const canvas = Buffer.alloc(size * size * 4, 0) // RGBA

  // Draw a simple waveform pattern (3 bars)
  const barPositions = [4, 7, 10]
  const barHeights = [6, 10, 6]
  for (let b = 0; b < barPositions.length; b++) {
    const x = barPositions[b]
    const h = barHeights[b]
    const startY = Math.floor((size - h) / 2)
    for (let y = startY; y < startY + h; y++) {
      for (let dx = 0; dx < 2; dx++) {
        const idx = (y * size + x + dx) * 4
        canvas[idx] = 255 // R
        canvas[idx + 1] = 255 // G
        canvas[idx + 2] = 255 // B
        canvas[idx + 3] = 200 // A
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  })
}

function createTray() {
  // Try to load template image, fallback to a programmatic icon
  const iconPath = path.join(
    __dirname,
    isProd ? '../resources' : '../../resources',
    'trayIconTemplate.png'
  )

  let icon: Electron.NativeImage
  try {
    const loaded = nativeImage.createFromPath(iconPath)
    icon = loaded.isEmpty() ? createFallbackTrayIcon() : loaded
  } catch {
    icon = createFallbackTrayIcon()
  }

  tray = new Tray(icon)
  tray.setToolTip('Bob')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Bob',
      click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.show()
          widgetWindow.webContents.send('bob:state', 'idle')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings...',
      click: () => openSettings(),
    },
    { type: 'separator' },
    {
      label: 'Quit Bob',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)
}

async function openSettings() {
  const win = createSettingsWindow()
  if (isProd) {
    await win.loadURL('app://./settings')
  } else {
    const port = process.argv[2]
    await win.loadURL(`http://localhost:${port}/settings`)
  }
  win.show()
}

function registerShortcuts() {
  const shortcut = settingsStore.get('shortcut') as string
  const mode = settingsStore.get('interactionMode') as string

  globalShortcut.unregisterAll()

  globalShortcut.register(shortcut, () => {
    if (!widgetWindow || widgetWindow.isDestroyed()) return

    if (mode === 'toggle') {
      isRecording = !isRecording
      if (isRecording) {
        widgetWindow.show()
        widgetWindow.webContents.send('bob:state', 'listening')
        widgetWindow.webContents.send('bob:recording-start')
      } else {
        widgetWindow.webContents.send('bob:recording-stop')
      }
    } else {
      // Push-to-talk: toggle uses same logic for now
      // Full push-to-talk with keyup requires uiohook-napi (Phase 6)
      isRecording = !isRecording
      if (isRecording) {
        widgetWindow.show()
        widgetWindow.webContents.send('bob:state', 'listening')
        widgetWindow.webContents.send('bob:recording-start')
      } else {
        widgetWindow.webContents.send('bob:recording-stop')
      }
    }
  })
}

// --- IPC Handlers ---

ipcMain.handle('settings:get', () => {
  return settingsStore.store
})

ipcMain.handle('settings:update', (_event, updates: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(updates)) {
    settingsStore.set(key, value)
  }
  // Re-register shortcuts if shortcut or mode changed
  if ('shortcut' in updates || 'interactionMode' in updates) {
    registerShortcuts()
  }
  return settingsStore.store
})

ipcMain.handle('widget:resize', (_event, height: number) => {
  resizeWidget(height)
})

ipcMain.handle('widget:hide', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    resizeWidget(WIDGET_HEIGHT_COLLAPSED)
    widgetWindow.webContents.send('bob:state', 'idle')
  }
  isRecording = false
})

ipcMain.handle('widget:show', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    widgetWindow.webContents.send('bob:state', 'idle')
  }
})

ipcMain.handle('settings:open', () => {
  openSettings()
})

// Transcription handler — receives Float32 PCM audio from renderer
ipcMain.handle(
  'audio:transcribe',
  async (_event, audioData: ArrayBuffer, sampleRate: number) => {
    try {
      const { transcribeAudio } = await import('./lib/whisper/transcriber')
      const { ensureFloat32At16kHz } = await import('./lib/audio/buffer')

      const float32 = new Float32Array(audioData)
      const resampled = ensureFloat32At16kHz(float32, sampleRate)
      const text = await transcribeAudio(resampled)
      return { success: true, text }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transcription failed'
      return { success: false, error: message }
    }
  }
)

// Pre-load Whisper model in background
ipcMain.handle('whisper:load', async () => {
  try {
    const { loadWhisperModel, isModelLoaded } = await import(
      './lib/whisper/transcriber'
    )
    if (!isModelLoaded()) {
      const modelName = settingsStore.get('whisperModel') as string
      // Store globally so transcriber can access it on first-use load
      ;(global as any).__wavyWhisperModel = modelName
      await loadWhisperModel(modelName)
    }
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load model'
    return { success: false, error: message }
  }
})

// --- Local Model Management ---

ipcMain.handle('models:list', async () => {
  try {
    const { getModelsWithStatus, CURATED_MODELS } = await import(
      './lib/llm/local-engine'
    )
    const downloaded = settingsStore.get('downloadedModels') as Record<
      string,
      string
    >
    return {
      success: true,
      models: getModelsWithStatus(downloaded || {}),
      selectedModel: settingsStore.get('localModel'),
    }
  } catch (error) {
    const { CURATED_MODELS } = await import('./lib/llm/local-engine')
    return {
      success: true,
      models: CURATED_MODELS.map((m) => ({ ...m, downloaded: false })),
      selectedModel: settingsStore.get('localModel'),
    }
  }
})

ipcMain.handle('models:download', async (event, modelId: string) => {
  try {
    const { CURATED_MODELS, downloadModel } = await import(
      './lib/llm/local-engine'
    )
    const model = CURATED_MODELS.find((m) => m.id === modelId)
    if (!model) return { success: false, error: 'Unknown model' }

    const localPath = await downloadModel(model.uri, model.sizeBytes, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('models:download-progress', {
          modelId,
          ...progress,
        })
      }
    })

    // Store the downloaded path
    const downloaded =
      (settingsStore.get('downloadedModels') as Record<string, string>) || {}
    downloaded[modelId] = localPath
    settingsStore.set('downloadedModels', downloaded)

    // Auto-select if no model selected yet
    if (!settingsStore.get('localModel')) {
      settingsStore.set('localModel', modelId)
    }

    if (!event.sender.isDestroyed()) {
      event.sender.send('models:download-progress', {
        modelId,
        status: 'complete',
      })
    }

    return { success: true, localPath }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Download failed'
    if (!event.sender.isDestroyed()) {
      event.sender.send('models:download-progress', {
        modelId,
        status: 'error',
        error: message,
      })
    }
    return { success: false, error: message }
  }
})

ipcMain.handle('models:select', async (_event, modelId: string) => {
  settingsStore.set('localModel', modelId)
  // Unload current model so it reloads with the new one on next query
  try {
    const { unloadModel } = await import('./lib/llm/local-engine')
    await unloadModel()
  } catch {}
  return { success: true }
})

// LLM query handler — streams tokens back to renderer
const SYSTEM_PROMPT =
  'You are Bob, a helpful voice-activated desktop assistant. The user spoke their query aloud and it was transcribed. Respond concisely and directly. Use markdown formatting when helpful.'

// Conversation history for cloud providers (local model tracks its own via LlamaChatSession)
let cloudMessages: { role: 'user' | 'assistant'; content: string }[] = []

ipcMain.handle('llm:query', async (event, text: string) => {
  const provider = settingsStore.get('provider') as string
  const sender = event.sender

  try {
    sender.send('bob:state', 'thinking')

    if (provider === 'local') {
      // Use bundled local model via node-llama-cpp
      const { loadModel, streamChat } = await import(
        './lib/llm/local-engine'
      )

      const modelId = settingsStore.get('localModel') as string
      const downloaded =
        (settingsStore.get('downloadedModels') as Record<string, string>) || {}
      const modelPath = downloaded[modelId]

      if (!modelPath) {
        throw new Error(
          'No local model downloaded. Please download a model in Settings.'
        )
      }

      await loadModel(modelPath)

      sender.send('bob:state', 'streaming')
      const response = await streamChat(text, SYSTEM_PROMPT, (chunk) => {
        if (!sender.isDestroyed()) {
          sender.send('llm:token', chunk)
        }
      })

      sender.send('llm:done')
      sender.send('bob:state', 'complete')
    } else {
      // Cloud providers via Vercel AI SDK
      const { streamText } = await import('ai')
      let aiModel: any

      if (provider === 'openai') {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({
          apiKey: settingsStore.get('openaiApiKey') as string,
        })
        aiModel = openai(settingsStore.get('openaiModel') as string)
      } else if (provider === 'anthropic') {
        const { createAnthropic } = await import('@ai-sdk/anthropic')
        const anthropic = createAnthropic({
          apiKey: settingsStore.get('anthropicApiKey') as string,
        })
        aiModel = anthropic(settingsStore.get('anthropicModel') as string)
      } else {
        throw new Error(`Unknown provider: ${provider}`)
      }

      // Add user message to history
      cloudMessages.push({ role: 'user', content: text })

      sender.send('bob:state', 'streaming')

      const result = streamText({
        model: aiModel,
        system: SYSTEM_PROMPT,
        messages: cloudMessages,
      })

      let assistantResponse = ''
      for await (const chunk of result.textStream) {
        if (sender.isDestroyed()) break
        assistantResponse += chunk
        sender.send('llm:token', chunk)
      }

      // Add assistant response to history
      cloudMessages.push({ role: 'assistant', content: assistantResponse })

      sender.send('llm:done')
      sender.send('bob:state', 'complete')
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    sender.send('llm:error', message)
    sender.send('bob:state', 'error')
  }
})

ipcMain.handle('llm:clear', async () => {
  // Clear cloud conversation history
  cloudMessages = []
  // Clear local model session
  try {
    const { clearChat } = await import('./lib/llm/local-engine')
    clearChat()
  } catch {}
})

// --- App Lifecycle ---

;(async () => {
  // Single instance lock
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  await app.whenReady()

  // Auto-select model based on RAM if no model selected
  if (!settingsStore.get('localModel')) {
    const { getDefaultModelId } = await import('./lib/llm/local-engine')
    settingsStore.set('localModel', getDefaultModelId())
  }

  // Create widget window
  const widget = createWidgetWindow()
  if (isProd) {
    await widget.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await widget.loadURL(`http://localhost:${port}/home`)
  }

  // Show widget
  widget.show()

  // Create system tray
  createTray()

  // Register global shortcuts
  registerShortcuts()

  // Pre-load Whisper model in background (non-blocking)
  const whisperModel = settingsStore.get('whisperModel') as string
  ;(global as any).__wavyWhisperModel = whisperModel
  import('./lib/whisper/transcriber')
    .then(({ loadWhisperModel }) => loadWhisperModel(whisperModel))
    .catch((err) => console.warn('[Bob] Whisper pre-load failed (will retry on first use):', err.message))

  // If setup not complete, open settings/wizard
  if (!settingsStore.get('setupComplete')) {
    if (isProd) {
      const win = createSettingsWindow()
      await win.loadURL('app://./setup')
      win.show()
    } else {
      const port = process.argv[2]
      const win = createSettingsWindow()
      await win.loadURL(`http://localhost:${port}/setup`)
      win.show()
    }
  }
})()

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('second-instance', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
  }
})
