// src/types/webSpeech.d.ts
//
// Web Speech API Type Declarations
// Extend Window interface for Speech Recognition and Synthesis

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export {};
