# Bob

Voice-activated AI assistant desktop app. Press a shortcut, speak, get answers.

## Tech Stack

- **Electron + Next.js** via Nextron
- **shadcn/ui + Tailwind CSS** for UI
- **Framer Motion** for animations
- **Whisper** (local) for speech-to-text
- **Vercel AI SDK** for LLM integration (Ollama, OpenAI, Claude)

## Project Structure

- `main/` — Electron main process
- `renderer/` — Next.js frontend (pages, components, styles)
- `app/` — Built Electron app output
- `resources/` — App icons and assets
- `dist/` — Production build output

## Development

```bash
npm install
npm run dev       # Start in dev mode
npm run build     # Production build
```

## Key Conventions

- TypeScript throughout
- Tailwind CSS for styling
- Components use shadcn/ui patterns (class-variance-authority, clsx, tailwind-merge)
- LLM providers are swappable via Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `node-llama-cpp`)
