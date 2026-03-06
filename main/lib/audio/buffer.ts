/**
 * Decode a WebM/Opus audio blob into a Float32Array at 16kHz mono
 * suitable for Whisper transcription.
 *
 * Since we're in Node.js (Electron main process), we use a simple
 * approach: decode the raw PCM data sent from the renderer.
 */

/**
 * Convert raw PCM Float32 samples from the renderer into the format
 * Whisper expects: Float32Array at 16kHz mono.
 *
 * If the input is already at 16kHz mono (as requested from getUserMedia),
 * this is essentially a pass-through.
 */
export function ensureFloat32At16kHz(
  samples: Float32Array,
  inputSampleRate: number = 16000
): Float32Array {
  if (inputSampleRate === 16000) {
    return samples
  }

  // Resample to 16kHz using linear interpolation
  const ratio = inputSampleRate / 16000
  const outputLength = Math.floor(samples.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1)
    const frac = srcIndex - srcIndexFloor

    output[i] =
      samples[srcIndexFloor] * (1 - frac) + samples[srcIndexCeil] * frac
  }

  return output
}
