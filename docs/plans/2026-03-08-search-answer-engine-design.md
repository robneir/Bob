# Bob: Search-Powered Answer Engine

## Vision

Bob is a voice-powered answer engine. Press a shortcut, ask any question, get a grounded answer sourced from the live web. A better, faster Google — right on your desktop.

## Architecture

### Search Pipeline

Every query triggers a web search. Bob never answers from stale training data alone.

**Local models (free path):**

```
User speaks
  → Whisper STT → raw transcription
  → Show transcription to user immediately
  → LLM rewrites voice query into an optimized search query
  → duck-duck-scrape searches DuckDuckGo (free, no API key)
  → ~10 result snippets returned (title + URL + snippet)
  → LLM reviews snippets, chooses which pages to read
  → Bob fetches only the chosen pages
  → Extract clean content: linkedom → @mozilla/readability → turndown (Markdown)
  → LLM synthesizes answer from extracted content
  → Stream answer with source citations
```

The LLM drives every decision:
- How many pages to read (could be 2 or 8, depending on the question)
- Whether to refine the search and try again
- When it has enough information to answer

**OpenAI (paid path):**

Pass query to Responses API with `web_search` tool enabled. OpenAI handles search, reading, and synthesis natively.

**Anthropic/Claude (paid path):**

Pass query with `web_search` tool enabled. Claude handles search via Brave Search natively, returns cited answers.

**User experience is identical across all providers.** The search mechanism is invisible — Bob just answers with current info.

### Model Selection

Auto-detect system RAM at first launch:

| RAM | Default Model | Size | Notes |
|-----|--------------|------|-------|
| 16GB+ | Qwen 3.5 9B (Q4_K_M) | ~6 GB | Best quality, native tool calling, Apache 2.0 |
| 8GB | Phi-4-mini 3.8B (Q4_K_M) | ~2.5 GB | Native tool calling, MIT, great reasoning density |

Both models have native tool calling support, critical for the agentic search loop.

Users can switch to OpenAI or Claude in settings (requires API key). Power users can swap local models.

### Tool Calling (Local Models)

Uses node-llama-cpp's `defineChatSessionFunction()` with grammar-constrained generation:

- LLM generates tool calls as JSON
- Grammar constraints enforce valid JSON at the token level (cannot produce malformed output)
- Tools defined with JSON Schema parameters and async handlers
- Built-in agent loop: call tool → feed result → continue

Tools for the search pipeline:

```
webSearch({ query: string }) → { results: SearchResult[] }
  Searches DuckDuckGo via duck-duck-scrape

fetchPage({ url: string }) → { content: string }
  Fetches and extracts clean Markdown from a URL

refineSearch({ query: string }) → { results: SearchResult[] }
  Searches again with a refined query (same implementation, signals intent)
```

System prompt instructs the model to always search before answering and to base answers only on retrieved content.

## Live Status Feed

Every pipeline step has a labeled status message displayed in the widget. Messages have Claude Code-style personality — self-aware, dry wit, snappy.

Each status maps to a real code execution step. When new functionality is added in the future, it must include a status label.

Example flow:

```
🔍 Figuring out what to ask the internet...
🌐 Asking the internet very nicely...
📋 Scanning 10 results...
📄 This one looks promising, reading it...
📄 Reading one more to be sure...
🧠 Got what I need, connecting the dots...
✍️ Putting it into words...
```

### Implementation

Status messages are emitted from the main process via IPC:

```
sender.send('bob:status', { step: 'search-rewrite', message: '...' })
```

The widget displays them as small, rapidly-cycling text below the main content area. Each message shows only for as long as that step actually takes.

## UX Design

### Appearance

Native macOS vibrancy instead of CSS backdrop-blur:

- Widget BrowserWindow uses `vibrancy: 'hudWindow'` for native frosted glass
- OS compositor handles the blur (better looking + better performance than CSS)
- Text and UI elements remain fully opaque for readability
- Matches macOS system aesthetic (Spotlight, Raycast, Notification Center)

### Interaction Flow

1. **Press shortcut** (Cmd+Shift+Space) → Bob appears, starts listening
2. **Speak your question** → press shortcut again to stop
3. **Transcription shown immediately** so user can verify Bob heard them correctly
4. **Status feed cycles** through pipeline steps while Bob works
5. **Answer streams in** with Markdown formatting
6. **Sources shown** at the bottom as clickable links (open in default browser)
7. **Follow-up:** press shortcut again to ask a follow-up — Bob remembers context
8. **Dismiss:** press Escape or click outside to tuck Bob away

### Key UX Principles

- **Zero config out of the box.** First launch auto-downloads the right model. No accounts, no API keys.
- **Search is invisible.** User never needs to know how results are fetched.
- **Transcription is visible.** User always sees what Bob heard to build trust.
- **Sources are accessible.** Bob isn't replacing the web — he's a better front door to it.
- **Speed feels real.** Status feed shows genuine work, not a fake loading spinner.
- **Escape hatch to dismiss.** Minimal friction to get Bob out of the way.

### Response Panel

- Full right-side vertical space (grows upward from bottom-right, up to full screen height)
- Scrollable when content exceeds screen
- Source links at the bottom of each answer, clickable to open in browser

## First-Run Experience

1. Bob detects available RAM
2. Auto-downloads the appropriate model with a progress bar ("Setting up Bob...")
3. Done — Bob is ready to use

No provider selection on first run. Settings available for users who want OpenAI/Claude.

The existing setup wizard is simplified to just the model download step.

## New Dependencies

| Package | Purpose | Why |
|---------|---------|-----|
| `duck-duck-scrape` | DuckDuckGo search | Free, no API key, pure JS |
| `@mozilla/readability` | Article content extraction | Mozilla's Reader Mode algorithm |
| `linkedom` | Lightweight DOM parser | 1/3 memory of jsdom, pure JS |
| `turndown` | HTML to Markdown | Clean content for LLM consumption |

All pure JS, no native dependencies beyond node-llama-cpp (already in stack).

## Provider Comparison

| Capability | Local (Free) | OpenAI | Claude |
|-----------|-------------|--------|--------|
| Web search | duck-duck-scrape | Native (Responses API) | Native (Brave Search) |
| Tool calling | node-llama-cpp grammar-constrained | AI SDK built-in | AI SDK built-in |
| Cost | Free | Per-token + $25/1k searches | Per-token + $10/1k searches |
| Latency | Search + local inference | API call with search | API call with search |
| Privacy | Fully local (except search queries) | Data sent to OpenAI | Data sent to Anthropic |
| Setup | Auto (no keys) | API key in settings | API key in settings |
