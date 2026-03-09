import { execFileSync } from 'child_process'

export interface CliProvider {
  id: string
  name: string
  command: string
  primary: boolean
}

export const CLI_PROVIDERS: CliProvider[] = [
  { id: 'claude', name: 'Claude', command: 'claude', primary: true },
  { id: 'openai', name: 'OpenAI', command: 'openai', primary: true },
  { id: 'gemini', name: 'Gemini', command: 'gemini', primary: false },
  { id: 'ollama', name: 'Ollama', command: 'ollama run llama3.2', primary: false },
]

export function isCommandInstalled(command: string): boolean {
  const bin = command.split(' ')[0]
  try {
    execFileSync('/bin/zsh', ['-l', '-c', `which ${bin}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function detectInstalledProviders(): (CliProvider & { installed: boolean })[] {
  return CLI_PROVIDERS.map((p) => ({
    ...p,
    installed: isCommandInstalled(p.command),
  }))
}

export function getDefaultProvider(): string | null {
  const installed = detectInstalledProviders().filter((p) => p.installed)
  const primary = installed.find((p) => p.primary)
  return primary?.id ?? installed[0]?.id ?? null
}
