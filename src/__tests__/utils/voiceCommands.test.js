// src/__tests__/utils/voiceCommands.test.js
// Voice commands unit tests

import { describe, test, expect, beforeEach } from 'vitest';
import {
  voiceCommands,
  matchVoiceCommand,
  extractCommandArgs,
  isPotentialCommand,
  getCommandHints,
  formatCommandHelp
} from '../../utils/voiceCommands';

describe('VoiceCommands', () => {
  describe('matchVoiceCommand', () => {
    test('should match exact Chinese command - 新建对话', () => {
      const result = matchVoiceCommand('新建对话');
      expect(result).not.toBeNull();
      expect(result.id).toBe('new-conversation');
      expect(result.matchType).toBe('exact');
    });

    test('should match exact English command - new conversation', () => {
      const result = matchVoiceCommand('new conversation');
      expect(result).not.toBeNull();
      expect(result.id).toBe('new-conversation');
    });

    test('should match command at beginning of text', () => {
      const result = matchVoiceCommand('新建对话 然后开始');
      expect(result).not.toBeNull();
      expect(result.id).toBe('new-conversation');
    });

    test('should match command at end of text', () => {
      const result = matchVoiceCommand('我想导出对话');
      expect(result).not.toBeNull();
      expect(result.id).toBe('export-chat');
    });

    test('should not match non-command text', () => {
      const result = matchVoiceCommand('你好世界');
      expect(result).toBeNull();
    });

    test('should not match random text', () => {
      const result = matchVoiceCommand('今天天气怎么样');
      expect(result).toBeNull();
    });

    test('should match clear messages command', () => {
      const result = matchVoiceCommand('清空消息');
      expect(result).not.toBeNull();
      expect(result.id).toBe('clear-messages');
    });

    test('should match stop voice command', () => {
      const result = matchVoiceCommand('停止');
      expect(result).not.toBeNull();
      expect(result.id).toBe('stop-voice');
    });

    test('should be case insensitive', () => {
      const result = matchVoiceCommand('NEW CONVERSATION');
      expect(result).not.toBeNull();
      expect(result.id).toBe('new-conversation');
    });

    test('should handle empty input', () => {
      const result = matchVoiceCommand('');
      expect(result).toBeNull();
    });

    test('should handle null input', () => {
      const result = matchVoiceCommand(null);
      expect(result).toBeNull();
    });
  });

  describe('extractCommandArgs', () => {
    test('should extract argument after command', () => {
      const command = voiceCommands.find(c => c.id === 'toggle-model');
      const result = extractCommandArgs('切换模型 sonnet', command);
      expect(result).toBe('sonnet');
    });

    test('should return null for no argument', () => {
      const command = voiceCommands.find(c => c.id === 'new-conversation');
      const result = extractCommandArgs('新建对话', command);
      expect(result).toBeNull();
    });
  });

  describe('isPotentialCommand', () => {
    test('should detect potential Chinese command', () => {
      expect(isPotentialCommand('新建')).toBe(true);
      expect(isPotentialCommand('删除')).toBe(true);
      expect(isPotentialCommand('清空')).toBe(true);
    });

    test('should detect potential English command', () => {
      expect(isPotentialCommand('new')).toBe(true);
      expect(isPotentialCommand('stop')).toBe(true);
      expect(isPotentialCommand('clear')).toBe(true);
    });

    test('should not detect non-command prefix', () => {
      expect(isPotentialCommand('你好')).toBe(false);
      expect(isPotentialCommand('hello')).toBe(false);
    });

    test('should handle empty input', () => {
      expect(isPotentialCommand('')).toBe(false);
    });
  });

  describe('getCommandHints', () => {
    test('should return hints for all commands', () => {
      const hints = getCommandHints();
      expect(hints.length).toBe(voiceCommands.length);
      expect(hints[0]).toHaveProperty('id');
      expect(hints[0]).toHaveProperty('hint');
      expect(hints[0]).toHaveProperty('feedback');
    });
  });

  describe('formatCommandHelp', () => {
    test('should generate formatted help text', () => {
      const help = formatCommandHelp();
      expect(help).toContain('语音命令列表');
      expect(help).toContain('对话管理');
      expect(help).toContain('语音控制');
    });
  });

  describe('voiceCommands array', () => {
    test('should have required properties', () => {
      voiceCommands.forEach(cmd => {
        expect(cmd).toHaveProperty('id');
        expect(cmd).toHaveProperty('patterns');
        expect(cmd).toHaveProperty('action');
        expect(cmd).toHaveProperty('feedback');
        expect(cmd).toHaveProperty('category');
        expect(cmd.patterns.length).toBeGreaterThan(0);
      });
    });

    test('should have unique IDs', () => {
      const ids = voiceCommands.map(c => c.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    test('should have valid categories', () => {
      const validCategories = [
        'conversation', 'session', 'navigation',
        'voice', 'model', 'help', 'stats', 'tts'
      ];
      voiceCommands.forEach(cmd => {
        expect(validCategories).toContain(cmd.category);
      });
    });
  });
});