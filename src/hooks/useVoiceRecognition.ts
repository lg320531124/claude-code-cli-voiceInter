// src/hooks/useVoiceRecognition.ts
//
// Voice Recognition Hook - Re-exports from split modules
// This file provides backwards compatibility
//
// Split into:
// - useSpeechRecognition.ts: Core STT functionality
// - useSpeechSynthesis.ts: Core TTS functionality
// - useVoiceInteraction.ts: Combined orchestration

export {
  useSpeechRecognition,
  type SpeechRecognitionOptions,
  type SpeechRecognitionResult,
  type VoiceErrorType,
} from './useSpeechRecognition';

export {
  useSpeechSynthesis,
  type SpeechSynthesisOptions,
  type SpeechSynthesisResult,
} from './useSpeechSynthesis';

export {
  useVoiceInteraction,
  type VoiceInteractionOptions,
  type VoiceInteractionResult,
} from './useVoiceInteraction';

// Default export for backwards compatibility
export { useVoiceInteraction as default } from './useVoiceInteraction';