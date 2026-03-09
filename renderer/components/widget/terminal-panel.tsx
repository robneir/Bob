import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2, Settings } from 'lucide-react'

type TerminalStatus = 'terminal' | 'listening' | 'transcribing'

interface TerminalPanelProps {
  shortcutLabel: string
  onDismiss: () => void
  onClear: () => void
  visible?: boolean
  status?: TerminalStatus
  audioLevel?: number
}

export default function TerminalPanel({
  shortcutLabel,
  onDismiss,
  onClear,
  visible = true,
  status = 'terminal',
  audioLevel = 0,
}: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [panelWidth, setPanelWidth] = useState(640)
  const [termHeight, setTermHeight] = useState(
    Math.min(typeof window !== 'undefined' ? window.screen.availHeight - 140 : 500, 500)
  )
  const [termOpacity, setTermOpacity] = useState(50)
  const dragRef = useRef<{ axis: 'x' | 'y'; start: number; startVal: number } | null>(null)

  // Load saved terminal dimensions and opacity from settings
  useEffect(() => {
    if (!window.bob?.getSettings) return
    window.bob.getSettings().then((settings: any) => {
      if (settings?.terminalWidth) setPanelWidth(settings.terminalWidth)
      if (settings?.terminalHeight) setTermHeight(settings.terminalHeight)
      if (settings?.terminalOpacity != null) setTermOpacity(settings.terminalOpacity)
    }).catch(() => {})
  }, [])

  // Re-fit and focus terminal when becoming visible
  useEffect(() => {
    if (visible && fitRef.current) {
      requestAnimationFrame(() => {
        fitRef.current?.fit()
        xtermRef.current?.focus()
      })
    }
  }, [visible])

  useEffect(() => {
    if (!termRef.current || xtermRef.current) return
    let disposed = false

    ;(async () => {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      const { WebLinksAddon } = await import('@xterm/addon-web-links')

      if (disposed || !termRef.current) return

      // Import CSS
      // @ts-ignore - CSS import handled by bundler
      await import('xterm/css/xterm.css')

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
        window.bob?.openExternal(uri)
      })

      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)
      term.open(termRef.current)
      fitAddon.fit()

      xtermRef.current = term
      fitRef.current = fitAddon
      setReady(true)

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

      // Store cleanup in ref-accessible way
      ;(term as any).__cleanup = () => {
        resizeObserver.disconnect()
        unsubData?.()
        unsubExit?.()
        term.dispose()
      }
    })()

    return () => {
      disposed = true
      if (xtermRef.current) {
        ;(xtermRef.current as any).__cleanup?.()
        xtermRef.current = null
        fitRef.current = null
      }
    }
  }, [])

  // Helper to read current cursor pixel position from xterm
  const updateCursorPos = useCallback(() => {
    const term = xtermRef.current
    if (!term) return
    const cursorX = term.buffer.active.cursorX
    const cursorY = term.buffer.active.cursorY

    const dims = (term as any)._core?._renderService?.dimensions?.css?.cell
    if (dims) {
      setCursorPos({ x: cursorX * dims.width, y: cursorY * dims.height })
    } else {
      const container = termRef.current
      if (container && term.cols > 0 && term.rows > 0) {
        const rect = container.querySelector('.xterm-screen')?.getBoundingClientRect()
          ?? container.getBoundingClientRect()
        setCursorPos({ x: cursorX * (rect.width / term.cols), y: cursorY * (rect.height / term.rows) })
      }
    }
  }, [])

  // Track cursor position while listening/transcribing — update on every PTY write
  useEffect(() => {
    if ((status === 'listening' || status === 'transcribing') && xtermRef.current) {
      updateCursorPos()

      // Re-read cursor position whenever terminal content changes
      const unsub = window.bob?.onPtyData(() => {
        requestAnimationFrame(updateCursorPos)
      })
      return () => { unsub?.() }
    } else {
      setCursorPos(null)
    }
  }, [status, updateCursorPos])

  // Refit terminal when panel dimensions change (debounced to avoid flashing)
  useEffect(() => {
    if (!fitRef.current) return
    const timer = setTimeout(() => {
      fitRef.current?.fit()
      const dims = fitRef.current?.proposeDimensions()
      if (dims) window.bob?.resizePty(dims.cols, dims.rows)
    }, 80)
    return () => clearTimeout(timer)
  }, [panelWidth, termHeight])

  // Drag-to-resize handlers
  const onResizeStart = useCallback((axis: 'x' | 'y', e: React.MouseEvent) => {
    e.preventDefault()
    const startVal = axis === 'x' ? panelWidth : termHeight
    dragRef.current = { axis, start: axis === 'x' ? e.clientX : e.clientY, startVal }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      if (dragRef.current.axis === 'x') {
        // Dragging left edge: moving left = wider
        const delta = dragRef.current.start - ev.clientX
        setPanelWidth(Math.max(400, Math.min(1200, dragRef.current.startVal + delta)))
      } else {
        // Dragging top edge: moving up = taller
        const delta = dragRef.current.start - ev.clientY
        const maxH = Math.floor(window.screen.availHeight - 140)
        setTermHeight(Math.max(200, Math.min(maxH, dragRef.current.startVal + delta)))
      }
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      // Persist dimensions
      if (axis === 'x') {
        window.bob?.updateSettings({ terminalWidth: Math.max(400, Math.min(1200, panelWidth)) })
      } else {
        window.bob?.updateSettings({ terminalHeight: Math.max(200, Math.min(Math.floor(window.screen.availHeight - 140), termHeight)) })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [panelWidth, termHeight])

  // Listen for voice transcription paste events and focus requests
  useEffect(() => {
    const pasteHandler = (_e: Event) => {
      const detail = (_e as CustomEvent<string>).detail
      if (detail) {
        window.bob?.writePty(detail)
        xtermRef.current?.focus()
      }
    }
    const focusHandler = () => {
      xtermRef.current?.focus()
    }
    window.addEventListener('bob:paste-to-terminal', pasteHandler)
    window.addEventListener('bob:focus-terminal', focusHandler)
    return () => {
      window.removeEventListener('bob:paste-to-terminal', pasteHandler)
      window.removeEventListener('bob:focus-terminal', focusHandler)
    }
  }, [])

  return (
    <div
      className="relative overflow-hidden rounded-[16px] border border-border/50 backdrop-blur-xl shadow-[0_24px_64px_-30px_rgba(0,0,0,0.72)]"
      style={{ width: panelWidth, backgroundColor: `hsl(var(--card) / ${termOpacity / 100})` }}
    >
      {/* Resize handle — top edge */}
      <div
        className="absolute top-0 left-4 right-4 h-1.5 cursor-ns-resize z-10 hover:bg-primary/20 transition-colors rounded-b"
        onMouseDown={(e) => onResizeStart('y', e)}
      />
      {/* Resize handle — left edge */}
      <div
        className="absolute top-4 bottom-4 left-0 w-1.5 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors rounded-r"
        onMouseDown={(e) => onResizeStart('x', e)}
      />
      {/* Resize handle — top-left corner */}
      <div
        className="absolute top-0 left-0 h-4 w-4 cursor-nwse-resize z-10"
        onMouseDown={(e) => {
          // Start both axes
          e.preventDefault()
          const startX = e.clientX, startY = e.clientY
          const startW = panelWidth, startH = termHeight
          const onMove = (ev: MouseEvent) => {
            setPanelWidth(Math.max(400, Math.min(1200, startW + (startX - ev.clientX))))
            const maxH = Math.floor(window.screen.availHeight - 140)
            setTermHeight(Math.max(200, Math.min(maxH, startH + (startY - ev.clientY))))
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.bob?.updateSettings({ terminalWidth: panelWidth, terminalHeight: termHeight })
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {status === 'listening' ? (
            <>
              <div className="flex items-center gap-[3px] h-4">
                {[0, 1, 2, 3, 4].map((i) => {
                  const base = 0.25
                  const boost = audioLevel * (0.8 + Math.sin(i * 1.2) * 0.4)
                  const scale = Math.min(base + boost * 2.5, 1)
                  return (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-red-400"
                      animate={{ scaleY: scale }}
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                      style={{ height: '100%' }}
                    />
                  )
                })}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/90">
                Listening
              </span>
            </>
          ) : status === 'transcribing' ? (
            <>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                Transcribing
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-card/80 px-2 py-0.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Bob
              </span>
            </div>
          )}
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
      <div className="relative">
        <div
          ref={termRef}
          className="px-1 py-1"
          style={{ height: termHeight }}
        />

        {/* Inline indicator — positioned at terminal cursor */}
        {(status === 'listening' || status === 'transcribing') && cursorPos && (
          <motion.div
            className="absolute flex items-center gap-2 pointer-events-none"
            style={{ left: cursorPos.x + 8, top: cursorPos.y + 4 }}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
          >
            {status === 'listening' ? (
              <>
                <div className="flex items-center gap-[3px] h-4">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const base = 0.25
                    const boost = audioLevel * (0.8 + Math.sin(i * 1.2) * 0.4)
                    const scale = Math.min(base + boost * 2.5, 1)
                    return (
                      <motion.div
                        key={i}
                        className="w-[3px] rounded-full bg-red-400"
                        animate={{ scaleY: scale }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        style={{ height: '100%' }}
                      />
                    )
                  })}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/90">
                  Listening
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  Transcribing
                </span>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
