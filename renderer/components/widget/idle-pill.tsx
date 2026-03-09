import React from 'react'
import { Activity, Settings } from 'lucide-react'

interface IdlePillProps {
  shortcutLabel?: string
}

export default function IdlePill({
  shortcutLabel = 'Cmd + Shift + Space',
}: IdlePillProps) {
  const openSettings = () => {
    if (window.bob) window.bob.openSettings()
  }

  return (
    <div className="group flex items-center gap-3 rounded-[22px] border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-[0_18px_42px_-26px_rgba(0,0,0,0.65)] transition-all hover:border-primary/20 hover:shadow-[0_22px_48px_-28px_rgba(0,0,0,0.7)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/15">
        <Activity className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Ready When You Are
        </p>
        <p className="text-[13px] font-medium leading-5 text-foreground/90">
          Press your shortcut and speak naturally.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-foreground/80">
          {shortcutLabel}
        </div>
      </div>
      <button
        onClick={openSettings}
        className="rounded-xl p-1.5 transition-colors hover:bg-accent/60"
        title="Settings"
      >
        <Settings className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
      </button>
    </div>
  )
}
