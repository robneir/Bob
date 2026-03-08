import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Copy, X, Check, Trash2, Settings } from 'lucide-react'
import StreamingMarkdown from './streaming-markdown'
import type { WidgetState, ChatMessage } from './widget-container'

interface ResponsePanelProps {
  state: WidgetState
  messages: ChatMessage[]
  streamingResponse: string
  shortcutLabel: string
  onDismiss: () => void
  onClear: () => void
  onCopy: () => void
}

export default function ResponsePanel({
  state,
  messages,
  streamingResponse,
  shortcutLabel,
  onDismiss,
  onClear,
  onCopy,
}: ResponsePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = React.useState(false)
  const statusLabel =
    state === 'thinking'
      ? 'Thinking'
      : state === 'streaming'
        ? 'Answering'
        : 'Ready'
  const isStreaming = state === 'streaming'

  // Auto-scroll during streaming or when new messages arrive
  useEffect(() => {
    if (!scrollRef.current) return

    const frame = window.requestAnimationFrame(() => {
      if (!scrollRef.current) return
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: state === 'complete' ? 'smooth' : 'auto',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [messages, streamingResponse, state])

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative w-[404px] overflow-hidden rounded-[24px] border border-border/50 bg-card/94 shadow-[0_24px_64px_-30px_rgba(0,0,0,0.72)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_30%)]" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-inset ring-primary/15">
              <motion.div
                className="h-2.5 w-2.5 rounded-full bg-primary"
                animate={
                  isStreaming
                    ? { opacity: [0.45, 1, 0.45], scale: [0.9, 1.15, 0.9] }
                    : { opacity: 0.85, scale: 1 }
                }
                transition={{
                  duration: 1.1,
                  repeat: isStreaming ? Infinity : 0,
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Bob
              </span>
              <span className="text-[12px] text-foreground/80">{statusLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {shortcutLabel}
            </span>
            <button
              onClick={() => window.bob?.openSettings()}
              className="rounded-md p-1 transition-colors hover:bg-accent/50"
              title="Settings"
            >
              <Settings className="h-3 w-3 text-muted-foreground" />
            </button>
            {messages.length > 0 && (
              <button
                onClick={onClear}
                className="rounded-md p-1 transition-colors hover:bg-accent/50"
                title="Clear conversation"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded-md p-1 transition-colors hover:bg-accent/50"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Conversation content */}
        <div
          ref={scrollRef}
          className="space-y-3.5 overflow-y-auto px-3.5 py-3.5 scrollbar-thin"
          style={{ maxHeight: typeof window !== 'undefined' ? window.screen.availHeight - 140 : 560 }}
        >
          {/* Rendered messages */}
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-[18px] rounded-br-md bg-primary/14 px-3 py-2 text-foreground ring-1 ring-inset ring-primary/10">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                      You
                    </p>
                    <p className="text-[13px] leading-5">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-border/40 bg-background/65 px-3 py-2.5 text-foreground">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    Bob
                  </p>
                  <StreamingMarkdown content={msg.content} />
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {state === 'thinking' && !streamingResponse && (
            <div className="rounded-[18px] border border-border/40 bg-background/65 px-3 py-2.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  Bob
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Preparing response
                </span>
              </div>
              <motion.div
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-8 rounded-full bg-muted/80"
                    animate={{
                      opacity: [0.35, 1, 0.35],
                      scaleX: [0.92, 1, 0.92],
                    }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {/* Currently streaming response */}
          {streamingResponse && (
            <div className="rounded-[18px] border border-primary/15 bg-primary/[0.06] px-3 py-2.5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mb-2 flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.45, 1, 0.45], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                  Bob
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  Streaming live
                </span>
              </div>
              <StreamingMarkdown content={streamingResponse} streaming />
              {isStreaming && (
                <motion.span
                  className="ml-0.5 inline-block h-4 w-[2px] bg-primary align-text-bottom"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        {state === 'complete' && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between border-t border-border/30 px-3.5 py-2.5"
          >
            <span className="text-[10px] text-muted-foreground/60">
              Press {shortcutLabel} to ask a follow-up
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
