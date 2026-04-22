// src/types/config.ts
// Configuration-related types

export interface AppConfig {
  projectPath: string;
  whisperEndpoint: string;
  kokoroEndpoint: string;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface VoiceConfig {
  defaultVoice: string;
  defaultSpeed: number;
  defaultLanguage: string;
  preferKokoro: boolean;
}

export interface ShortcutConfig {
  key: string;
  action: string;
  description: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  claudePath: string;
}