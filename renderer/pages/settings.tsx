import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  Terminal,
  Mic,
  Keyboard,
  Palette,
  Info,
  Check,
  ExternalLink,
} from 'lucide-react'

type Section = 'cli' | 'voice' | 'shortcuts' | 'appearance' | 'about'

interface ProviderInfo {
  id: string
  name: string
  command: string
  primary: boolean
  installed: boolean
}

const INSTALL_URLS: Record<string, string> = {
  claude: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  openai: 'https://codex.openai.com',
  gemini: 'https://ai.google.dev/gemini-api/docs/ai-studio-quickstart',
  ollama: 'https://ollama.com/download',
}

const DEFAULT_SETTINGS = {
  cliProvider: '',
  whisperModel: 'base',
  shortcut: 'CommandOrControl+Shift+Space',
  interactionMode: 'toggle',
  theme: 'dark',
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('cli')
  const [settings, setSettings] =
    useState<Record<string, any>>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.bob) {
      window.bob.getSettings().then((s) =>
        setSettings({ ...DEFAULT_SETTINGS, ...s })
      )
    }
  }, [])

  // Detect installed CLI providers
  useEffect(() => {
    if (section === 'cli' && window.bob?.detectProviders) {
      window.bob.detectProviders().then((p: ProviderInfo[]) => {
        setProviders(p)
      }).catch(() => {})
    }
  }, [section])

  const updateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    if (typeof window !== 'undefined' && window.bob) {
      await window.bob.updateSettings({ [key]: value })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: 'cli',
      label: 'CLI Provider',
      icon: <Terminal className="w-4 h-4" />,
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

  const primaryProviders = providers.filter((p) => p.primary)
  const secondaryProviders = providers.filter((p) => !p.primary)

  return (
    <>
      <Head>
        <title>Bob Settings</title>
      </Head>
      <div className="h-screen bg-background text-foreground flex overflow-hidden select-none">
        {/* Sidebar */}
        <div className="w-52 bg-card border-r border-border flex flex-col">
          <div
            className="h-14 flex items-end pl-[78px] pb-2"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <span className="text-sm font-bold text-foreground">Settings</span>
          </div>

          <nav className="flex-1 px-2 py-1 space-y-1">
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
          <div
            className="h-14"
            style={{ WebkitAppRegion: 'drag' } as any}
          />

          <div className="px-8 pb-8 space-y-6 max-w-lg">
            {section === 'cli' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    CLI Provider
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which AI CLI tool Bob launches when you speak.
                  </p>
                </div>

                <div className="space-y-2">
                  {primaryProviders.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        settings.cliProvider === p.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
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
                        <span className="text-xs text-muted-foreground">
                          {p.command}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {p.installed ? (
                          <button
                            onClick={() => updateSetting('cliProvider', p.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              settings.cliProvider === p.id
                                ? 'bg-primary text-white'
                                : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                            }`}
                          >
                            {settings.cliProvider === p.id ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              'Select'
                            )}
                          </button>
                        ) : (
                          <a
                            href={INSTALL_URLS[p.id] || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 border border-border transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Install
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {secondaryProviders.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      More Providers
                    </label>
                    {secondaryProviders.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          settings.cliProvider === p.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
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
                          <span className="text-xs text-muted-foreground">
                            {p.command}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {p.installed ? (
                            <button
                              onClick={() => updateSetting('cliProvider', p.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                settings.cliProvider === p.id
                                  ? 'bg-primary text-white'
                                  : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                              }`}
                            >
                              {settings.cliProvider === p.id ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                'Select'
                              )}
                            </button>
                          ) : (
                            <a
                              href={INSTALL_URLS[p.id] || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 border border-border transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Install
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
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
                      <span className="text-xl font-bold text-primary">B</span>
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
                    Voice-activated CLI launcher. Speak your question, get
                    answers from your favorite AI. Open source, MIT licensed.
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
