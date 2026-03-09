# CLI Pivot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Bob from a standalone AI search engine into a voice-enabled floating terminal that launches AI CLI tools (Claude Code, OpenAI CLI, etc.).

**Architecture:** Electron main process spawns CLI tools in a PTY via `node-pty`. The renderer embeds `xterm.js` to display terminal output. Voice input (local Whisper) is pasted into the PTY's stdin. The widget expands from the idle pill to a 640px-wide terminal panel when active.

**Tech Stack:** Electron, Next.js (Nextron), node-pty, xterm.js, local Whisper (@huggingface/transformers)

---

### Task 1: Install new dependencies, remove old ones

**Files:**
- Modify: `package.json`

**Step 1: Install new dependencies**

Run:
```bash
npm install node-pty xterm @xterm/addon-fit @xterm/addon-web-links
```

**Step 2: Remove old dependencies**

Run:
```bash
npm uninstall node-llama-cpp duck-duck-scrape linkedom @mozilla/readability turndown @types/turndown ai @ai-sdk/openai @ai-sdk/anthropic react-markdown remark-gfm rehype-highlight highlight.js
```

**Step 3: Verify the app still starts**

Run:
```bash
npm run dev
```

Expected: App launches without import errors (will have broken references — that's fine, we're deleting those files next).

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap dependencies for CLI pivot (node-pty, xterm)"
```

---

### Task 2: Delete old search/LLM files and unused components

**Files:**
- Delete: `main/lib/search/search-pipeline.ts`
- Delete: `main/lib/search/web-search.ts`
- Delete: `main/lib/search/page-extractor.ts`
- Delete: `main/lib/llm/local-engine.ts`
- Delete: `main/lib/status.ts`
- Delete: `renderer/components/widget/response-panel.tsx`
- Delete: `renderer/components/widget/streaming-markdown.tsx`
- Delete: `renderer/components/widget/status-feed.tsx`

**Step 1: Delete the files**

```bash
rm main/lib/search/search-pipeline.ts \
   main/lib/search/web-search.ts \
   main/lib/search/page-extractor.ts \
   main/lib/llm/local-engine.ts \
   main/lib/status.ts \
   renderer/components/widget/response-panel.tsx \
   renderer/components/widget/streaming-markdown.tsx \
   renderer/components/widget/status-feed.tsx
rmdir main/lib/search main/lib/llm
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove search pipeline, LLM engine, and unused components"
```

---

### Task 3: Create CLI provider config

This module defines the available CLI providers and detects which are installed.

**Files:**
- Create: `main/lib/cli/providers.ts`

**Step 1: Create the provider module**

```typescript
// main/lib/cli/providers.ts
import { execFileSync } from 'child_process'

export interface CliProvider {
  id: string
  name: string
  command: string
  primary: boolean
}

export const CLI_PROVIDERS: CliProvider[] = [
  { id: 'claude', name: 'Claude', command: 'claude', primary: true },
  { id: 'openai', name: 'OpenAI', command: 'openai', primary: true },
  { id: 'gemini', name: 'Gemini', command: 'gemini', primary: false },
  { id: 'ollama', name: 'Ollama', command: 'ollama run llama3.2', primary: false },
]

/**
 * Check if a CLI command is available on the user's PATH.
 * Uses the user's login shell to resolve PATH correctly.
 */
export function isCommandInstalled(command: string): boolean {
  const bin = command.split(' ')[0]
  try {
    execFileSync('/bin/zsh', ['-l', '-c', `which ${bin}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Detect which CLI providers are installed on this machine.
 */
export function detectInstalledProviders(): (CliProvider & { installed: boolean })[] {
  return CLI_PROVIDERS.map((p) => ({
    ...p,
    installed: isCommandInstalled(p.command),
  }))
}

/**
 * Get the first installed provider, preferring primary ones.
 */
export function getDefaultProvider(): string | null {
  const installed = detectInstalledProviders().filter((p) => p.installed)
  const primary = installed.find((p) => p.primary)
  return primary?.id ?? installed[0]?.id ?? null
}
```

**Step 2: Commit**

```bash
git add main/lib/cli/providers.ts
git commit -m "feat: add CLI provider detection (claude, openai, gemini, ollama)"
```

---

### Task 4: Create PTY manager

This module manages spawning, writing to, and killing CLI processes via node-pty.

**Files:**
- Create: `main/lib/cli/pty-manager.ts`

**Step 1: Create the PTY manager**

```typescript
// main/lib/cli/pty-manager.ts
import { spawn as ptySpawn, IPty } from 'node-pty'
import os from 'os'

let activePty: IPty | null = null

const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

/**
 * Spawn a CLI command in a PTY using the user's login shell.
 */
export function spawnCli(
  command: string,
  options?: { cols?: number; rows?: number }
): IPty {
  killPty()

  const cols = options?.cols ?? 80
  const rows = options?.rows ?? 24

  activePty = ptySpawn(DEFAULT_SHELL, ['-l', '-c', command], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: os.homedir(),
    env: process.env as Record<string, string>,
  })

  return activePty
}

/**
 * Write data to the active PTY's stdin.
 */
export function writeToPty(data: string): void {
  activePty?.write(data)
}

/**
 * Resize the active PTY.
 */
export function resizePty(cols: number, rows: number): void {
  try {
    activePty?.resize(cols, rows)
  } catch {}
}

/**
 * Kill the active PTY process.
 */
export function killPty(): void {
  if (activePty) {
    try { activePty.kill() } catch {}
    activePty = null
  }
}

/**
 * Check if a PTY is currently running.
 */
export function isPtyAlive(): boolean {
  return activePty !== null
}

/**
 * Get the active PTY instance.
 */
export function getActivePty(): IPty | null {
  return activePty
}
```

**Step 2: Commit**

```bash
git add main/lib/cli/pty-manager.ts
git commit -m "feat: add PTY manager for spawning CLI processes"
```

---

### Task 5: Update preload.ts with new IPC API

Replace the old LLM/search/model IPC methods with PTY terminal methods.

**Files:**
- Modify: `main/preload.ts`
- Modify: `renderer/preload.d.ts`

**Step 1: Rewrite preload.ts**

Replace the full file contents with:

```typescript
// main/preload.ts
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
```

**Step 2: Update the type declaration**

Modify `renderer/preload.d.ts`:

```typescript
import { BobAPI } from '../main/preload'

declare global {
  interface Window {
    bob: BobAPI
  }
}
```

**Step 3: Commit**

```bash
git add main/preload.ts renderer/preload.d.ts
git commit -m "feat: replace LLM/search IPC with PTY terminal API"
```

---

### Task 6: Create the terminal panel component

An xterm.js terminal embedded in a React component.

**Files:**
- Create: `renderer/components/widget/terminal-panel.tsx`

**Step 1: Create the terminal component**

```typescript
// renderer/components/widget/terminal-panel.tsx
import React, { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { X, Trash2, Settings } from 'lucide-react'
import 'xterm/css/xterm.css'

interface TerminalPanelProps {
  shortcutLabel: string
  onDismiss: () => void
  onClear: () => void
}

export default function TerminalPanel({
  shortcutLabel,
  onDismiss,
  onClear,
}: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!termRef.current || xtermRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'SF Mono, Menlo, Monaco, monospace',
      theme: {
        background: 'transparent',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        selectionBackground: '#3f3f46',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.open(uri, '_blank')
    })

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(termRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitRef.current = fitAddon

    // Forward user keystrokes to the PTY
    term.onData((data) => {
      window.bob?.writePty(data)
    })

    // Receive PTY output and write to terminal
    const unsubData = window.bob?.onPtyData((data) => {
      term.write(data)
    })

    // Handle PTY exit
    const unsubExit = window.bob?.onPtyExit((code) => {
      term.writeln(`\r\n[Process exited with code ${code}]`)
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      const dims = fitAddon.proposeDimensions()
      if (dims) {
        window.bob?.resizePty(dims.cols, dims.rows)
      }
    })
    resizeObserver.observe(termRef.current)

    return () => {
      resizeObserver.disconnect()
      unsubData?.()
      unsubExit?.()
      term.dispose()
      xtermRef.current = null
      fitRef.current = null
    }
  }, [])

  // Listen for voice transcription paste events
  useEffect(() => {
    const handler = (_e: Event) => {
      const detail = (_e as CustomEvent<string>).detail
      if (detail && xtermRef.current) {
        window.bob?.writePty(detail)
      }
    }
    window.addEventListener('bob:paste-to-terminal', handler)
    return () => window.removeEventListener('bob:paste-to-terminal', handler)
  }, [])

  return (
    <div className="relative w-[640px] overflow-hidden rounded-[16px] border border-border/50 bg-card/80 shadow-[0_24px_64px_-30px_rgba(0,0,0,0.72)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            Bob
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {shortcutLabel}
          </span>
          <button
            onClick={() => window.bob?.openSettings()}
            className="rounded-md p-1 transition-colors hover:bg-accent/50"
            title="Settings"
          >
            <Settings className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={onClear}
            className="rounded-md p-1 transition-colors hover:bg-accent/50"
            title="New session"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 transition-colors hover:bg-accent/50"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={termRef}
        className="px-1 py-1"
        style={{
          height: Math.min(
            typeof window !== 'undefined' ? window.screen.availHeight - 140 : 500,
            500
          ),
        }}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add renderer/components/widget/terminal-panel.tsx
git commit -m "feat: add xterm.js terminal panel component"
```

---

### Task 7: Rewrite widget-container.tsx

Simplify the state machine: idle, listening, transcribing, terminal, error. Remove all LLM streaming logic.

**Files:**
- Modify: `renderer/components/widget/widget-container.tsx`

**Step 1: Rewrite widget-container.tsx**

The new state machine has 5 states instead of 7. Remove all stream buffering, message history, sources, and status feed logic. The key flow: after transcription, ensure a PTY is spawned, switch to terminal state, paste the text.

Key behaviors:
- On transcription complete: spawn CLI if not alive, switch to `terminal` state, paste text via CustomEvent
- On dismiss (Escape/X): hide widget, PTY stays alive
- On clear (trash button): kill PTY, hide widget, reset to idle
- On hotkey while terminal visible: start recording for follow-up voice input

See design doc for full state machine details.

**Step 2: Commit**

```bash
git add renderer/components/widget/widget-container.tsx
git commit -m "feat: rewrite widget container for terminal-based flow"
```

---

### Task 8: Rewrite background.ts

Remove all LLM/search handlers. Add PTY IPC handlers.

**Files:**
- Modify: `main/background.ts`

**Step 1: Remove old handlers and add new ones**

Remove:
- All `llm:*` IPC handlers (llm:query, llm:clear)
- All `models:*` IPC handlers (models:list, models:download, models:select)
- `CLOUD_SYSTEM_PROMPT`, `cloudMessages` variable
- All imports from `./lib/llm/local-engine`, `./lib/search/*`, `./lib/status`

Add PTY handlers:
- `pty:spawn` — get selected provider command, call `spawnCli()`, wire up `onData`/`onExit` to forward to renderer
- `pty:write` — forward data to PTY stdin
- `pty:resize` — resize PTY dimensions
- `pty:kill` — kill active PTY
- `pty:alive` — return whether PTY is running
- `cli:detect` — return list of providers with installed status

Update settings store defaults:
- Remove: `provider`, `localModel`, `downloadedModels`, `openaiApiKey`, `openaiModel`, `anthropicApiKey`, `anthropicModel`
- Add: `cliProvider` (string, default empty)

Update `WIDGET_WIDTH` from 420 to 640.

Remove auto-model-selection on startup. Replace with auto-CLI-detection:
```typescript
if (!settingsStore.get('cliProvider')) {
  const { getDefaultProvider } = await import('./lib/cli/providers')
  const defaultId = getDefaultProvider()
  if (defaultId) settingsStore.set('cliProvider', defaultId)
}
```

**Step 2: Commit**

```bash
git add main/background.ts
git commit -m "feat: rewrite main process for CLI/PTY architecture"
```

---

### Task 9: Simplify settings page

**Files:**
- Modify: `renderer/pages/settings.tsx`

**Step 1: Simplify the provider section**

Replace model management + API key inputs with:
- Call `window.bob.detectProviders()` on mount
- Show providers list: name, installed badge, radio to select
- Primary providers (Claude, OpenAI) shown first
- Secondary providers under a "More" section
- Install instructions link for uninstalled providers

Keep Voice, Shortcuts, Appearance, About sections as-is.

**Step 2: Commit**

```bash
git add renderer/pages/settings.tsx
git commit -m "feat: simplify settings to CLI provider selection"
```

---

### Task 10: Rewrite setup page

**Files:**
- Modify: `renderer/pages/setup.tsx`

**Step 1: Rewrite as CLI detection wizard**

3 steps:
1. **Welcome** — "Bob needs a CLI tool to work. Let's find one."
2. **Detect** — Scan for installed CLIs via `detectProviders()`, show results with checkmarks. If found, auto-select. If none, show install instructions for Claude Code (`npm install -g @anthropic-ai/claude-code`) and OpenAI CLI.
3. **Ready** — "You're all set! Press [shortcut] to start."

Save selected provider to settings, mark `setupComplete: true`.

**Step 2: Commit**

```bash
git add renderer/pages/setup.tsx
git commit -m "feat: rewrite setup wizard for CLI detection"
```

---

### Task 11: Final cleanup and testing

**Files:**
- Modify: `CLAUDE.md`
- Possibly modify: `electron-builder.yml` (native module rebuild)

**Step 1: Rebuild native modules for Electron**

`node-pty` is a native addon. Rebuild for Electron:

```bash
npx electron-rebuild -f -w node-pty
```

**Step 2: Update CLAUDE.md**

Update Tech Stack to reflect:
- Remove: node-llama-cpp, Vercel AI SDK, duck-duck-scrape
- Add: node-pty, xterm.js
- Update description: voice-enabled CLI launcher

**Step 3: Test the full flow**

```bash
npm run dev
```

1. App starts → idle pill visible
2. Press shortcut → recording starts
3. Speak → release → transcribes → terminal appears
4. Transcribed text appears in terminal, user presses Enter
5. CLI output streams, links are clickable
6. Escape → hides, session alive
7. Shortcut again → widget returns with existing session
8. Trash → kills session, fresh start

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: final cleanup, native module rebuild, docs update"
```
