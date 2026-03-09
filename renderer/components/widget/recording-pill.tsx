import React from 'react'
import { motion } from 'framer-motion'

function PulsingDot() {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-red-500/30"
        animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="w-2 h-2 rounded-full bg-red-500" />
    </div>
  )
}

interface WaveformBarsProps {
  audioLevel: number
}

function WaveformBars({ audioLevel }: WaveformBarsProps) {
  return (
    <div className="flex items-center gap-[2px] h-5">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        // Create a natural-looking waveform based on audio level
        const baseHeight = 4
        const maxExtra = 14
        const variation = Math.sin(i * 0.9 + Date.now() * 0.003) * 0.5 + 0.5
        const height = baseHeight + maxExtra * audioLevel * variation

        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full bg-primary"
            animate={{
              height: `${Math.max(baseHeight, height)}px`,
            }}
            transition={{
              duration: 0.1,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

interface RecordingPillProps {
  audioLevel?: number
  shortcutLabel?: string
}

export default function RecordingPill({
  audioLevel = 0,
  shortcutLabel = 'Cmd + Shift + Space',
}: RecordingPillProps) {
  return (
    <div className="flex min-w-[356px] items-center gap-3 rounded-[24px] border border-primary/25 bg-card/60 px-4 py-3 shadow-[0_22px_48px_-28px_rgba(0,0,0,0.68)]">
      <PulsingDot />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">
              Mic Live
            </p>
            <p className="text-[13px] font-semibold text-foreground">
              Listening
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary/90">
            Speak naturally
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <WaveformBars audioLevel={audioLevel} />
          <p className="text-right text-[11px] leading-4 text-muted-foreground">
            Press {shortcutLabel} again to send
          </p>
        </div>
      </div>
    </div>
  )
}
