import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Cloud,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Mic,
  Keyboard,
  Download,
} from 'lucide-react'

type Step =
  | 'welcome'
  | 'provider'
  | 'provider-config'
  | 'whisper'
  | 'shortcut'
  | 'done'

const STEPS: Step[] = [
  'welcome',
  'provider',
  'provider-config',
  'whisper',
  'shortcut',
  'done',
]

interface ModelInfo {
  id: string
  name: string
  description: string
  size: string
  uri: string
  recommended?: boolean
  downloaded?: boolean
  localPath?: string
}

// Fallback model list for when IPC isn't available (browser preview)
const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', description: 'Ultra fast, basic quality', size: '0.8 GB', uri: '' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', description: 'Fast with good quality', size: '2.0 GB', uri: '', recommended: true },
  { id: 'gemma-2-2b', name: 'Gemma 2 2B', description: 'Google, compact and capable', size: '1.6 GB', uri: '' },
  { id: 'phi-3.5-mini', name: 'Phi 3.5 Mini', description: 'Strong reasoning, compact', size: '2.4 GB', uri: '' },
  { id: 'mistral-7b', name: 'Mistral 7B', description: 'Best quality, needs more RAM', size: '4.4 GB', uri: '' },
]

export default function SetupPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [direction, setDirection] = useState(1)
  const [settings, setSettings] = useState({
    provider: 'local',
    localModel: '',
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    whisperModel: 'base',
    shortcut: 'CommandOrControl+Shift+Space',
    interactionMode: 'toggle',
  })
  const [models, setModels] = useState<ModelInfo[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadPercent, setDownloadPercent] = useState(0)

  // Fetch available models when entering provider-config step
  useEffect(() => {
    if (step === 'provider-config' && settings.provider === 'local') {
      if (window.bob?.listModels) {
        window.bob.listModels().then((result: any) => {
          if (result.success) {
            setModels(result.models)
            if (result.selectedModel) {
              setSettings((s) => ({ ...s, localModel: result.selectedModel }))
            }
          } else {
            setModels(FALLBACK_MODELS)
          }
        }).catch(() => setModels(FALLBACK_MODELS))
      } else {
        setModels(FALLBACK_MODELS)
      }
    }
  }, [step, settings.provider])

  // Listen for download progress
  useEffect(() => {
    if (!window.bob?.onDownloadProgress) return
    const unsub = window.bob.onDownloadProgress(
      (data: { modelId: string; status: string; percent?: number }) => {
        if (data.status === 'downloading') {
          setDownloadPercent(data.percent ?? 0)
        } else if (data.status === 'complete') {
          setDownloadPercent(100)
          setTimeout(() => {
            setDownloading(null)
            setDownloadPercent(0)
            setModels((prev) =>
              prev.map((m) =>
                m.id === data.modelId ? { ...m, downloaded: true } : m
              )
            )
            setSettings((s) => ({ ...s, localModel: data.modelId }))
          }, 400)
        } else if (data.status === 'error') {
          setDownloading(null)
          setDownloadPercent(0)
        }
      }
    )
    return () => { unsub() }
  }, [])

  const handleDownloadModel = async (modelId: string) => {
    if (!window.bob || downloading) return
    setDownloading(modelId)
    await window.bob.downloadModel(modelId)
  }

  const currentIndex = STEPS.indexOf(step)

  const goNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < STEPS.length) {
      setDirection(1)
      setStep(STEPS[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setDirection(-1)
      setStep(STEPS[prevIndex])
    }
  }

  const finishSetup = async () => {
    if (window.bob) {
      await window.bob.updateSettings({ ...settings, setupComplete: true })
    }
    // Close the setup window
    window.close()
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

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
                    Bob
                  </motion.div>
                  <p className="text-foreground/80 text-base font-medium">
                    Your voice-activated AI assistant
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Press a shortcut, speak, get answers.
                  </p>
                </div>
              )}

              {step === 'provider' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-center">
                    Choose your AI provider
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: 'local' })
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        settings.provider === 'local'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Cpu className="w-6 h-6" />
                      <span className="text-sm font-medium">Local</span>
                      <span className="text-[10px] text-muted-foreground text-center">
                        Free & private, runs on device
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, provider: 'openai' })
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        settings.provider === 'openai' ||
                        settings.provider === 'anthropic'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Cloud className="w-6 h-6" />
                      <span className="text-sm font-medium">Cloud API</span>
                      <span className="text-[10px] text-muted-foreground text-center">
                        OpenAI or Claude
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {step === 'provider-config' && (
                <div className="space-y-4">
                  {settings.provider === 'local' ? (
                    <>
                      <h2 className="text-lg font-semibold text-center">
                        Choose a Model
                      </h2>
                      <p className="text-xs text-muted-foreground text-center">
                        Pick an AI model to download. Runs entirely on your
                        device.
                      </p>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {models.map((m) => (
                          <div
                            key={m.id}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                              settings.localModel === m.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {m.name}
                                </span>
                                {m.recommended && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {m.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                {m.size}
                              </span>
                              {m.downloaded ? (
                                <button
                                  onClick={() =>
                                    setSettings({
                                      ...settings,
                                      localModel: m.id,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                    settings.localModel === m.id
                                      ? 'bg-primary text-white'
                                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                                  }`}
                                >
                                  {settings.localModel === m.id
                                    ? 'Selected'
                                    : 'Select'}
                                </button>
                              ) : downloading === m.id ? (
                                <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                  <div className="flex items-center gap-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    <span className="text-[11px] text-primary font-medium">
                                      {downloadPercent}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                                      style={{ width: `${downloadPercent}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDownloadModel(m.id)}
                                  disabled={!!downloading}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                  <Download className="w-3 h-3" />
                                  Get
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {models.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-center">
                        Cloud API Setup
                      </h2>
                      <div className="flex gap-2 justify-center mb-3">
                        <button
                          onClick={() =>
                            setSettings({ ...settings, provider: 'openai' })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            settings.provider === 'openai'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          OpenAI
                        </button>
                        <button
                          onClick={() =>
                            setSettings({ ...settings, provider: 'anthropic' })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            settings.provider === 'anthropic'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          Claude
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground/70">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={
                              settings.provider === 'openai'
                                ? settings.openaiApiKey
                                : settings.anthropicApiKey
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [settings.provider === 'openai'
                                  ? 'openaiApiKey'
                                  : 'anthropicApiKey']: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="sk-..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground/70">
                            Model
                          </label>
                          <select
                            value={
                              settings.provider === 'openai'
                                ? settings.openaiModel
                                : settings.anthropicModel
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [settings.provider === 'openai'
                                  ? 'openaiModel'
                                  : 'anthropicModel']: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            {settings.provider === 'openai' ? (
                              <>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="o1">o1</option>
                                <option value="o3-mini">o3-mini</option>
                              </>
                            ) : (
                              <>
                                <option value="claude-sonnet-4-20250514">
                                  Claude Sonnet 4
                                </option>
                                <option value="claude-opus-4-20250514">
                                  Claude Opus 4
                                </option>
                                <option value="claude-haiku-235-20241022">
                                  Claude Haiku 3.5
                                </option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 'whisper' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-center">
                    Voice Transcription
                  </h2>
                  <p className="text-xs text-muted-foreground text-center">
                    Bob transcribes your voice locally using Whisper.
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'tiny',
                        name: 'Tiny',
                        size: '77 MB',
                        desc: 'Fastest, basic accuracy',
                      },
                      {
                        id: 'base',
                        name: 'Base',
                        size: '148 MB',
                        desc: 'Good balance',
                        recommended: true,
                      },
                      {
                        id: 'small',
                        name: 'Small',
                        size: '488 MB',
                        desc: 'Best accuracy, slower',
                      },
                    ].map((model) => (
                      <button
                        key={model.id}
                        onClick={() =>
                          setSettings({ ...settings, whisperModel: model.id })
                        }
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          settings.whisperModel === model.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {model.name}
                            </span>
                            {model.recommended && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                Recommended
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {model.desc}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {model.size}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Model will be downloaded on first use.
                  </p>
                </div>
              )}

              {step === 'shortcut' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-center">
                    Keyboard Shortcut
                  </h2>
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-1 px-4 py-3 rounded-xl bg-muted border border-border">
                      <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono">
                        {process.platform === 'darwin' ? 'Cmd' : 'Ctrl'}
                      </kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono">
                        Shift
                      </kbd>
                      <span className="text-muted-foreground">+</span>
                      <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono">
                        Space
                      </kbd>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground/70">
                      Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            interactionMode: 'toggle',
                          })
                        }
                        className={`p-3 rounded-xl border text-center transition-all ${
                          settings.interactionMode === 'toggle'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Keyboard className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs font-medium">Toggle</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Press to start/stop
                        </p>
                      </button>
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            interactionMode: 'push-to-talk',
                          })
                        }
                        className={`p-3 rounded-xl border text-center transition-all ${
                          settings.interactionMode === 'push-to-talk'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Mic className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs font-medium">Hold</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Hold to talk
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                  </motion.div>
                  <h2 className="text-lg font-semibold">Bob is ready!</h2>
                  <p className="text-xs text-muted-foreground">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono">
                      Cmd+Shift+Space
                    </kbd>{' '}
                    anytime to ask a question.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 py-4">
          {currentIndex > 0 && step !== 'done' ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 'welcome' && (
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step !== 'welcome' && step !== 'done' && (() => {
            const needsModel = step === 'provider-config' && settings.provider === 'local' && !models.some((m) => m.downloaded)
            const needsApiKey = step === 'provider-config' && settings.provider !== 'local' && !(
              settings.provider === 'openai' ? settings.openaiApiKey : settings.anthropicApiKey
            )
            const disabled = needsModel || needsApiKey || !!downloading
            return (
              <button
                onClick={goNext}
                disabled={disabled}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          })()}

          {step === 'done' && (
            <button
              onClick={finishSetup}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
            >
              Start Using Bob
            </button>
          )}
        </div>
      </div>
    </>
  )
}
