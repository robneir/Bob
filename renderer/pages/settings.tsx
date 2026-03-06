import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  Cpu,
  Mic,
  Keyboard,
  Palette,
  Info,
  Download,
  Loader2,
  Check,
} from 'lucide-react'

type Section = 'provider' | 'voice' | 'shortcuts' | 'appearance' | 'about'

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

const DEFAULT_SETTINGS = {
  provider: 'local',
  localModel: '',
  downloadedModels: {} as Record<string, string>,
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-4-20250514',
  whisperModel: 'base',
  shortcut: 'CommandOrControl+Shift+Space',
  interactionMode: 'toggle',
  theme: 'dark',
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('provider')
  const [settings, setSettings] =
    useState<Record<string, any>>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadPercent, setDownloadPercent] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.bob) {
      window.bob.getSettings().then((s) =>
        setSettings({ ...DEFAULT_SETTINGS, ...s })
      )
    }
  }, [])

  // Fetch models when provider section is active
  useEffect(() => {
    if (section === 'provider') {
      if (window.bob?.listModels) {
        window.bob.listModels().then((result: any) => {
          if (result.success) {
            setModels(result.models)
          } else {
            setModels(FALLBACK_MODELS)
          }
        }).catch(() => setModels(FALLBACK_MODELS))
      } else {
        setModels(FALLBACK_MODELS)
      }
    }
  }, [section])

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
            // Refresh settings to get updated downloadedModels
            window.bob.getSettings().then((s) =>
              setSettings({ ...DEFAULT_SETTINGS, ...s })
            )
          }, 400)
        } else if (data.status === 'error') {
          setDownloading(null)
          setDownloadPercent(0)
        }
      }
    )
    return () => { unsub() }
  }, [])

  const updateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    if (typeof window !== 'undefined' && window.bob) {
      await window.bob.updateSettings({ [key]: value })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleDownloadModel = async (modelId: string) => {
    if (!window.bob || downloading) return
    setDownloading(modelId)
    await window.bob.downloadModel(modelId)
  }

  const handleSelectModel = async (modelId: string) => {
    if (!window.bob) return
    await window.bob.selectModel(modelId)
    setSettings((s) => ({ ...s, localModel: modelId }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: 'provider',
      label: 'LLM Provider',
      icon: <Cpu className="w-4 h-4" />,
    },
    { id: 'voice', label: 'Voice', icon: <Mic className="w-4 h-4" /> },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      icon: <Keyboard className="w-4 h-4" />,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette className="w-4 h-4" />,
    },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
  ]

  return (
    <>
      <Head>
        <title>Bob Settings</title>
      </Head>
      <div className="h-screen bg-background text-foreground flex overflow-hidden select-none">
        {/* Sidebar */}
        <div className="w-52 bg-card border-r border-border flex flex-col">
          {/* Drag region */}
          <div
            className="h-12 flex items-end px-4 pb-2"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <span className="text-sm font-bold text-foreground">Settings</span>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  section === item.id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          {/* Drag region */}
          <div
            className="h-12"
            style={{ WebkitAppRegion: 'drag' } as any}
          />

          <div className="px-8 pb-8 space-y-6 max-w-lg">
            {section === 'provider' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    LLM Provider
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which AI model powers your responses.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Active Provider
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'local', label: 'Local' },
                      { id: 'openai', label: 'OpenAI' },
                      { id: 'anthropic', label: 'Claude' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => updateSetting('provider', p.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          settings.provider === p.id
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {settings.provider === 'local' && (
                  <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Models
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Download and select a model. Runs entirely on your
                        device.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {models.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            settings.localModel === m.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {m.name}
                              </span>
                              {m.recommended && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {m.description} · {m.size}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            {m.downloaded ? (
                              <button
                                onClick={() => handleSelectModel(m.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  settings.localModel === m.id
                                    ? 'bg-primary text-white'
                                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {settings.localModel === m.id ? (
                                  <span className="flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Active
                                  </span>
                                ) : (
                                  'Select'
                                )}
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
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                <Download className="w-3 h-3" />
                                Get
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settings.provider === 'openai' && (
                  <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={settings.openaiApiKey}
                        onChange={(e) =>
                          updateSetting('openaiApiKey', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Model
                      </label>
                      <select
                        value={settings.openaiModel}
                        onChange={(e) =>
                          updateSetting('openaiModel', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="o1">o1</option>
                        <option value="o3-mini">o3-mini</option>
                      </select>
                    </div>
                  </div>
                )}

                {settings.provider === 'anthropic' && (
                  <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={settings.anthropicApiKey}
                        onChange={(e) =>
                          updateSetting('anthropicApiKey', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="sk-ant-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Model
                      </label>
                      <select
                        value={settings.anthropicModel}
                        onChange={(e) =>
                          updateSetting('anthropicModel', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="claude-sonnet-4-20250514">
                          Claude Sonnet 4
                        </option>
                        <option value="claude-opus-4-20250514">
                          Claude Opus 4
                        </option>
                        <option value="claude-haiku-235-20241022">
                          Claude Haiku 3.5
                        </option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {section === 'voice' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Voice & Transcription
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure speech-to-text settings.
                  </p>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Whisper Model
                    </label>
                    <select
                      value={settings.whisperModel}
                      onChange={(e) =>
                        updateSetting('whisperModel', e.target.value)
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="tiny">Tiny (77 MB) - Fastest</option>
                      <option value="base">Base (148 MB) - Balanced</option>
                      <option value="small">
                        Small (488 MB) - Best accuracy
                      </option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Model downloads automatically on first use. All
                    transcription runs locally on your device.
                  </p>
                </div>
              </>
            )}

            {section === 'shortcuts' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure how you activate Bob.
                  </p>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Global Shortcut
                    </label>
                    <div className="flex items-center gap-1.5 px-4 py-3 rounded-lg bg-secondary border border-border">
                      <kbd className="px-2 py-1 rounded-md bg-background border border-border text-xs font-mono text-foreground shadow-sm">
                        Cmd
                      </kbd>
                      <span className="text-muted-foreground text-sm">+</span>
                      <kbd className="px-2 py-1 rounded-md bg-background border border-border text-xs font-mono text-foreground shadow-sm">
                        Shift
                      </kbd>
                      <span className="text-muted-foreground text-sm">+</span>
                      <kbd className="px-2 py-1 rounded-md bg-background border border-border text-xs font-mono text-foreground shadow-sm">
                        Space
                      </kbd>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'toggle',
                          label: 'Toggle',
                          desc: 'Press to start/stop',
                        },
                        {
                          id: 'push-to-talk',
                          label: 'Hold',
                          desc: 'Hold to talk',
                        },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() =>
                            updateSetting('interactionMode', mode.id)
                          }
                          className={`px-4 py-3 rounded-lg text-left transition-all ${
                            settings.interactionMode === mode.id
                              ? 'bg-primary/15 border-2 border-primary text-foreground'
                              : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="text-sm font-medium">
                            {mode.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {mode.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'appearance' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Appearance
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize the look and feel.
                  </p>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Theme
                    </label>
                    <div className="flex gap-2">
                      {['light', 'dark', 'system'].map((t) => (
                        <button
                          key={t}
                          onClick={() => updateSetting('theme', t)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                            settings.theme === t
                              ? 'bg-primary text-white shadow-md shadow-primary/25'
                              : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'about' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    About Bob
                  </h2>
                </div>
                <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">W</span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Bob
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Version 0.1.0
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Voice-activated AI assistant. Open source, MIT licensed.
                  </p>
                </div>
              </>
            )}

            {saved && (
              <p className="text-sm text-primary font-medium animate-pulse">
                Settings saved
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
