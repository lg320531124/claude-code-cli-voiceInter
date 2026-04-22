// src/types/voice.ts
// Voice-related types for speech recognition and synthesis

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  volumeLevel: number;
}

export interface VoiceCommand {
  id: string;
  patterns: string[];
  action: string;
  feedback: string;
  category: string;
}

export type VoiceLevel = 'normal' | 'warning' | 'critical';

export interface VoiceErrorInfo {
  title: string;
  description: string;
  suggestions: string[];
}

export interface STTOptions {
  language?: string;
  onResult?: (text: string) => void;
  onInterimResult?: (text: string) => void;
  onError?: (errorType: string, errorInfo: VoiceErrorInfo) => void;
  autoStop?: boolean;
  silenceThreshold?: number;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  language?: string;
  onModeChange?: (mode: 'kokoro' | 'browser') => void;
}

export interface BidirectionalVoiceOptions extends STTOptions, TTSOptions {
  autoContinue?: boolean;
  interruptionEnabled?: boolean;
  onUserSpeech?: (text: string) => void;
  onAssistantSpeech?: (text: string) => void;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
}