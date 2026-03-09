import path from 'path'
import os from 'os'
import {
  app,
  dialog,
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
    cliProvider: '' as string,
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

const WIDGET_WIDTH = 640
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
    vibrancy: 'hudWindow',
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
  const size = 16
  const canvas = Buffer.alloc(size * size * 4, 0)

  const barPositions = [4, 7, 10]
  const barHeights = [6, 10, 6]
  for (let b = 0; b < barPositions.length; b++) {
    const x = barPositions[b]
    const h = barHeights[b]
    const startY = Math.floor((size - h) / 2)
    for (let y = startY; y < startY + h; y++) {
      for (let dx = 0; dx < 2; dx++) {
        const idx = (y * size + x + dx) * 4
        canvas[idx] = 255
        canvas[idx + 1] = 255
        canvas[idx + 2] = 255
        canvas[idx + 3] = 200
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  })
}

function createTray() {
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
        widgetWindow.setFocusable(true)
        widgetWindow.focus()
        widgetWindow.webContents.send('bob:state', 'listening')
        widgetWindow.webContents.send('bob:recording-start')
      } else {
        widgetWindow.webContents.send('bob:recording-stop')
      }
    } else {
      isRecording = !isRecording
      if (isRecording) {
        widgetWindow.show()
        widgetWindow.setFocusable(true)
        widgetWindow.focus()
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
    widgetWindow.setFocusable(false)
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

// --- Audio / Whisper ---

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

ipcMain.handle('whisper:load', async () => {
  try {
    const { loadWhisperModel, isModelLoaded } = await import(
      './lib/whisper/transcriber'
    )
    if (!isModelLoaded()) {
      const modelName = settingsStore.get('whisperModel') as string
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

// --- CLI / PTY ---

// Handle CLI trust prompts (e.g. Claude Code "trust this folder") in the background.
// Spawns the CLI briefly, auto-accepts the prompt, then exits. One-time per provider.
async function ensureProviderTrusted(providerId: string, command: string): Promise<boolean> {
  const trustKey = `cliTrusted_${providerId}`
  if (settingsStore.get(trustKey)) return true

  // Show a native dialog asking the user to grant trust
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Allow', 'Cancel'],
    defaultId: 0,
    title: 'Folder Access',
    message: `Allow Bob to run ${command} from your home directory?`,
    detail: 'Some CLI tools need to trust the working directory on first use. Bob will handle this automatically. You only need to do this once.',
  })

  if (response !== 0) return false

  // Spawn the CLI briefly to handle any trust/setup prompts
  const { spawn: ptySpawn } = await import('node-pty')
  const shell = process.env.SHELL || '/bin/zsh'

  await new Promise<void>((resolve) => {
    const tempPty = ptySpawn(shell, ['-l', '-c', command], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: os.homedir(),
      env: process.env as Record<string, string>,
    })

    let output = ''
    let done = false
    let settleTimer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (done) return
      done = true
      try { tempPty.kill() } catch {}
      resolve()
    }

    tempPty.onData((data) => {
      output += data

      // Auto-accept trust/permission prompts
      if (/trust.*(?:folder|directory|files)/i.test(output)) {
        setTimeout(() => {
          tempPty.write('y\n')
          setTimeout(finish, 1500) // Wait for trust to persist
        }, 150)
        return
      }

      // If CLI is outputting non-trust content, it's already trusted — exit
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(finish, 800)
    })

    tempPty.onExit(() => finish())

    // Hard timeout fallback
    setTimeout(finish, 8000)
  })

  settingsStore.set(trustKey, true)
  return true
}

ipcMain.handle('pty:spawn', async (event) => {
  const { spawnCli } = await import('./lib/cli/pty-manager')
  const { CLI_PROVIDERS } = await import('./lib/cli/providers')
  const sender = event.sender

  const providerId = settingsStore.get('cliProvider') as string
  const provider = CLI_PROVIDERS.find((p) => p.id === providerId)
  if (!provider) {
    return { success: false, error: 'No CLI provider selected. Please select one in Settings.' }
  }

  // Handle first-time trust before spawning the real session
  const trusted = await ensureProviderTrusted(providerId, provider.command)
  if (!trusted) {
    return { success: false, error: 'Folder trust is required to use this CLI tool.' }
  }

  const pty = spawnCli(provider.command)

  let readySignaled = false
  let readyTimer: ReturnType<typeof setTimeout> | null = null

  pty.onData((data) => {
    if (!sender.isDestroyed()) sender.send('pty:data', data)

    // Signal ready when output settles (no new data for 800ms)
    if (!readySignaled) {
      if (readyTimer) clearTimeout(readyTimer)
      readyTimer = setTimeout(() => {
        readySignaled = true
        if (!sender.isDestroyed()) sender.send('pty:ready')
      }, 800)
    }
  })

  // Fallback: signal ready after 10 seconds regardless
  setTimeout(() => {
    if (!readySignaled) {
      readySignaled = true
      if (!sender.isDestroyed()) sender.send('pty:ready')
    }
  }, 10000)

  pty.onExit(({ exitCode }) => {
    if (!sender.isDestroyed()) sender.send('pty:exit', exitCode)
  })

  return { success: true }
})

ipcMain.handle('pty:write', async (_event, data: string) => {
  const { writeToPty } = await import('./lib/cli/pty-manager')
  writeToPty(data)
})

ipcMain.handle('pty:resize', async (_event, cols: number, rows: number) => {
  const { resizePty } = await import('./lib/cli/pty-manager')
  resizePty(cols, rows)
})

ipcMain.handle('pty:kill', async () => {
  const { killPty } = await import('./lib/cli/pty-manager')
  killPty()
})

ipcMain.handle('pty:alive', async () => {
  const { isPtyAlive } = await import('./lib/cli/pty-manager')
  return isPtyAlive()
})

ipcMain.handle('cli:detect', async () => {
  const { detectInstalledProviders } = await import('./lib/cli/providers')
  return detectInstalledProviders()
})

// --- App Lifecycle ---

;(async () => {
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  await app.whenReady()

  // Auto-detect CLI provider if none selected
  if (!settingsStore.get('cliProvider')) {
    const { getDefaultProvider } = await import('./lib/cli/providers')
    const defaultId = getDefaultProvider()
    if (defaultId) settingsStore.set('cliProvider', defaultId)
  }

  // Create widget window
  const widget = createWidgetWindow()
  if (isProd) {
    await widget.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await widget.loadURL(`http://localhost:${port}/home`)
  }

  widget.show()

  createTray()
  registerShortcuts()

  // Pre-load Whisper model in background
  const whisperModel = settingsStore.get('whisperModel') as string
  ;(global as any).__wavyWhisperModel = whisperModel
  import('./lib/whisper/transcriber')
    .then(({ loadWhisperModel }) => loadWhisperModel(whisperModel))
    .catch((err) => console.warn('[Bob] Whisper pre-load failed (will retry on first use):', err.message))

  // If setup not complete, open wizard
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  // Clean up PTY on quit
  import('./lib/cli/pty-manager')
    .then(({ killPty }) => killPty())
    .catch(() => {})
})

app.on('second-instance', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
  }
})
