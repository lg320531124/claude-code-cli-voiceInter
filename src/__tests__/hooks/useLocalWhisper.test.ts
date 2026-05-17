/**
 * Tests for useLocalWhisper hook
 */
import { describe, it, expect } from 'vitest';

describe('useLocalWhisper module', () => {
  it('should export useLocalWhisper function', async () => {
    const module = await import('../../hooks/useLocalWhisper');
    expect(module.useLocalWhisper).toBeDefined();
    expect(typeof module.useLocalWhisper).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useLocalWhisper');
    expect(Object.keys(module)).toContain('useLocalWhisper');
  });
});