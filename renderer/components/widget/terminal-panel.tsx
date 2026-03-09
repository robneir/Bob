import React, { useEffect, useRef, useState } from 'react'
import { X, Trash2, Settings } from 'lucide-react'

interface TerminalPanelProps {
  shortcutLabel: string
  onDismiss: () => void
  onClear: () => void
  visible?: boolean
}

export default function TerminalPanel({
  shortcutLabel,
  onDismiss,
  onClear,
  visible = true,
}: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  // Re-fit terminal when becoming visible again
  useEffect(() => {
    if (visible && fitRef.current) {
      requestAnimationFrame(() => {
        fitRef.current?.fit()
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
        window.open(uri, '_blank')
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
