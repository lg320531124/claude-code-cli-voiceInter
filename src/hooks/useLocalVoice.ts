// src/hooks/useLocalVoice.ts
//
// Local Voice Hooks - Re-exports from split modules
// This file provides backwards compatibility
//
// Split into:
// - useLocalWhisper.ts: Whisper STT with VAD
// - useLocalKokoro.ts: Kokoro TTS
// - useLocalVoiceCombined.ts: Combined hook

export {
  useLocalWhisper,
  type LocalWhisperOptions,
  type LocalWhisperResult,
} from './useLocalWhisper';

export {
  useLocalKokoro,
  type LocalKokoroOptions,
  type LocalKokoroResult,
} from './useLocalKokoro';

export {
  useLocalVoiceCombined,
  useLocalVoice,
  type LocalVoiceOptions,
  type LocalVoiceResult,
} from './useLocalVoiceCombined';

// Default export for backwards compatibility
export { useLocalVoiceCombined as default } from './useLocalVoiceCombined';