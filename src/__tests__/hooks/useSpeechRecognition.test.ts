/**
 * Tests for useSpeechRecognition hook - basic functionality tests
 */
import { describe, it, expect } from 'vitest';

describe('useSpeechRecognition module', () => {
  it('should export useSpeechRecognition function', async () => {
    const module = await import('../../hooks/useSpeechRecognition');
    expect(module.useSpeechRecognition).toBeDefined();
    expect(typeof module.useSpeechRecognition).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useSpeechRecognition');
    // Check that the module has expected exports
    expect(Object.keys(module)).toContain('useSpeechRecognition');
  });
});