# Bob CLI Pivot — Design

## Goal

Transform Bob from a standalone AI search engine into a voice-enabled floating terminal that launches AI CLI tools (Claude Code, OpenAI CLI, etc.). Press a hotkey, speak, see your words typed into the CLI, get answers.

## Architecture

Bob is a thin layer: hotkey + voice + floating terminal. The AI CLIs do all the hard work.

```
Hotkey → Record → Whisper transcribe → Type into PTY → CLI answers → xterm.js renders
```

### What stays
- Electron + Nextron shell
- Floating widget (bottom-right, always-on-top, idle pill)
- Local Whisper for speech-to-text
- System tray, global hotkey, Escape to dismiss

### What's new
- `node-pty` spawns CLI processes in a PTY (inherits user's shell environment)
- `xterm.js` renders terminal output in the widget
- CLI provider system — select which CLI to launch

### What gets removed
- `main/lib/llm/` — node-llama-cpp, model management
- `main/lib/search/` — web search, page extraction, search pipeline
- `main/lib/status.ts` — status emitter
- `renderer/components/widget/response-panel.tsx` — custom response UI
- `renderer/components/widget/streaming-markdown.tsx`
- `renderer/components/widget/status-feed.tsx`
- Setup wizard (model download) — replaced with CLI detection
- Dependencies: node-llama-cpp, duck-duck-scrape, linkedom, @mozilla/readability, turndown, ai, @ai-sdk/openai, @ai-sdk/anthropic

## CLI Provider System

**Primary (shown in settings):**
- Claude Code — `claude`
- OpenAI CLI — `openai`

**Secondary (under "More providers"):**
- Gemini CLI, Ollama, or any custom command

Each provider is a config: `{ id, name, command }`. On first run, Bob detects installed CLIs via `which`. Auto-selects the first found. No API key management — CLIs handle their own auth.

## Voice-to-Terminal Flow

1. Hotkey → widget expands (640px wide), recording starts
2. Speak → release hotkey → Whisper transcribes
3. Transcribed text pasted into PTY stdin (user reviews before sending)
4. User presses Enter to submit
5. CLI output streams into xterm.js
6. Hotkey again for follow-up voice input
7. Escape hides widget — CLI session stays alive in background
8. "Clear" kills CLI process, starts fresh session

## Widget Behavior

- **Idle:** Small pill (same as current)
- **Expanded:** 640px wide, resizable by dragging left edge. Height grows with content up to screen height minus margin.
- **Dismiss:** Hides widget, PTY stays alive. Re-open to resume.
- **Clear:** Kills PTY, next activation spawns fresh CLI session.

## New Dependencies

- `node-pty` — PTY process spawning
- `xterm` — terminal renderer
- `@xterm/addon-fit` — auto-resize terminal to container
- `@xterm/addon-web-links` — clickable URLs
