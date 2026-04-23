/**
 * useEnhancedVoice - Enhanced Voice Hooks (re-export module)
 *
 * This module provides three hooks for voice interaction:
 * - useStreamingWhisper: Streaming STT with VAD auto-stop
 * - useInterruptibleKokoro: Interruptible TTS
 * - useBidirectionalVoice: Bidirectional conversation mode
 *
 * Each hook is now in its own file for better maintainability.
 */

export { useStreamingWhisper } from './useStreamingWhisper';
export type { StreamingWhisperOptions, StreamingWhisperResult } from './useStreamingWhisper';

export { useInterruptibleKokoro } from './useInterruptibleKokoro';
export type { InterruptibleKokoroOptions, InterruptibleKokoroResult } from './useInterruptibleKokoro';

export { useBidirectionalVoice } from './useBidirectionalVoice';
export type { BidirectionalVoiceOptions, BidirectionalVoiceResult } from './useBidirectionalVoice';