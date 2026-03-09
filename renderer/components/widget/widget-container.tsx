import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudioRecorder } from '../../hooks/use-audio-recorder'
import IdlePill from './idle-pill'
import TerminalPanel from './terminal-panel'
import ErrorDisplay from './error-display'

export type WidgetState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'terminal'
  | 'error'

const WIDGET_PADDING = 8
const DEFAULT_SHORTCUT_LABEL = 'Cmd + Shift + Space'

function formatShortcutLabel(shortcut: string) {
  const isMac =
    typeof navigator !== 'undefined' &&
    /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform)

  return shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case 'CommandOrControl':
          return isMac ? 'Cmd' : 'Ctrl'
        case 'Command':
          return 'Cmd'
        case 'Control':
          return 'Ctrl'
        case 'Alt':
        case 'Option':
          return isMac ? 'Option' : 'Alt'
        case 'Super':
          return isMac ? 'Cmd' : 'Super'
        default:
          return part.length === 1 ? part.toUpperCase() : part
      }
    })
    .join(' + ')
}

export default function WidgetContainer() {
  const [state, setState] = useState<WidgetState>('idle')
  const [error, setError] = useState('')
  const [shortcutLabel, setShortcutLabel] = useState(DEFAULT_SHORTCUT_LABEL)
  const [cliProvider, setCliProvider] = useState('')
  const [providers, setProviders] = useState<{ id: string; name: string; installed: boolean }[]>([])
  const [ptyAlive, setPtyAlive] = useState(false)
  const { startRecording, stopRecording, audioLevel } = useAudioRecorder()
  const stateRef = useRef<WidgetState>('idle')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Track PTY exit to unmount terminal
  useEffect(() => {
    if (!window.bob) return
    const unsub = window.bob.onPtyExit(() => {
      setPtyAlive(false)
    })
    return () => unsub()
  }, [])

  // Load shortcut label from settings
  useEffect(() => {
    if (!window.bob?.getSettings) return
    let cancelled = false
    window.bob.getSettings().then((settings) => {
      if (cancelled) return
      const shortcut = settings?.shortcut
      if (typeof shortcut === 'string' && shortcut) {
        setShortcutLabel(formatShortcutLabel(shortcut))
      }
      if (settings?.cliProvider) {
        setCliProvider(settings.cliProvider as string)
      }
    }).catch(() => {})
    // Detect installed providers
    if (window.bob?.detectProviders) {
      window.bob.detectProviders().then((list: any[]) => {
        if (cancelled) return
        setProviders(list)
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [])

  // Resize widget to fit content (debounced to avoid feedback loops)
  useEffect(() => {
    if (!contentRef.current || !window.bob?.resizeWidget) return
    const maxHeight = Math.floor(window.screen.availHeight - 32)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    let lastW = 0
    let lastH = 0

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight =
          entry.borderBoxSize?.[0]?.blockSize ??
          entry.target.getBoundingClientRect().height
        const totalHeight = Math.min(
          Math.ceil(contentHeight) + WIDGET_PADDING,
          maxHeight
        )
        const contentWidth = entry.borderBoxSize?.[0]?.inlineSize
          ?? entry.target.getBoundingClientRect().width
        const newW = Math.ceil(contentWidth) + WIDGET_PADDING
        const newH = totalHeight

        // Skip if dimensions haven't meaningfully changed (avoid feedback loop)
        if (Math.abs(newW - lastW) < 2 && Math.abs(newH - lastH) < 2) return
        lastW = newW
        lastH = newH

        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          window.bob.resizeWidget(newH, newW)
        }, 50)
      }
    })

    observer.observe(contentRef.current)
    return () => {
      observer.disconnect()
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [])

  // Listen for state changes and recording events from main process
  useEffect(() => {
    if (!window.bob) return

    const unsubState = window.bob.onStateChange((newState) => {
      setState(newState as WidgetState)
    })

    const unsubRecordStart = window.bob.onRecordingStart(async () => {
      try {
        setError('')
        await startRecording()
      } catch (err) {
        // On a fast double-tap, stopRecording races with startRecording.
        // If the state already moved past 'listening', treat it as a benign interruption.
        if (stateRef.current !== 'listening') return
        setError('Microphone access denied. Please allow microphone access in System Settings.')
        setState('error')
      }
    })

    const unsubRecordStop = window.bob.onRecordingStop(async () => {
      try {
        const audioData = await stopRecording()

        // Compute audio stats for diagnostics and checks
        const samples = audioData.length
        const durationMs = Math.round((samples / 16000) * 1000)
        let sumSq = 0
        for (let i = 0; i < samples; i++) {
          sumSq += audioData[i] * audioData[i]
        }
        const rms = Math.sqrt(sumSq / (samples || 1))

        console.log(`[Bob] Audio: ${samples} samples, ${durationMs}ms, RMS=${rms.toFixed(4)}`)

        // Too short — treat as dismiss gesture (quick double-tap)
        // ~100ms at 16kHz
        if (samples < 1600) {
          console.log('[Bob] Dismissed: too short (double-tap)')
          handleDismiss()
          return
        }

        // Only dismiss for true silence — very low threshold to avoid
        // false positives with quiet speakers or low-gain mics
        if (rms < 0.003) {
          console.log('[Bob] Dismissed: silence detected')
          handleDismiss()
          return
        }

        setState('transcribing')

        // Start transcription and CLI spawn in parallel.
        // If the CLI isn't running yet, spawning it while Whisper works
        // means zero wait time after transcription completes.
        const transcriptionPromise = window.bob.transcribeAudio(
          audioData.buffer as ArrayBuffer,
          16000
        )

        let spawnPromise: Promise<void> | null = null
        const alreadyAlive = await window.bob.isPtyAlive()
        if (!alreadyAlive) {
          const readyPromise = new Promise<void>((resolve) => {
            const unsub = window.bob.onPtyReady(() => {
              unsub()
              resolve()
            })
            setTimeout(() => { unsub(); resolve() }, 12000)
          })

          spawnPromise = window.bob.spawnCli().then(() => {
            setPtyAlive(true)
            setState('terminal')
            return readyPromise
          })
        }

        const result = await transcriptionPromise
        console.log('[Bob] Transcription result:', result.success, result.text?.slice(0, 80))

        if (!result.success) {
          setError(result.error || 'Transcription failed')
          setState('error')
          return
        }

        const text = result.text?.trim()
        if (!text) {
          console.log('[Bob] Dismissed: transcription returned empty text')
          handleDismiss()
          return
        }

        // Wait for CLI to be ready (instant if already running or spawn finished during transcription)
        if (spawnPromise) {
          await spawnPromise
          window.bob.writePty(text)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('bob:focus-terminal'))
          }, 150)
        } else {
          setState('terminal')
          window.bob.writePty(text)
          window.dispatchEvent(new CustomEvent('bob:focus-terminal'))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Recording failed')
        setState('error')
      }
    })

    return () => {
      unsubState()
      unsubRecordStart()
      unsubRecordStop()
    }
  }, [startRecording, stopRecording])

  const handleDismiss = useCallback(() => {
    setError('')
    if (window.bob) window.bob.hideWidget()
  }, [])

  const handleClear = useCallback(() => {
    setError('')
    setPtyAlive(false)
    if (window.bob) {
      window.bob.killPty()
      window.bob.hideWidget()
    }
    setState('idle')
  }, [])

  const handleProviderChange = useCallback((id: string) => {
    setCliProvider(id)
    if (window.bob?.updateSettings) {
      window.bob.updateSettings({ cliProvider: id })
    }
    // Kill existing PTY so the next recording spawns with the new provider
    if (ptyAlive && window.bob) {
      window.bob.killPty()
      setPtyAlive(false)
    }
  }, [ptyAlive])

  // Escape key dismisses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDismiss])

  // Click outside the panel dismisses
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only dismiss if clicking directly on the background, not on panel content
      if (e.target === e.currentTarget && state === 'terminal') {
        handleDismiss()
      }
    },
    [state, handleDismiss]
  )

  // Show terminal when PTY is alive and we're in terminal/listening/transcribing
  const terminalActive = ptyAlive && (state === 'terminal' || state === 'listening' || state === 'transcribing')
  // Only show standalone pills when terminal is NOT active
  const showPills = !terminalActive

  return (
    <div
      className="absolute inset-0 flex flex-col items-end justify-end pr-1 pb-1"
      onClick={handleBackgroundClick}
    >
      <div ref={contentRef}>
        {/* Terminal panel — stays mounted while PTY is alive to preserve xterm state */}
        {ptyAlive && (
          <div className={terminalActive ? '' : 'hidden'}>
            <TerminalPanel
              shortcutLabel={shortcutLabel}
              onDismiss={handleDismiss}
              onClear={handleClear}
              visible={terminalActive}
              status={state === 'listening' ? 'listening' : state === 'transcribing' ? 'transcribing' : 'terminal'}
              audioLevel={audioLevel}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {showPills && (state === 'idle' || state === 'listening' || state === 'transcribing') && (
            <motion.div
              key="pill"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <IdlePill
                shortcutLabel={shortcutLabel}
                provider={cliProvider}
                providers={providers}
                onProviderChange={handleProviderChange}
                onClear={handleClear}
                ptyAlive={ptyAlive}
                status={state as 'idle' | 'listening' | 'transcribing'}
                audioLevel={audioLevel}
              />
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <ErrorDisplay
                error={error}
                onDismiss={handleDismiss}
                shortcutLabel={shortcutLabel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
