import { useRef, useCallback, useState } from 'react'

interface UseAudioRecorderReturn {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Float32Array>
  audioLevel: number
}

const TARGET_SAMPLE_RATE = 16000

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const animFrameRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    chunksRef.current = []

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: TARGET_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    streamRef.current = stream

    const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    audioContextRef.current = audioContext

    // Load AudioWorklet
    try {
      await audioContext.audioWorklet.addModule('/worklets/recorder-processor.js')
    } catch {
      // Fallback: AudioWorklet may not load in some Electron configs.
      // Use ScriptProcessorNode instead (deprecated but reliable).
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(data))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      // Set up analyser for level metering
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      startLevelMetering()
      setIsRecording(true)
      return
    }

    const source = audioContext.createMediaStreamSource(stream)
    const workletNode = new AudioWorkletNode(audioContext, 'recorder-processor')
    workletNodeRef.current = workletNode

    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        chunksRef.current.push(event.data.data)
      }
    }

    source.connect(workletNode)
    workletNode.connect(audioContext.destination)

    // Set up analyser for level metering
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    startLevelMetering()
    setIsRecording(true)
  }, [])

  const startLevelMetering = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setAudioLevel(avg / 255)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    tick()
  }, [])

  const stopRecording = useCallback(async (): Promise<Float32Array> => {
    setIsRecording(false)
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)

    // Stop the worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ command: 'stop' })
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null

    // Merge all chunks into a single Float32Array
    const totalLength = chunksRef.current.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    )
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunksRef.current) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    chunksRef.current = []
    return merged
  }, [])

  return { isRecording, startRecording, stopRecording, audioLevel }
}
