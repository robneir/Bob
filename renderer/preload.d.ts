import { WavyAPI } from '../main/preload'

declare global {
  interface Window {
    bob: WavyAPI
  }
}
