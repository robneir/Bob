import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

export interface CliProvider {
  id: string
  name: string
  command: string
  primary: boolean
}

export const CLI_PROVIDERS: CliProvider[] = [
  { id: 'claude', name: 'Claude', command: 'claude', primary: true },
  { id: 'openai', name: 'Codex', command: 'codex', primary: true },
  { id: 'gemini', name: 'Gemini', command: 'gemini', primary: false },
  { id: 'ollama', name: 'Ollama', command: 'ollama run llama3.2', primary: false },
]

// Common binary paths that may not be in Electron's PATH when launched from Finder
const EXTRA_PATHS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  path.join(os.homedir(), '.local', 'bin'),
  path.join(os.homedir(), '.npm-global', 'bin'),
  path.join(os.homedir(), '.cargo', 'bin'),
]

export function isCommandInstalled(command: string): boolean {
  const bin = command.split(' ')[0]

  // Try login + interactive shell to get full user PATH (.zprofile + .zshrc)
  try {
    execFileSync('/bin/zsh', ['-l', '-i', '-c', `which ${bin}`], {
      stdio: 'ignore',
      timeout: 5000,
    })
    return true
  } catch {
    // Fall through to manual path check
  }

  // Fallback: check common binary directories directly
  for (const dir of EXTRA_PATHS) {
    try {
      if (fs.existsSync(path.join(dir, bin))) return true
    } catch {
      // skip
    }
  }

  return false
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
