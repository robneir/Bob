import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

type Step = 'welcome' | 'downloading' | 'done'

interface ModelInfo {
  id: string
  name: string
  size: string
  recommended?: boolean
  downloaded?: boolean
}

export default function SetupPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [direction, setDirection] = useState(1)
  const [modelName, setModelName] = useState('')
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [shortcutLabel, setShortcutLabel] = useState('Cmd+Shift+Space')

  // Detect platform for shortcut display
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.platform?.includes('Mac')) {
      setShortcutLabel('Ctrl+Shift+Space')
    }
  }, [])

  // Listen for download progress
  useEffect(() => {
    if (!window.bob?.onDownloadProgress) return
    const unsub = window.bob.onDownloadProgress((data) => {
      if (data.status === 'downloading') {
        setDownloadPercent(data.percent ?? 0)
      } else if (data.status === 'complete') {
        setDownloadPercent(100)
        setTimeout(() => {
          setDirection(1)
          setStep('done')
        }, 600)
      } else if (data.status === 'error') {
        // On error, stay on downloading step so user can see something went wrong
        setDownloadPercent(0)
      }
    })
    return () => { unsub() }
  }, [])

  // Auto-start download when entering the downloading step
  useEffect(() => {
    if (step !== 'downloading') return

    const startDownload = async () => {
      if (!window.bob?.listModels) return
      try {
        const result = await window.bob.listModels()
        if (!result.success) return

        const models: ModelInfo[] = result.models
        // Use the auto-selected model, or the recommended one, or the first
        const targetId =
          result.selectedModel ||
          models.find((m) => m.recommended)?.id ||
          models[0]?.id

        if (!targetId) return

        const target = models.find((m) => m.id === targetId)
        setModelName(target?.name ?? targetId)

        // If already downloaded, skip straight to done
        if (target?.downloaded) {
          setDirection(1)
          setStep('done')
          return
        }

        await window.bob.downloadModel(targetId)
      } catch {
        // Download progress listener will handle status updates
      }
    }

    startDownload()
  }, [step])

  const finishSetup = async () => {
    if (window.bob) {
      await window.bob.updateSettings({ setupComplete: true })
    }
    window.close()
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  const STEPS: Step[] = ['welcome', 'downloading', 'done']
  const currentIndex = STEPS.indexOf(step)

  return (
    <>
      <Head>
        <title>Bob Setup</title>
      </Head>
      <div className="h-screen bg-background flex flex-col overflow-hidden select-none">
        {/* Titlebar drag region */}
        <div className="h-8 shrink-0" style={{ WebkitAppRegion: 'drag' } as any} />

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 py-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i <= currentIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              {step === 'welcome' && (
                <div className="text-center space-y-5">
                  <motion.div
                    className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    Hi, I'm Bob
                  </motion.div>
                  <p className="text-foreground/80 text-base font-medium">
                    Your voice-powered answer engine.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Ask me anything — I'll search the web and give you the best
                    answer.
                  </p>
                </div>
              )}

              {step === 'downloading' && (
                <div className="text-center space-y-6">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Setting up Bob...</h2>
                    {modelName && (
                      <p className="text-xs text-muted-foreground">
                        Downloading {modelName}
                      </p>
                    )}
                  </div>
                  <div className="w-full max-w-xs mx-auto space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadPercent}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {downloadPercent}%
                    </p>
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className="text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                  </motion.div>
                  <h2 className="text-xl font-semibold">All set!</h2>
                  <p className="text-sm text-muted-foreground">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs font-mono">
                      {shortcutLabel}
                    </kbd>{' '}
                    to ask me anything.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center px-8 py-4">
          {step === 'welcome' && (
            <button
              onClick={() => {
                setDirection(1)
                setStep('downloading')
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          )}

          {step === 'done' && (
            <button
              onClick={finishSetup}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Start Using Bob
            </button>
          )}
        </div>
      </div>
    </>
  )
}
