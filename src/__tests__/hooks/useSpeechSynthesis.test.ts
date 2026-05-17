/**
 * Tests for useSpeechSynthesis hook - basic functionality tests
 */
import { describe, it, expect } from 'vitest';

describe('useSpeechSynthesis module', () => {
  it('should export useSpeechSynthesis function', async () => {
    const module = await import('../../hooks/useSpeechSynthesis');
    expect(module.useSpeechSynthesis).toBeDefined();
    expect(typeof module.useSpeechSynthesis).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useSpeechSynthesis');
    // Check that the module has expected exports
    expect(Object.keys(module)).toContain('useSpeechSynthesis');
  });
});