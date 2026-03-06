import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let transcriber: any = null
let isLoading = false
let loadError: string | null = null

const MODEL_MAP: Record<string, string> = {
  tiny: 'onnx-community/whisper-tiny',
  base: 'onnx-community/whisper-base',
  small: 'onnx-community/whisper-small',
}

function getModelCacheDir(): string {
  const dir = path.join(app.getPath('userData'), 'models')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function loadWhisperModel(
  modelName: string = 'base'
): Promise<void> {
  if (transcriber || isLoading) return
  isLoading = true
  loadError = null

  try {
    const { pipeline, env } = await import('@huggingface/transformers')

    // Configure cache directory
    env.cacheDir = getModelCacheDir()
    // Allow local model loading
    env.allowLocalModels = true
    // Use WASM backend for maximum compatibility in Electron
    env.backends.onnx.wasm.proxy = false

    const modelId = MODEL_MAP[modelName] || MODEL_MAP.base

    console.log(`[Bob] Loading Whisper model: ${modelId}`)
    console.log(`[Bob] Cache directory: ${env.cacheDir}`)

    transcriber = await pipeline('automatic-speech-recognition', modelId, {
      dtype: 'fp32',
      device: 'cpu',
    })

    console.log('[Bob] Whisper model loaded successfully')
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Bob] Failed to load Whisper model:', msg)
    loadError = msg
    throw error
  } finally {
    isLoading = false
  }
}

export async function transcribeAudio(
  audioData: Float32Array
): Promise<string> {
  if (!transcriber) {
    // Try to load the model on first use
    const modelName =
      (global as any).__wavyWhisperModel || 'base'
    await loadWhisperModel(modelName)
  }

  if (!transcriber) {
    throw new Error(
      loadError
        ? `Whisper model failed to load: ${loadError}`
        : 'Whisper model not loaded'
    )
  }

  try {
    console.log(
      `[Bob] Transcribing ${audioData.length} samples (${(audioData.length / 16000).toFixed(1)}s)`
    )

    const result = await transcriber(audioData, {
      language: 'en',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    })

    const text = result.text?.trim() || ''
    console.log(`[Bob] Transcription: "${text}"`)
    return text
  } catch (error) {
    console.error('[Bob] Transcription failed:', error)
    throw error
  }
}

export function isModelLoaded(): boolean {
  return transcriber !== null
}

export function isModelLoading(): boolean {
  return isLoading
}

export function getLoadError(): string | null {
  return loadError
}
