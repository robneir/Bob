import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ErrorDisplayProps {
  error: string
  onDismiss: () => void
  shortcutLabel?: string
}

export default function ErrorDisplay({
  error,
  onDismiss,
  shortcutLabel = 'Cmd + Shift + Space',
}: ErrorDisplayProps) {
  return (
    <div className="w-[356px] rounded-[22px] border border-destructive/30 bg-card/95 p-3.5 shadow-[0_20px_48px_-30px_rgba(0,0,0,0.72)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-destructive">
            Something Interrupted Bob
          </p>
          <p className="text-[12px] leading-5 text-foreground/85">
            {error}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Press {shortcutLabel} to try again, or open settings if this keeps
            happening.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-xl p-1 transition-colors hover:bg-accent/60"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
