import { BobAPI } from '../main/preload'

declare global {
  interface Window {
    bob: BobAPI
  }
}
