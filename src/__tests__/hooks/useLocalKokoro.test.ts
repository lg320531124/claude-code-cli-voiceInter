/**
 * Tests for useLocalKokoro hook
 */
import { describe, it, expect } from 'vitest';

describe('useLocalKokoro module', () => {
  it('should export useLocalKokoro function', async () => {
    const module = await import('../../hooks/useLocalKokoro');
    expect(module.useLocalKokoro).toBeDefined();
    expect(typeof module.useLocalKokoro).toBe('function');
  });

  it('should handle module import', async () => {
    const module = await import('../../hooks/useLocalKokoro');
    expect(Object.keys(module)).toContain('useLocalKokoro');
  });
});