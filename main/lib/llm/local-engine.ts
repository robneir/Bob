import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let llama: any = null
let model: any = null
let context: any = null
let session: any = null
let currentModelPath: string | null = null

export interface CuratedModel {
  id: string
  name: string
  description: string
  size: string
  sizeBytes: number
  uri: string
  recommended?: boolean
}

export const CURATED_MODELS: CuratedModel[] = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    description: 'Ultra fast, basic quality',
    size: '0.8 GB',
    sizeBytes: 800_000_000,
    uri: 'hf:bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M',
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    description: 'Fast with good quality',
    size: '2.0 GB',
    sizeBytes: 2_020_000_000,
    uri: 'hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M',
    recommended: true,
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    description: 'Google, compact and capable',
    size: '1.6 GB',
    sizeBytes: 1_600_000_000,
    uri: 'hf:bartowski/gemma-2-2b-it-GGUF:Q4_K_M',
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi 3.5 Mini',
    description: 'Strong reasoning, compact',
    size: '2.4 GB',
    sizeBytes: 2_400_000_000,
    uri: 'hf:bartowski/Phi-3.5-mini-instruct-GGUF:Q4_K_M',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Best quality, needs more RAM',
    size: '4.4 GB',
    sizeBytes: 4_370_000_000,
    uri: 'hf:bartowski/Mistral-7B-Instruct-v0.3-GGUF:Q4_K_M',
  },
]

export function getModelsDirectory(): string {
  const dir = path.join(app.getPath('userData'), 'models', 'llm')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Dynamic import that bypasses webpack bundling.
 * node-llama-cpp is ESM-only with top-level await, so webpack's require() can't handle it.
 */
async function importNodeLlama(): Promise<typeof import('node-llama-cpp')> {
  return await (Function('return import("node-llama-cpp")')() as Promise<
    typeof import('node-llama-cpp')
  >)
}

export interface DownloadProgress {
  status: 'downloading' | 'complete' | 'error'
  percent: number // 0-100
  downloadedBytes: number
  totalBytes: number
}

/**
 * Download a model from HuggingFace using node-llama-cpp's resolveModelFile.
 * Uses the built-in onProgress callback for accurate progress tracking.
 * Returns the local path to the downloaded model file.
 */
export async function downloadModel(
  uri: string,
  expectedBytes: number,
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  const { resolveModelFile } = await importNodeLlama()
  const dir = getModelsDirectory()

  console.log(`[Bob] Downloading model: ${uri} to ${dir}`)
  onProgress?.({ status: 'downloading', percent: 0, downloadedBytes: 0, totalBytes: expectedBytes })

  try {
    const modelPath = await resolveModelFile(uri, {
      directory: dir,
      cli: false,
      onProgress: ({ totalSize, downloadedSize }) => {
        const total = totalSize || expectedBytes
        const percent = total > 0 ? Math.min(99, Math.round((downloadedSize / total) * 100)) : 0
        onProgress?.({ status: 'downloading', percent, downloadedBytes: downloadedSize, totalBytes: total })
      },
    })

    console.log(`[Bob] Model downloaded: ${modelPath}`)
    onProgress?.({ status: 'complete', percent: 100, downloadedBytes: expectedBytes, totalBytes: expectedBytes })
    return modelPath
  } catch (error) {
    throw error
  }
}

/**
 * Load a model for inference. Reuses if same model is already loaded.
 */
export async function loadModel(modelPath: string): Promise<void> {
  if (currentModelPath === modelPath && model) return

  await unloadModel()

  console.log(`[Bob] Loading local model: ${modelPath}`)
  const { getLlama } = await importNodeLlama()

  llama = await getLlama()
  model = await llama.loadModel({ modelPath })
  context = await model.createContext()
  currentModelPath = modelPath

  console.log('[Bob] Local model loaded successfully')
}

/**
 * Unload the current model and free resources.
 */
export async function unloadModel(): Promise<void> {
  try {
    clearChat()
    if (context) {
      await context.dispose()
      context = null
    }
    if (model) {
      await model.dispose()
      model = null
    }
    if (llama) {
      await llama.dispose()
      llama = null
    }
  } catch (e) {
    console.warn('[Bob] Error during model unload:', e)
  }
  currentModelPath = null
}

/**
 * Stream a chat completion using the loaded local model.
 * Reuses the session across calls to maintain conversation history.
 */
export async function streamChat(
  text: string,
  systemPrompt: string,
  onToken: (token: string) => void
): Promise<string> {
  if (!model || !context) {
    throw new Error('No local model loaded. Please download a model first.')
  }

  const { LlamaChatSession } = await importNodeLlama()

  // Create session on first use (reuse for follow-ups to keep history)
  if (!session) {
    session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt,
    })
  }

  const response = await session.prompt(text, {
    onTextChunk: onToken,
  })

  return response
}

/**
 * Clear the current chat session (resets conversation history).
 * The model stays loaded.
 */
export function clearChat(): void {
  if (session) {
    try {
      session.contextSequence?.dispose()
    } catch {}
    session = null
  }
}

/**
 * Check if a model is currently loaded and ready.
 */
export function isModelLoaded(): boolean {
  return model !== null && context !== null
}

/**
 * Get the list of curated models with download status.
 */
export function getModelsWithStatus(
  downloadedModels: Record<string, string>
): (CuratedModel & { downloaded: boolean; localPath?: string })[] {
  return CURATED_MODELS.map((m) => ({
    ...m,
    downloaded: !!downloadedModels[m.id],
    localPath: downloadedModels[m.id] || undefined,
  }))
}
