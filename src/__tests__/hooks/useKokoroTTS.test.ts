/**
 * Tests for useKokoroTTS hook
 */
import { describe, it, expect } from 'vitest';

describe('useKokoroTTS module', () => {
  it('should export useKokoroTTS function', async () => {
    const module = await import('../../hooks/useKokoroTTS');
    expect(module.useKokoroTTS).toBeDefined();
    expect(typeof module.useKokoroTTS).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useKokoroTTS');
    expect(Object.keys(module)).toContain('useKokoroTTS');
  });
});