/**
 * Tests for useBrowserTTS hook
 */
import { describe, it, expect } from 'vitest';

describe('useBrowserTTS module', () => {
  it('should export useBrowserTTS function', async () => {
    const module = await import('../../hooks/useBrowserTTS');
    expect(module.useBrowserTTS).toBeDefined();
    expect(typeof module.useBrowserTTS).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useBrowserTTS');
    expect(Object.keys(module)).toContain('useBrowserTTS');
  });
});