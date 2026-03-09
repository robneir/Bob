import { spawn as ptySpawn, IPty } from 'node-pty'
import os from 'os'

let activePty: IPty | null = null

const DEFAULT_SHELL = process.env.SHELL || '/bin/zsh'

export function spawnCli(
  command: string,
  options?: { cols?: number; rows?: number }
): IPty {
  killPty()

  const cols = options?.cols ?? 80
  const rows = options?.rows ?? 24

  activePty = ptySpawn(DEFAULT_SHELL, ['-l', '-c', command], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: os.homedir(),
    env: process.env as Record<string, string>,
  })

  return activePty
}

export function writeToPty(data: string): void {
  activePty?.write(data)
}

export function resizePty(cols: number, rows: number): void {
  try {
    activePty?.resize(cols, rows)
  } catch {}
}

export function killPty(): void {
  if (activePty) {
    try { activePty.kill() } catch {}
    activePty = null
  }
}

export function isPtyAlive(): boolean {
  return activePty !== null
}

export function getActivePty(): IPty | null {
  return activePty
}
