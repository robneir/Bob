import React from 'react'
import { motion } from 'framer-motion'

interface RecordingPillProps {
  audioLevel?: number
  shortcutLabel?: string
}

export default function RecordingPill({
  audioLevel = 0,
  shortcutLabel = 'Cmd + Shift + Space',
}: RecordingPillProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-red-500/20 bg-card/60 px-3 py-2 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Pulsing red dot */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-3 w-3 rounded-full bg-red-500/30"
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="h-2 w-2 rounded-full bg-red-500" />
      </div>

      {/* Waveform bars */}
      <div className="flex items-center gap-[2px] h-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const base = 0.25
          const boost = audioLevel * (0.8 + Math.sin(i * 1.2) * 0.4)
          const scale = Math.min(base + boost * 2.5, 1)
          return (
            <motion.div
              key={i}
              className="w-[2px] rounded-full bg-red-400"
              animate={{ scaleY: scale }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              style={{ height: '100%' }}
            />
          )
        })}
      </div>

      {/* Shortcut hint */}
      <span className="text-[10px] font-medium text-muted-foreground/60">
        {shortcutLabel}
      </span>
    </div>
  )
}
