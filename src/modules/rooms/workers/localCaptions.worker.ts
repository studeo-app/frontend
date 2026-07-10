import { env, pipeline } from '@huggingface/transformers'

type WorkerInboundMessage =
  | { type: 'init'; models: string[]; language: string }
  | { type: 'transcribe'; audio: Float32Array }
  | { type: 'dispose' }

type WorkerOutboundMessage =
  | { type: 'status'; status: 'loading' | 'ready' | 'transcribing'; message?: string; model?: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }

type AutomaticSpeechRecognitionPipeline = (
  audio: Float32Array,
  options: { language: string; task: 'transcribe' },
) => Promise<{ text?: string } | Array<{ text?: string }>>

type LocalCaptionDevice = 'webgpu' | 'wasm'
type LocalCaptionDtype = 'q4'
type MutableOnnxBackend = {
  wasm?: {
    numThreads?: number
  }
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let selectedLanguage = 'spanish'
let selectedModel = ''
let isInitializing = false

env.allowLocalModels = false
const onnxBackend = env.backends.onnx as MutableOnnxBackend
onnxBackend.wasm = {
  ...(onnxBackend.wasm ?? {}),
  numThreads: 1,
}

function post(message: WorkerOutboundMessage) {
  self.postMessage(message)
}

function describeModel(model: string): string {
  return model.split('/').pop()?.replace(/^whisper-/, '') ?? model
}

function getCandidateDevices(): LocalCaptionDevice[] {
  return 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm']
}

function getPipelineOptions(device: LocalCaptionDevice): { device: LocalCaptionDevice; dtype: LocalCaptionDtype } {
  return { device, dtype: 'q4' }
}

async function initialize(models: string[], language: string) {
  if (transcriber || isInitializing) return

  try {
    isInitializing = true
    selectedLanguage = language

    const devices = getCandidateDevices()
    const errors: string[] = []

    for (const model of models) {
      for (const device of devices) {
        try {
          selectedModel = model
          post({
            type: 'status',
            status: 'loading',
            model,
            message: `Cargando modelo local ${describeModel(model)}...`,
          })
          transcriber = await pipeline(
            'automatic-speech-recognition',
            model,
            getPipelineOptions(device),
          ) as AutomaticSpeechRecognitionPipeline
          post({ type: 'status', status: 'ready', model, message: `Modelo ${describeModel(model)} listo` })
          return
        } catch (error) {
          const message = error instanceof Error ? error.message : 'fallo desconocido'
          errors.push(`${model} (${device}): ${message}`)
          transcriber = null
        }
      }
    }

    throw new Error(errors.join(' | '))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar ningun modelo local.'
    post({ type: 'error', message })
  } finally {
    isInitializing = false
  }
}

async function transcribe(audio: Float32Array) {
  if (!transcriber) {
    post({ type: 'status', status: 'loading', model: selectedModel })
    return
  }

  try {
    post({ type: 'status', status: 'transcribing', model: selectedModel })
    const output = await transcriber(audio, {
      language: selectedLanguage,
      task: 'transcribe',
    })
    const text = Array.isArray(output)
      ? output.map((item) => ('text' in item ? String(item.text) : '')).join(' ')
      : 'text' in output
        ? String(output.text)
        : ''

    post({ type: 'result', text: text.trim() })
    post({ type: 'status', status: 'ready', model: selectedModel })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo transcribir el audio local.'
    post({ type: 'error', message })
  }
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data

  if (message.type === 'init') {
    void initialize(message.models, message.language)
    return
  }

  if (message.type === 'transcribe') {
    void transcribe(message.audio)
    return
  }

  if (message.type === 'dispose') {
    transcriber = null
  }
}

export {}
