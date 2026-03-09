# Bob

Voice-to-CLI bridge desktop app. Press a shortcut, speak your question, and Bob pipes it into your favorite AI CLI tool (Claude Code, OpenAI CLI, etc.) running in an embedded terminal.

## Tech Stack

- **Electron + Next.js** via Nextron
- **shadcn/ui + Tailwind CSS** for UI
- **Framer Motion** for animations
- **Whisper** (local, `@huggingface/transformers`) for speech-to-text
- **node-pty** for spawning CLI tools in a pseudo-terminal
- **xterm.js** (`@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`) for terminal rendering

## Project Structure

- `main/` — Electron main process
  - `main/lib/cli/providers.ts` — CLI provider definitions and detection
  - `main/lib/cli/pty-manager.ts` — PTY process lifecycle management
  - `main/lib/whisper/` — Local Whisper transcription
  - `main/lib/audio/` — Audio buffer utilities
- `renderer/` — Next.js frontend (pages, components, styles)
  - `renderer/components/widget/` — Floating widget (idle pill, recording, terminal panel)
  - `renderer/pages/` — Home (widget), settings, setup pages
- `app/` — Built Electron app output
- `resources/` — App icons and assets
- `dist/` — Production build output

## Development

```bash
npm install
npm run dev       # Start in dev mode
npm run build     # Production build
```

## Architecture

- **Widget flow**: Idle pill → (shortcut) → Recording → Transcribing → Terminal panel
- **PTY spawning**: Uses login shell (`zsh -l -c <command>`) to inherit PATH/nvm/pyenv
- **CLI providers**: Claude Code and OpenAI CLI are primary; Gemini and Ollama are secondary
- **Terminal stays alive**: Dismissing the widget hides it but keeps the CLI session running

## Key Conventions

- TypeScript throughout
- Tailwind CSS for styling
- Components use shadcn/ui patterns (class-variance-authority, clsx, tailwind-merge)
- IPC via `contextBridge` — renderer talks to main process through `window.bob` API
