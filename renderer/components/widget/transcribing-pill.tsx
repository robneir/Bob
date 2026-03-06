import React from 'react'
import { motion } from 'framer-motion'

function ProcessingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  )
}

interface TranscribingPillProps {
  shortcutLabel?: string
}

export default function TranscribingPill({
  shortcutLabel = 'Cmd + Shift + Space',
}: TranscribingPillProps) {
  return (
    <div className="flex min-w-[356px] items-center gap-3 rounded-[24px] border border-border/50 bg-card/92 px-4 py-3 shadow-[0_22px_48px_-28px_rgba(0,0,0,0.68)] backdrop-blur-xl">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/10">
        <ProcessingDots />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Captured
        </p>
        <p className="text-[13px] font-semibold text-foreground">
          Transcribing your question
        </p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Turning speech into text so the answer can start cleanly. Shortcut:
          {' '}
          {shortcutLabel}
        </p>
      </div>
    </div>
  )
}
