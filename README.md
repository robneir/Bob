# Bob

Voice-activated AI assistant for your desktop. Press a shortcut, speak your question, get an answer.

## Features

- **Voice-activated** — Press a keyboard shortcut, speak, get AI responses
- **Local transcription** — Whisper runs on your machine, no audio sent to the cloud
- **Multiple LLM providers** — Ollama (local), OpenAI, or Claude
- **Floating widget** — Minimal corner widget with rich markdown responses
- **Open source** — MIT licensed, fully extensible

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Setup

On first launch, Bob opens a setup wizard to configure:

1. **LLM Provider** — Choose Ollama (free, local) or a cloud API (OpenAI/Claude)
2. **Whisper Model** — Select transcription model size (tiny/base/small)
3. **Keyboard Shortcut** — Default: `Cmd+Shift+Space`
4. **Interaction Mode** — Toggle (press to start/stop) or push-to-talk (hold)

## Using Ollama (Local)

1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Select "Ollama" in Bob settings
4. Start asking questions

## Using Cloud APIs

1. Get an API key from [OpenAI](https://platform.openai.com) or [Anthropic](https://console.anthropic.com)
2. Select your provider in Bob settings
3. Paste your API key
4. Choose a model

## Tech Stack

- **Electron** + **Next.js** (via Nextron)
- **shadcn/ui** + **Tailwind CSS**
- **Framer Motion** for animations
- **Whisper.cpp** for local speech-to-text
- **Vercel AI SDK** for unified LLM integration

## Building

```bash
# Build for production
npm run build
```

Output goes to the `dist/` directory.

## License

MIT
