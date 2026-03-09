import { WebContents } from 'electron'

export interface StatusMessage {
  step: string
  message: string
  icon: string
}

const STATUS_MESSAGES: Record<string, StatusMessage> = {
  'transcribing':     { step: 'transcribing',     message: 'Turning speech into text...',                icon: '🎙️' },
  'rewriting-query':  { step: 'rewriting-query',  message: 'Figuring out what to ask the internet...',   icon: '🔍' },
  'searching':        { step: 'searching',        message: 'Asking the internet very nicely...',         icon: '🌐' },
  'scanning-results': { step: 'scanning-results', message: 'Scanning results for the good stuff...',     icon: '📋' },
  'reading-page':     { step: 'reading-page',     message: 'This one looks promising, reading it...',    icon: '📄' },
  'reading-more':     { step: 'reading-more',     message: 'Reading one more to be thorough...',         icon: '📄' },
  'synthesizing':     { step: 'synthesizing',     message: 'Got what I need, connecting the dots...',    icon: '🧠' },
  'answering':        { step: 'answering',        message: 'Putting it into words...',                   icon: '✍️' },
  'searching-again':  { step: 'searching-again',  message: 'Hmm, let me try a different angle...',       icon: '🔄' },
  'thinking':         { step: 'thinking',         message: 'Thinking about this one...',                 icon: '💭' },
}

export function emitStatus(sender: WebContents, stepOrMessage: string, customMessage?: string): void {
  if (sender.isDestroyed()) return

  const predefined = STATUS_MESSAGES[stepOrMessage]

  if (predefined) {
    const status: StatusMessage = customMessage
      ? { ...predefined, message: customMessage }
      : predefined
    sender.send('bob:status', status)
  } else {
    sender.send('bob:status', {
      step: stepOrMessage,
      message: customMessage ?? stepOrMessage,
      icon: '⚡',
    } satisfies StatusMessage)
  }
}

export function createStatusEmitter(sender: WebContents): (step: string, customMessage?: string) => void {
  return (step: string, customMessage?: string) => emitStatus(sender, step, customMessage)
}
