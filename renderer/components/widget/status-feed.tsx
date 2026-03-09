import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StatusFeedProps {
  status: { step: string; message: string; icon: string } | null
}

export default function StatusFeed({ status }: StatusFeedProps) {
  if (!status) return null

  return (
    <div className="flex items-center gap-2 px-3.5 py-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={status.step + status.message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <span className="text-[13px]">{status.icon}</span>
          <span className="text-[11px] font-medium text-muted-foreground/80">
            {status.message}
          </span>
          <motion.span
            className="text-[11px] text-muted-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ...
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
