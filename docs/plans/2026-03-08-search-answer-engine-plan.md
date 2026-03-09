# Search-Powered Answer Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Bob from a basic voice assistant into a search-powered answer engine that grounds every response in live web data.

**Architecture:** Local models use node-llama-cpp's `defineChatSessionFunction` with `webSearch` and `fetchPage` tools — the model drives the search loop via grammar-constrained tool calling. Cloud providers (OpenAI, Anthropic) use their native web search APIs. A status emitter broadcasts live progress messages to the widget UI. The widget uses native macOS vibrancy for a polished frosted-glass look.

**Tech Stack:** node-llama-cpp (tool calling + grammar constraints), duck-duck-scrape (DuckDuckGo search), linkedom + @mozilla/readability + turndown (page extraction), Electron IPC (status feed), Framer Motion (status animations)

**Design doc:** `docs/plans/2026-03-08-search-answer-engine-design.md`

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install search and extraction packages**

```bash
cd /Users/robertneir/Desktop/Playground/Bob
npm install duck-duck-scrape @mozilla/readability linkedom turndown
```

**Step 2: Install TypeScript types for turndown**

```bash
npm install --save-dev @types/turndown
```

Note: `linkedom` and `duck-duck-scrape` ship their own types. `@mozilla/readability` ships types. Only `turndown` needs `@types/turndown`.

**Step 3: Verify installation**

```bash
node -e "require('duck-duck-scrape'); require('linkedom'); require('turndown'); console.log('All packages loaded OK')"
```

Expected: `All packages loaded OK`

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add search and page extraction dependencies"
```

---

## Task 2: Create Web Search Module

**Files:**
- Create: `main/lib/search/web-search.ts`

**Step 1: Create the search module**

```typescript
// main/lib/search/web-search.ts
import * as DDG from 'duck-duck-scrape'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Search DuckDuckGo and return result snippets.
 * Returns up to `maxResults` results (default 10).
 */
export async function searchWeb(
  query: string,
  maxResults = 10
): Promise<SearchResult[]> {
  const response = await DDG.search(query, {
    safeSearch: DDG.SafeSearchType.MODERATE,
  })

  if (!response?.results?.length) {
    return []
  }

  return response.results.slice(0, maxResults).map((r) => ({
    title: r.title || '',
    url: r.url || r.hostname || '',
    snippet: r.description || '',
  }))
}
```

**Step 2: Verify it works**

```bash
cd /Users/robertneir/Desktop/Playground/Bob
npx ts-node --skip-project -e "
const DDG = require('duck-duck-scrape');
DDG.search('test query').then(r => console.log('Results:', r.results?.length || 0));
"
```

Expected: `Results:` followed by a number > 0

**Step 3: Commit**

```bash
git add main/lib/search/web-search.ts
git commit -m "feat: add DuckDuckGo web search module"
```

---

## Task 3: Create Page Extraction Module

**Files:**
- Create: `main/lib/search/page-extractor.ts`

**Step 1: Create the page extractor**

```typescript
// main/lib/search/page-extractor.ts
import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// Strip images and iframes to keep content text-only
turndown.remove(['img', 'iframe', 'video', 'audio', 'svg', 'canvas'])

export interface ExtractedPage {
  url: string
  title: string
  content: string // Markdown
  byline?: string
}

/**
 * Fetch a URL and extract its main content as Markdown.
 * Returns null if the page can't be fetched or parsed.
 */
export async function extractPage(url: string): Promise<ExtractedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const html = await response.text()
    const { document } = parseHTML(html)

    const article = new Readability(document as any).parse()
    if (!article?.content) return null

    const markdown = turndown.turndown(article.content)

    // Truncate very long articles to avoid blowing up context
    const maxChars = 4000
    const trimmed =
      markdown.length > maxChars
        ? markdown.slice(0, maxChars) + '\n\n[Content truncated...]'
        : markdown

    return {
      url,
      title: article.title || '',
      content: trimmed,
      byline: article.byline || undefined,
    }
  } catch {
    return null
  }
}
```

**Step 2: Commit**

```bash
git add main/lib/search/page-extractor.ts
git commit -m "feat: add page content extraction module"
```

---

## Task 4: Create Status Emitter System

The status emitter sends labeled progress messages from the main process to the renderer via IPC. Every pipeline step gets a message.

**Files:**
- Create: `main/lib/status.ts`
- Modify: `main/preload.ts` (add status listener)
- Modify: `renderer/preload.d.ts` (update types)

**Step 1: Create the status emitter**

```typescript
// main/lib/status.ts
import { WebContents } from 'electron'

export interface StatusMessage {
  step: string // machine-readable step ID
  message: string // human-readable message with personality
  icon: string // emoji
}

/**
 * Pre-defined status messages for search pipeline steps.
 * Each step in the pipeline must have a labeled status.
 * When adding new pipeline steps, add a status here.
 */
const STATUS_MESSAGES: Record<string, StatusMessage> = {
  'transcribing': {
    step: 'transcribing',
    message: 'Turning speech into text...',
    icon: '🎙️',
  },
  'rewriting-query': {
    step: 'rewriting-query',
    message: 'Figuring out what to ask the internet...',
    icon: '🔍',
  },
  'searching': {
    step: 'searching',
    message: 'Asking the internet very nicely...',
    icon: '🌐',
  },
  'scanning-results': {
    step: 'scanning-results',
    message: 'Scanning results for the good stuff...',
    icon: '📋',
  },
  'reading-page': {
    step: 'reading-page',
    message: 'This one looks promising, reading it...',
    icon: '📄',
  },
  'reading-more': {
    step: 'reading-more',
    message: 'Reading one more to be thorough...',
    icon: '📄',
  },
  'synthesizing': {
    step: 'synthesizing',
    message: 'Got what I need, connecting the dots...',
    icon: '🧠',
  },
  'answering': {
    step: 'answering',
    message: 'Putting it into words...',
    icon: '✍️',
  },
  'searching-again': {
    step: 'searching-again',
    message: 'Hmm, let me try a different angle...',
    icon: '🔄',
  },
  'thinking': {
    step: 'thinking',
    message: 'Thinking about this one...',
    icon: '💭',
  },
}

/**
 * Emit a status message to the renderer.
 * Use step IDs from STATUS_MESSAGES, or pass a custom message.
 */
export function emitStatus(
  sender: WebContents,
  stepOrMessage: string,
  customMessage?: string
): void {
  if (sender.isDestroyed()) return

  const predefined = STATUS_MESSAGES[stepOrMessage]
  if (predefined) {
    sender.send('bob:status', predefined)
  } else {
    sender.send('bob:status', {
      step: stepOrMessage,
      message: customMessage || stepOrMessage,
      icon: '⚡',
    })
  }
}

/**
 * Create a status emitter bound to a specific sender.
 * Makes it easy to emit statuses throughout a pipeline.
 */
export function createStatusEmitter(sender: WebContents) {
  return (stepOrMessage: string, customMessage?: string) =>
    emitStatus(sender, stepOrMessage, customMessage)
}
```

**Step 2: Add status listener to preload.ts**

In `main/preload.ts`, add a new listener inside the `bob` object, after the `onStreamError` listener:

```typescript
  // Status feed
  onStatus: (cb: (status: { step: string; message: string; icon: string }) => void) => {
    const handler = (_event: IpcRendererEvent, status: { step: string; message: string; icon: string }) => cb(status)
    ipcRenderer.on('bob:status', handler)
    return () => ipcRenderer.removeListener('bob:status', handler)
  },
```

**Step 3: Commit**

```bash
git add main/lib/status.ts main/preload.ts
git commit -m "feat: add status emitter system with labeled pipeline steps"
```

---

## Task 5: Update Model List

Replace the old curated models with the new recommended models. Add RAM auto-detection for default model selection.

**Files:**
- Modify: `main/lib/llm/local-engine.ts:21-63` (replace CURATED_MODELS)
- Modify: `main/background.ts` (add RAM detection, update defaults)

**Step 1: Replace CURATED_MODELS in local-engine.ts**

Replace the entire `CURATED_MODELS` array (lines 21-63) with:

```typescript
export const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'qwen-3.5-9b',
    name: 'Qwen 3.5 9B',
    description: 'Best quality, great for search and reasoning',
    size: '6.0 GB',
    sizeBytes: 6_000_000_000,
    uri: 'hf:bartowski/Qwen_Qwen3.5-9B-GGUF:Q4_K_M',
    recommended: true,
    minRamGB: 16,
  },
  {
    id: 'phi-4-mini',
    name: 'Phi-4 Mini 3.8B',
    description: 'Fast and capable, runs on any Mac',
    size: '2.5 GB',
    sizeBytes: 2_500_000_000,
    uri: 'hf:bartowski/microsoft_Phi-4-mini-instruct-GGUF:Q4_K_M',
    recommended: true,
    minRamGB: 8,
  },
  {
    id: 'qwen-2.5-7b',
    name: 'Qwen 2.5 7B',
    description: 'Proven all-rounder with strong tool calling',
    size: '4.5 GB',
    sizeBytes: 4_500_000_000,
    uri: 'hf:bartowski/Qwen2.5-7B-Instruct-GGUF:Q4_K_M',
    minRamGB: 12,
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: 'Ultra lightweight, basic quality',
    size: '2.0 GB',
    sizeBytes: 2_020_000_000,
    uri: 'hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M',
    minRamGB: 8,
  },
]
```

Also update the `CuratedModel` interface to include `minRamGB`:

```typescript
export interface CuratedModel {
  id: string
  name: string
  description: string
  size: string
  sizeBytes: number
  uri: string
  recommended?: boolean
  minRamGB?: number
}
```

**Step 2: Add RAM detection utility to local-engine.ts**

Add after the `CURATED_MODELS` array:

```typescript
import os from 'os'

/**
 * Get the recommended default model based on available system RAM.
 */
export function getDefaultModelId(): string {
  const totalRAM = os.totalmem()
  const ramGB = totalRAM / (1024 * 1024 * 1024)

  if (ramGB >= 16) return 'qwen-3.5-9b'
  return 'phi-4-mini'
}
```

**Step 3: Update background.ts settings defaults**

In `main/background.ts`, change the `localModel` default from empty string to use auto-detection. In the app lifecycle section (after `await app.whenReady()`), add logic to auto-set the local model if none is selected:

```typescript
// Auto-select model based on RAM if no model selected
if (!settingsStore.get('localModel')) {
  const { getDefaultModelId } = await import('./lib/llm/local-engine')
  settingsStore.set('localModel', getDefaultModelId())
}
```

**Step 4: Commit**

```bash
git add main/lib/llm/local-engine.ts main/background.ts
git commit -m "feat: update model list with Qwen 3.5 9B and Phi-4-mini, add RAM auto-detect"
```

---

## Task 6: Build Agentic Search Pipeline for Local LLM

This is the core feature. Rewrites the `llm:query` handler for local models to use tool calling with web search.

**Files:**
- Create: `main/lib/search/search-pipeline.ts`
- Modify: `main/background.ts:420-513` (refactor llm:query handler)

**Step 1: Create the search pipeline orchestrator**

```typescript
// main/lib/search/search-pipeline.ts
import { WebContents } from 'electron'
import { searchWeb, SearchResult } from './web-search'
import { extractPage, ExtractedPage } from './page-extractor'
import { createStatusEmitter } from '../status'

export interface SearchPipelineResult {
  sources: { title: string; url: string }[]
}

/**
 * System prompt for Bob as a search-powered answer engine.
 * Instructs the model to always search before answering.
 */
export const SEARCH_SYSTEM_PROMPT = `You are Bob, a search-powered answer engine. The user spoke their question aloud and it was transcribed.

Your job: search the web, read the results, and give the user a grounded answer.

Rules:
- ALWAYS use the webSearch tool before answering. Never answer from memory alone.
- After getting search results, use fetchPage to read the most relevant ones.
- Read as many pages as you need to give a thorough answer (usually 2-5).
- If results aren't good enough, search again with a refined query.
- Base your answer ONLY on what you read from the search results.
- Include source URLs at the end of your answer in this format:
  Sources:
  - [Title](url)
  - [Title](url)
- Be concise and direct. Use markdown formatting when helpful.
- If the search results don't contain the answer, say so honestly.`

/**
 * Define the search tools for node-llama-cpp's function calling.
 * Returns the tools object and a sources tracker.
 */
export function createSearchTools(
  sender: WebContents,
  importNodeLlama: () => Promise<typeof import('node-llama-cpp')>
) {
  const status = createStatusEmitter(sender)
  const sources: { title: string; url: string }[] = []
  let searchCount = 0
  let pageCount = 0

  return {
    sources,
    getTools: async () => {
      const { defineChatSessionFunction } = await importNodeLlama()

      return {
        webSearch: defineChatSessionFunction({
          description:
            'Search the web for current information. Use this to find answers to any factual question.',
          params: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to look up',
              },
            },
          },
          async handler({ query }) {
            searchCount++
            if (searchCount === 1) {
              status('searching')
            } else {
              status('searching-again')
            }

            const results = await searchWeb(query)

            if (results.length === 0) {
              return 'No results found. Try a different search query.'
            }

            status('scanning-results')

            return results
              .map(
                (r, i) =>
                  `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet}`
              )
              .join('\n\n')
          },
        }),

        fetchPage: defineChatSessionFunction({
          description:
            'Fetch and read the full content of a web page. Use this after searching to read pages that look relevant.',
          params: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL of the page to read',
              },
            },
          },
          async handler({ url }) {
            pageCount++
            status(
              pageCount <= 1 ? 'reading-page' : 'reading-more',
              pageCount > 2
                ? `Reading source ${pageCount}...`
                : undefined
            )

            const page = await extractPage(url)

            if (!page) {
              return 'Could not fetch this page. Try a different URL.'
            }

            sources.push({ title: page.title, url: page.url })

            return `# ${page.title}\n\n${page.content}`
          },
        }),
      }
    },
  }
}
```

**Step 2: Refactor the local model path in the llm:query handler**

In `main/background.ts`, replace the local model section of the `llm:query` handler (the `if (provider === 'local')` block, approximately lines 434-461) with:

```typescript
    if (provider === 'local') {
      const { loadModel } = await import('./lib/llm/local-engine')
      const { createSearchTools, SEARCH_SYSTEM_PROMPT } = await import(
        './lib/search/search-pipeline'
      )

      const modelId = settingsStore.get('localModel') as string
      const downloaded =
        (settingsStore.get('downloadedModels') as Record<string, string>) || {}
      const modelPath = downloaded[modelId]

      if (!modelPath) {
        throw new Error(
          'No local model downloaded. Please download a model in Settings.'
        )
      }

      await loadModel(modelPath)

      const { LlamaChatSession } = await (
        Function('return import("node-llama-cpp")')() as Promise<
          typeof import('node-llama-cpp')
        >
      )

      // Create a fresh session for each query to include search tools
      // (tool-calling sessions don't reuse well across queries)
      const importNodeLlama = () =>
        Function('return import("node-llama-cpp")')() as Promise<
          typeof import('node-llama-cpp')
        >

      const { sources, getTools } = createSearchTools(sender, importNodeLlama)
      const functions = await getTools()

      // Use the existing context from loadModel
      const { default: localEngine } = await import('./lib/llm/local-engine')

      emitStatus(sender, 'thinking')
      sender.send('bob:state', 'streaming')

      const chatSession = new LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt: SEARCH_SYSTEM_PROMPT,
      })

      emitStatus(sender, 'answering')

      const response = await chatSession.prompt(text, {
        functions,
        onTextChunk: (chunk) => {
          if (!sender.isDestroyed()) {
            sender.send('llm:token', chunk)
          }
        },
      })

      // Send sources metadata to renderer
      if (sources.length > 0 && !sender.isDestroyed()) {
        sender.send('bob:sources', sources)
      }

      sender.send('llm:done')
      sender.send('bob:state', 'complete')
    }
```

Note: This requires exporting `context` from local-engine.ts or restructuring how the session is created. The simplest approach is to add a `getContext()` export to local-engine.ts:

```typescript
// Add to main/lib/llm/local-engine.ts
export function getContext() {
  return context
}
```

Then in background.ts, import and use it:

```typescript
const { loadModel, getContext } = await import('./lib/llm/local-engine')
// ...
await loadModel(modelPath)
const ctx = getContext()
const chatSession = new LlamaChatSession({
  contextSequence: ctx.getSequence(),
  systemPrompt: SEARCH_SYSTEM_PROMPT,
})
```

**Step 3: Add the emitStatus import to background.ts**

At the top of the `llm:query` handler, add:

```typescript
const { emitStatus } = await import('./lib/status')
```

**Step 4: Test the full pipeline manually**

```bash
npm run dev
```

Trigger a voice query. Watch the Electron console (DevTools) for search/fetch logs. Verify:
- Status messages appear in DevTools console
- DuckDuckGo search executes
- Pages are fetched and extracted
- LLM receives search content and generates an answer

**Step 5: Commit**

```bash
git add main/lib/search/search-pipeline.ts main/lib/llm/local-engine.ts main/background.ts
git commit -m "feat: agentic search pipeline with tool calling for local LLM"
```

---

## Task 7: Update Cloud Provider Handlers

Enable native web search for OpenAI and Anthropic. Fall back to our search pipeline if native search isn't available.

**Files:**
- Modify: `main/background.ts:462-506` (cloud provider section of llm:query)

**Step 1: Research current AI SDK support**

Before implementing, verify the current Vercel AI SDK support for native search. Check the docs:
- `@ai-sdk/openai` — does it support the `web_search` tool in Responses API?
- `@ai-sdk/anthropic` — does it support the `web_search` tool with beta header?

If the AI SDK doesn't support native search for either provider, use our search pipeline instead (same flow as local, but orchestrated by our code — search → fetch → inject results as context → call cloud API).

**Step 2: Implement OpenAI with native web search (if supported)**

If the AI SDK supports it, the implementation looks like:

```typescript
if (provider === 'openai') {
  const { createOpenAI } = await import('@ai-sdk/openai')
  const openai = createOpenAI({
    apiKey: settingsStore.get('openaiApiKey') as string,
  })

  emitStatus(sender, 'thinking')
  sender.send('bob:state', 'streaming')

  // Use web search tool if available
  const result = streamText({
    model: openai(settingsStore.get('openaiModel') as string),
    system: 'You are Bob, a search-powered answer engine. The user spoke their question aloud. Search the web and give a grounded answer with source citations.',
    messages: cloudMessages,
    tools: {
      web_search: openai.tools.webSearch(),
    },
  })

  // ... stream tokens as before
}
```

If native search is NOT supported by the AI SDK, implement the fallback:

```typescript
if (provider === 'openai') {
  const { createOpenAI } = await import('@ai-sdk/openai')
  const { searchWeb } = await import('./lib/search/web-search')
  const { extractPage } = await import('./lib/search/page-extractor')

  emitStatus(sender, 'searching')
  const searchResults = await searchWeb(text, 8)

  emitStatus(sender, 'reading-page')
  const pages = await Promise.all(
    searchResults.slice(0, 5).map((r) => extractPage(r.url))
  )
  const validPages = pages.filter(Boolean)

  const searchContext = validPages
    .map((p) => `## ${p.title}\nSource: ${p.url}\n\n${p.content}`)
    .join('\n\n---\n\n')

  const openai = createOpenAI({
    apiKey: settingsStore.get('openaiApiKey') as string,
  })

  emitStatus(sender, 'answering')
  sender.send('bob:state', 'streaming')

  const enrichedMessages = [
    ...cloudMessages,
    {
      role: 'user' as const,
      content: `Here are web search results for the user's question:\n\n${searchContext}\n\nBased on these search results, answer the question: ${text}\n\nInclude source URLs at the end of your answer.`,
    },
  ]

  const result = streamText({
    model: openai(settingsStore.get('openaiModel') as string),
    system: 'You are Bob, a search-powered answer engine. Answer based on the provided search results. Be concise and cite sources.',
    messages: enrichedMessages,
  })

  let assistantResponse = ''
  for await (const chunk of result.textStream) {
    if (sender.isDestroyed()) break
    assistantResponse += chunk
    sender.send('llm:token', chunk)
  }

  cloudMessages.push({ role: 'user', content: text })
  cloudMessages.push({ role: 'assistant', content: assistantResponse })

  sender.send('llm:done')
  sender.send('bob:state', 'complete')
}
```

**Step 3: Implement Anthropic with native web search (if supported)**

Same pattern as OpenAI. Check if `@ai-sdk/anthropic` supports the `web_search` tool. If yes, enable it. If not, use the same search-inject fallback pattern.

**Step 4: Add status emissions to cloud handlers**

Ensure both cloud handlers emit status messages via `emitStatus()` so the status feed stays active during cloud queries.

**Step 5: Commit**

```bash
git add main/background.ts
git commit -m "feat: add web search for cloud providers (OpenAI and Anthropic)"
```

---

## Task 8: Build Status Feed UI Component

**Files:**
- Create: `renderer/components/widget/status-feed.tsx`
- Modify: `renderer/components/widget/widget-container.tsx` (add status state + listener)

**Step 1: Create the status feed component**

```tsx
// renderer/components/widget/status-feed.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StatusFeedProps {
  status: { step: string; message: string; icon: string } | null
}

export default function StatusFeed({ status }: StatusFeedProps) {
  if (!status) return null

  return (
    <div className="flex items-center gap-2 px-3.5 py-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={status.step + status.message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <span className="text-[13px]">{status.icon}</span>
          <span className="text-[11px] font-medium text-muted-foreground/80">
            {status.message}
          </span>
          <motion.span
            className="text-[11px] text-muted-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            ...
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Wire status into widget-container.tsx**

Add state and listener in `widget-container.tsx`:

```typescript
// Add state
const [currentStatus, setCurrentStatus] = useState<{
  step: string
  message: string
  icon: string
} | null>(null)

// Add listener in the main useEffect (alongside onStateChange, etc.)
const unsubStatus = window.bob.onStatus?.((status) => {
  setCurrentStatus(status)
})

// Clear status when state changes to 'complete', 'idle', or 'error'
// Add to the onStateChange callback:
if (newState === 'complete' || newState === 'idle' || newState === 'error') {
  setCurrentStatus(null)
}

// Add cleanup
return () => {
  // ... existing cleanups
  unsubStatus?.()
}
```

In the JSX, render `<StatusFeed>` inside the response panel area (for `thinking` and `streaming` states). Add it in the `thinking || streaming || complete` block, right before `<ResponsePanel>`:

```tsx
{(state === 'thinking' || state === 'streaming' || state === 'complete') && (
  <motion.div ...>
    <ResponsePanel
      state={state}
      messages={messages}
      streamingResponse={streamingResponse}
      shortcutLabel={shortcutLabel}
      currentStatus={currentStatus}
      onDismiss={handleDismiss}
      onClear={handleClear}
      onCopy={handleCopy}
    />
  </motion.div>
)}
```

**Step 3: Show StatusFeed inside ResponsePanel**

In `response-panel.tsx`, add a `currentStatus` prop and render `StatusFeed` inside the panel, below the header and above/alongside the thinking indicator:

```tsx
// Add to ResponsePanelProps
currentStatus: { step: string; message: string; icon: string } | null

// Render in the panel, replace or augment the thinking indicator
{state === 'thinking' && (
  <StatusFeed status={currentStatus} />
)}
```

**Step 4: Commit**

```bash
git add renderer/components/widget/status-feed.tsx renderer/components/widget/widget-container.tsx renderer/components/widget/response-panel.tsx
git commit -m "feat: add live status feed UI with animated step messages"
```

---

## Task 9: Update Response Panel with Source Links

**Files:**
- Modify: `renderer/components/widget/response-panel.tsx`
- Modify: `renderer/components/widget/widget-container.tsx`
- Modify: `main/preload.ts` (add sources listener)

**Step 1: Add sources IPC to preload**

In `main/preload.ts`, add after the `onStatus` listener:

```typescript
  // Sources from search pipeline
  onSources: (cb: (sources: { title: string; url: string }[]) => void) => {
    const handler = (_event: IpcRendererEvent, sources: { title: string; url: string }[]) => cb(sources)
    ipcRenderer.on('bob:sources', handler)
    return () => ipcRenderer.removeListener('bob:sources', handler)
  },
```

**Step 2: Add sources state to widget-container.tsx**

```typescript
const [sources, setSources] = useState<{ title: string; url: string }[]>([])

// Add listener
const unsubSources = window.bob.onSources?.((newSources) => {
  setSources((prev) => [...prev, ...newSources])
})

// Clear sources on handleClear and handleDismiss
setSources([])

// Pass to ResponsePanel
<ResponsePanel sources={sources} ... />
```

**Step 3: Render clickable source links in ResponsePanel**

Add a sources section at the bottom of the response panel, after the streaming content but before the action bar:

```tsx
// Add to ResponsePanelProps
sources: { title: string; url: string }[]

// Render after the scroll area, before the action bar
{sources.length > 0 && state === 'complete' && (
  <div className="border-t border-border/30 px-3.5 py-2">
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
      Sources
    </p>
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source, i) => (
        <a
          key={i}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          title={source.url}
        >
          <span className="max-w-[180px] truncate">
            {source.title || new URL(source.url).hostname}
          </span>
        </a>
      ))}
    </div>
  </div>
)}
```

Links use `target="_blank"` which opens in the user's default browser from Electron.

**Step 4: Commit**

```bash
git add main/preload.ts renderer/components/widget/widget-container.tsx renderer/components/widget/response-panel.tsx
git commit -m "feat: show clickable source links in response panel"
```

---

## Task 10: Add Native macOS Vibrancy

**Files:**
- Modify: `main/background.ts:60-96` (createWidgetWindow)

**Step 1: Add vibrancy to widget window**

In `createWidgetWindow()` in `main/background.ts`, add `vibrancy` to the BrowserWindow options and remove `transparent` (vibrancy handles its own transparency):

```typescript
function createWidgetWindow() {
  const pos = getWidgetPosition()

  widgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT_COLLAPSED,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: false,          // Changed: vibrancy handles transparency
    vibrancy: 'hudWindow',       // Added: native macOS frosted glass
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // ... rest unchanged
}
```

**Step 2: Update CSS to work with vibrancy**

In `renderer/components/widget/response-panel.tsx`, reduce the background opacity of the card so the vibrancy shows through:

Change the outer div class from:
```
bg-card/94
```
to:
```
bg-card/70
```

Similarly update `idle-pill.tsx` (`bg-card/92` → `bg-card/60`), `recording-pill.tsx` (`bg-card/92` → `bg-card/60`), and `transcribing-pill.tsx` (`bg-card/92` → `bg-card/60`).

Remove `backdrop-blur-xl` from all pill/panel components since the native vibrancy handles the blur.

**Step 3: Test appearance**

```bash
npm run dev
```

Verify the widget has native frosted glass appearance. If vibrancy doesn't work well with `transparent: false`, try keeping `transparent: true` and adding `vibrancy: 'hudWindow'` — some Electron versions need both.

**Step 4: Commit**

```bash
git add main/background.ts renderer/components/widget/response-panel.tsx renderer/components/widget/idle-pill.tsx renderer/components/widget/recording-pill.tsx renderer/components/widget/transcribing-pill.tsx
git commit -m "feat: add native macOS vibrancy for frosted glass appearance"
```

---

## Task 11: Add Escape Key to Dismiss + UX Polish

**Files:**
- Modify: `renderer/components/widget/widget-container.tsx`
- Modify: `main/background.ts` (make widget focusable for key events)

**Step 1: Add keydown listener for Escape**

In `widget-container.tsx`, add a `useEffect` for the Escape key:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [handleDismiss])
```

**Step 2: Make widget focusable when active**

The widget is currently `focusable: false`. For keyboard events to work, it needs to be focusable when the user is interacting. In `main/background.ts`, update the shortcut handler to set focusable when recording starts:

```typescript
// In the shortcut handler, when starting recording:
widgetWindow.setFocusable(true)
widgetWindow.focus()

// In the widget:hide handler, set back to non-focusable:
widgetWindow.setFocusable(false)
```

**Step 3: Commit**

```bash
git add renderer/components/widget/widget-container.tsx main/background.ts
git commit -m "feat: add Escape key to dismiss widget"
```

---

## Task 12: Simplify First-Run Experience

**Files:**
- Modify: `main/background.ts:562-574` (first-run logic)
- Modify: `renderer/pages/setup.tsx` (simplify wizard)

**Step 1: Update first-run flow in background.ts**

After the model auto-detection (from Task 5), update the first-run logic to auto-download the detected model instead of showing a full wizard:

```typescript
// If setup not complete, auto-download default model
if (!settingsStore.get('setupComplete')) {
  const { getDefaultModelId, CURATED_MODELS, downloadModel } = await import(
    './lib/llm/local-engine'
  )
  const defaultId = settingsStore.get('localModel') as string || getDefaultModelId()
  const defaultModel = CURATED_MODELS.find((m) => m.id === defaultId)

  if (defaultModel) {
    const downloaded = (settingsStore.get('downloadedModels') as Record<string, string>) || {}

    if (!downloaded[defaultId]) {
      // Show setup window with download progress
      const setupWin = createSettingsWindow()
      const port = process.argv[2]
      await setupWin.loadURL(
        isProd ? 'app://./setup' : `http://localhost:${port}/setup`
      )
      setupWin.show()
    } else {
      settingsStore.set('setupComplete', true)
    }
  }
}
```

**Step 2: Simplify setup.tsx**

Reduce the setup wizard to 3 steps:
1. **Welcome** — "Hi, I'm Bob. Let me get set up."
2. **Downloading** — Auto-downloads the detected model with progress bar. No model selection needed.
3. **Done** — "All set! Press [shortcut] to ask me anything."

Remove the provider selection, whisper model selection, and shortcut configuration steps from the initial wizard. These move to Settings for power users.

This is a significant refactor of `setup.tsx`. The key changes:
- Remove steps 2 (provider), 3 (provider-config), 4 (whisper), 5 (shortcut)
- Step 2 becomes the auto-download step
- Step 3 becomes the completion step
- Auto-start download on mount (no user action needed)

**Step 3: Commit**

```bash
git add main/background.ts renderer/pages/setup.tsx
git commit -m "feat: simplify first-run to auto-detect and download model"
```

---

## Summary: Task Dependency Order

```
Task 1: Install deps (no dependencies)
  ↓
Task 2: Web search module (needs deps)
Task 3: Page extractor module (needs deps)
Task 4: Status emitter (no dependencies)
  ↓
Task 5: Update model list (no dependencies on 2-4)
  ↓
Task 6: Agentic search pipeline (needs 2, 3, 4, 5)
Task 7: Cloud provider handlers (needs 2, 3, 4)
  ↓
Task 8: Status feed UI (needs 4)
Task 9: Source links UI (needs 6)
Task 10: Native vibrancy (no dependencies)
Task 11: Escape to dismiss (no dependencies)
Task 12: Simplify first-run (needs 5)
```

**Parallelizable groups:**
- Tasks 2, 3, 4, 5 can all be done in parallel
- Tasks 8, 10, 11 can be done in parallel (all UI, no interdependencies)
- Tasks 6, 7 depend on 2-4 but are independent of each other
- Task 9 depends on 6 (needs sources data)
- Task 12 depends on 5 (needs new model list)
