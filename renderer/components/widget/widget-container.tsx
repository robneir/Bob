import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudioRecorder } from '../../hooks/use-audio-recorder'
import IdlePill from './idle-pill'
import RecordingPill from './recording-pill'
import TranscribingPill from './transcribing-pill'
import TerminalPanel from './terminal-panel'
import ErrorDisplay from './error-display'

export type WidgetState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'terminal'
  | 'error'

const WIDGET_PADDING = 16
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
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Resize widget to fit content
  useEffect(() => {
    if (!contentRef.current || !window.bob?.resizeWidget) return
    const maxHeight = Math.floor(window.screen.availHeight - 32)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight =
          entry.borderBoxSize?.[0]?.blockSize ??
          entry.target.getBoundingClientRect().height
        const totalHeight = Math.min(
          Math.ceil(contentHeight) + WIDGET_PADDING,
          maxHeight
        )
        window.bob.resizeWidget(totalHeight)
      }
    })

    observer.observe(contentRef.current)
    return () => observer.disconnect()
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
      } catch {
        setError('Microphone access denied. Please allow microphone access in System Settings.')
        setState('error')
      }
    })

    const unsubRecordStop = window.bob.onRecordingStop(async () => {
      try {
        const audioData = await stopRecording()

        // Too short — ignore
        if (audioData.length < 1600) {
          const alive = await window.bob.isPtyAlive()
          if (alive) {
            setState('terminal')
          } else {
            setState('idle')
            window.bob.hideWidget()
          }
          return
        }

        setState('transcribing')

        const result = await window.bob.transcribeAudio(
          audioData.buffer as ArrayBuffer,
          16000
        )

        if (!result.success) {
          setError(result.error || 'Transcription failed')
          setState('error')
          return
        }

        const text = result.text?.trim()
        if (!text) {
          const alive = await window.bob.isPtyAlive()
          if (alive) {
            setState('terminal')
          } else {
            setState('idle')
            window.bob.hideWidget()
          }
          return
        }

        // Ensure CLI is spawned, then paste text into terminal
        const alive = await window.bob.isPtyAlive()
        if (!alive) {
          await window.bob.spawnCli()
          setPtyAlive(true)
        }

        setState('terminal')

        // Small delay to let terminal mount, then paste
        // Longer delay for fresh spawn (xterm needs to load), short for existing session
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('bob:paste-to-terminal', { detail: text })
          )
        }, alive ? 100 : 600)
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

  // Escape key dismisses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDismiss])

  const showTerminal = state === 'terminal'

  return (
    <div className="absolute bottom-0 right-0 flex flex-col items-end justify-end p-2">
      <div ref={contentRef}>
        {/* Terminal panel — stays mounted while PTY is alive to preserve xterm state */}
        {ptyAlive && (
          <div className={showTerminal ? '' : 'hidden'}>
            <TerminalPanel
              shortcutLabel={shortcutLabel}
              onDismiss={handleDismiss}
              onClear={handleClear}
              visible={showTerminal}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <IdlePill shortcutLabel={shortcutLabel} />
            </motion.div>
          )}

          {state === 'listening' && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <RecordingPill
                audioLevel={audioLevel}
                shortcutLabel={shortcutLabel}
              />
            </motion.div>
          )}

          {state === 'transcribing' && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <TranscribingPill shortcutLabel={shortcutLabel} />
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
