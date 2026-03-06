/**
 * AudioWorklet processor that captures raw PCM Float32 samples
 * from the microphone and sends them to the main thread.
 */
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._isRecording = true

    this.port.onmessage = (event) => {
      if (event.data.command === 'stop') {
        this._isRecording = false
      }
    }
  }

  process(inputs) {
    if (!this._isRecording) return false

    const input = inputs[0]
    if (input && input.length > 0) {
      // Send mono channel data (first channel)
      const channelData = input[0]
      // Copy the data since the buffer is reused
      this.port.postMessage({
        type: 'audio',
        data: new Float32Array(channelData),
      })
    }

    return this._isRecording
  }
}

registerProcessor('recorder-processor', RecorderProcessor)
