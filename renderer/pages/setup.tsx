import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Search, ExternalLink } from 'lucide-react'

type Step = 'welcome' | 'detect' | 'done'

interface ProviderInfo {
  id: string
  name: string
  command: string
  primary: boolean
  installed: boolean
}

export default function SetupPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [direction, setDirection] = useState(1)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [shortcutLabel, setShortcutLabel] = useState('Cmd+Shift+Space')

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.platform?.includes('Mac')) {
      setShortcutLabel('Ctrl+Shift+Space')
    }
  }, [])

  // Detect CLIs when entering detect step
  useEffect(() => {
    if (step !== 'detect') return

    const detect = async () => {
      if (!window.bob?.detectProviders) return
      try {
        const result = await window.bob.detectProviders()
        setProviders(result)

        // Auto-select first installed primary provider
        const installed = result.filter((p: ProviderInfo) => p.installed)
        const primary = installed.find((p: ProviderInfo) => p.primary)
        const autoSelect = primary?.id ?? installed[0]?.id ?? ''

        if (autoSelect) {
          setSelectedProvider(autoSelect)
          await window.bob.updateSettings({ cliProvider: autoSelect })
        }
      } catch {}
    }

    detect()
  }, [step])

  const finishSetup = async () => {
    if (window.bob) {
      if (selectedProvider) {
        await window.bob.updateSettings({
          cliProvider: selectedProvider,
          setupComplete: true,
        })
      } else {
        await window.bob.updateSettings({ setupComplete: true })
      }
    }
    window.close()
  }

  const selectProvider = async (id: string) => {
    setSelectedProvider(id)
    if (window.bob) {
      await window.bob.updateSettings({ cliProvider: id })
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  const STEPS: Step[] = ['welcome', 'detect', 'done']
  const currentIndex = STEPS.indexOf(step)
  const hasInstalledProvider = providers.some((p) => p.installed)

  return (
    <>
      <Head>
        <title>Bob Setup</title>
      </Head>
      <div className="h-screen bg-background flex flex-col overflow-hidden select-none">
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

        {/* Content */}
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
                    Your voice-powered AI assistant.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Bob connects to AI CLI tools like Claude and OpenAI.
                    Let's find what you have installed.
                  </p>
                </div>
              )}

              {step === 'detect' && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <Search className="w-8 h-8 mx-auto text-primary" />
                    <h2 className="text-lg font-semibold">
                      {hasInstalledProvider
                        ? 'Found your tools'
                        : 'No CLI tools found'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {hasInstalledProvider
                        ? 'Select which one Bob should use.'
                        : 'Install one of these to get started.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {providers.filter((p) => p.primary).map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          selectedProvider === p.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {p.name}
                          </span>
                          {p.installed ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                              Installed
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              Not found
                            </span>
                          )}
                        </div>
                        {p.installed ? (
                          <button
                            onClick={() => selectProvider(p.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              selectedProvider === p.id
                                ? 'bg-primary text-white'
                                : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                            }`}
                          >
                            {selectedProvider === p.id ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            ) : (
                              'Select'
                            )}
                          </button>
                        ) : (
                          <a
                            href={
                              p.id === 'claude'
                                ? 'https://docs.anthropic.com/en/docs/claude-code/overview'
                                : 'https://platform.openai.com/docs/guides/cli'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 border border-border transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Install
                          </a>
                        )}
                      </div>
                    ))}
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
                    to speak and get answers.
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
                setStep('detect')
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          )}

          {step === 'detect' && (
            <button
              onClick={() => {
                setDirection(1)
                setStep('done')
              }}
              disabled={!hasInstalledProvider}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
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
