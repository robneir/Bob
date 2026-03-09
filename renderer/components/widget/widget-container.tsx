import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudioRecorder } from '../../hooks/use-audio-recorder'
import IdlePill from './idle-pill'
import RecordingPill from './recording-pill'
import TranscribingPill from './transcribing-pill'
import ResponsePanel from './response-panel'
import StatusFeed from './status-feed'
import ErrorDisplay from './error-display'

export type WidgetState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'streaming'
  | 'complete'
  | 'error'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WIDGET_PADDING = 16 // p-2 = 8px * 2
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingResponse, setStreamingResponse] = useState('')
  const [error, setError] = useState('')
  const [currentStatus, setCurrentStatus] = useState<{
    step: string
    message: string
    icon: string
  } | null>(null)
  const [shortcutLabel, setShortcutLabel] = useState(DEFAULT_SHORTCUT_LABEL)
  const [sources, setSources] = useState<{ title: string; url: string }[]>([])
  const { startRecording, stopRecording, audioLevel } = useAudioRecorder()
  const stateRef = useRef<WidgetState>('idle')
  const contentRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const streamTextRef = useRef('')
  const streamBufferRef = useRef('')
  const streamFrameRef = useRef<number | null>(null)

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const cancelScheduledStreamFlush = useCallback(() => {
    if (streamFrameRef.current !== null) {
      cancelAnimationFrame(streamFrameRef.current)
      streamFrameRef.current = null
    }
  }, [])

  const flushStreamBuffer = useCallback(() => {
    streamFrameRef.current = null

    if (!streamBufferRef.current) {
      return streamTextRef.current
    }

    streamTextRef.current += streamBufferRef.current
    streamBufferRef.current = ''
    setStreamingResponse(streamTextRef.current)

    return streamTextRef.current
  }, [])

  const resetStreamingState = useCallback(() => {
    cancelScheduledStreamFlush()
    streamTextRef.current = ''
    streamBufferRef.current = ''
    setStreamingResponse('')
  }, [cancelScheduledStreamFlush])

  useEffect(() => () => cancelScheduledStreamFlush(), [cancelScheduledStreamFlush])

  useEffect(() => {
    let cancelled = false

    if (!window.bob?.getSettings) {
      return
    }

    window.bob
      .getSettings()
      .then((settings) => {
        if (cancelled) return

        const shortcut =
          settings && typeof settings.shortcut === 'string'
            ? settings.shortcut
            : ''

        if (shortcut) {
          setShortcutLabel(formatShortcutLabel(shortcut))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  // Dynamically resize the Electron window to fit content
  useEffect(() => {
    if (!contentRef.current || !window.bob?.resizeWidget) return

    const maxHeight = Math.floor(window.screen.availHeight - 32)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height
        const totalHeight = Math.min(Math.ceil(contentHeight) + WIDGET_PADDING, maxHeight)
        window.bob.resizeWidget(totalHeight)
      }
    })

    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  // Listen for state changes from main process (shortcut triggers)
  useEffect(() => {
    if (!window.bob) return

    const unsubState = window.bob.onStateChange((newState) => {
      setState(newState as WidgetState)
      if (newState === 'complete' || newState === 'idle' || newState === 'error') {
        setCurrentStatus(null)
      }
    })

    const unsubStatus = window.bob.onStatus?.((status) => {
      setCurrentStatus(status)
    })

    const unsubSources = window.bob.onSources?.((newSources) => {
      setSources((prev) => [...prev, ...newSources])
    })

    const unsubRecordStart = window.bob.onRecordingStart(async () => {
      try {
        setError('')
        resetStreamingState()
        await startRecording()
      } catch (err) {
        setError('Microphone access denied. Please allow microphone access in System Settings.')
        setState('error')
      }
    })

    const unsubRecordStop = window.bob.onRecordingStop(async () => {
      try {
        const audioData = await stopRecording()

        if (audioData.length < 1600) {
          if (messagesRef.current.length === 0) {
            setState('idle')
            if (window.bob) window.bob.hideWidget()
          } else {
            setState('complete')
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
          if (messagesRef.current.length === 0) {
            setState('idle')
            if (window.bob) window.bob.hideWidget()
          } else {
            setState('complete')
          }
          return
        }

        setMessages((prev) => [...prev, { role: 'user', content: text }])
        setState('thinking')

        await window.bob.sendQuery(text)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Recording failed'
        setError(msg)
        setState('error')
      }
    })

    return () => {
      unsubState()
      unsubStatus?.()
      unsubSources?.()
      unsubRecordStart()
      unsubRecordStop()
    }
  }, [startRecording, stopRecording, resetStreamingState])

  // Listen for LLM stream events
  useEffect(() => {
    if (!window.bob) return

    const unsubToken = window.bob.onStreamToken((token) => {
      streamBufferRef.current += token

      if (streamFrameRef.current === null) {
        streamFrameRef.current = window.requestAnimationFrame(flushStreamBuffer)
      }
    })

    const unsubDone = window.bob.onStreamDone(() => {
      cancelScheduledStreamFlush()
      const response = flushStreamBuffer()

      if (response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response }])
      }

      streamTextRef.current = ''
      streamBufferRef.current = ''
      setStreamingResponse('')
      setState('complete')
    })

    const unsubError = window.bob.onStreamError((err) => {
      resetStreamingState()
      setError(err)
      setState('error')
    })

    return () => {
      unsubToken()
      unsubDone()
      unsubError()
    }
  }, [cancelScheduledStreamFlush, flushStreamBuffer, resetStreamingState])

  const handleDismiss = useCallback(() => {
    setMessages([])
    setSources([])
    resetStreamingState()
    setError('')
    if (window.bob) {
      window.bob.hideWidget()
    }
  }, [resetStreamingState])

  const handleClear = useCallback(() => {
    setMessages([])
    setSources([])
    resetStreamingState()
    setError('')
    if (window.bob?.clearConversation) {
      window.bob.clearConversation()
    }
    setState('idle')
    if (window.bob) {
      window.bob.hideWidget()
    }
  }, [resetStreamingState])

  const handleCopy = useCallback(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content)
    } else if (streamingResponse) {
      navigator.clipboard.writeText(streamingResponse)
    }
  }, [messages, streamingResponse])

  return (
    <div className="absolute bottom-0 right-0 flex flex-col items-end justify-end p-2">
      <div ref={contentRef}>
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

          {(state === 'thinking' ||
            state === 'streaming' ||
            state === 'complete') && (
            <motion.div
              key="response"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <ResponsePanel
                state={state}
                messages={messages}
                streamingResponse={streamingResponse}
                shortcutLabel={shortcutLabel}
                currentStatus={currentStatus}
                sources={sources}
                onDismiss={handleDismiss}
                onClear={handleClear}
                onCopy={handleCopy}
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
