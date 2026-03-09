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
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const animFrameRef = useRef<number>(0)
  // Monotonically increasing session ID — used to detect stale async resolutions
  const sessionRef = useRef(0)

  // Tears down all recording resources unconditionally
  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)

    if (workletNodeRef.current) {
      try { workletNodeRef.current.port.postMessage({ command: 'stop' }) } catch {}
      try { workletNodeRef.current.disconnect() } catch {}
      workletNodeRef.current = null
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect() } catch {}
      scriptProcessorRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      // Don't await — fire and forget to avoid blocking
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    analyserRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    // Bump session ID so any in-flight previous start knows it's stale
    const thisSession = ++sessionRef.current

    // Tear down any leaked state from a previous abandoned start
    cleanup()
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

    // If stopRecording was called while getUserMedia was resolving, abort
    if (thisSession !== sessionRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    streamRef.current = stream

    const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    audioContextRef.current = audioContext

    const source = audioContext.createMediaStreamSource(stream)

    // Set up analyser for level metering
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    // Try AudioWorklet first, fall back to ScriptProcessorNode
    let workletLoaded = false
    try {
      await audioContext.audioWorklet.addModule('/worklets/recorder-processor.js')
      workletLoaded = true
    } catch {
      // AudioWorklet not available — will use ScriptProcessor
    }

    // Check for staleness again after the second async point
    if (thisSession !== sessionRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      audioContext.close().catch(() => {})
      return
    }

    if (workletLoaded) {
      const workletNode = new AudioWorkletNode(audioContext, 'recorder-processor')
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          chunksRef.current.push(event.data.data)
        }
      }

      source.connect(workletNode)
      workletNode.connect(audioContext.destination)
    } else {
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      scriptProcessorRef.current = processor

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(data))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    }

    startLevelMetering()
    setIsRecording(true)
  }, [cleanup])

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
    // Bump session so any in-flight startRecording aborts on resolve
    sessionRef.current++
    setIsRecording(false)

    cleanup()

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
  }, [cleanup])

  return { isRecording, startRecording, stopRecording, audioLevel }
}
