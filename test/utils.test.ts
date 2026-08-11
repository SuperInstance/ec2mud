/**
 * Tests for cn() utility — Tailwind class merging
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn', () => {
  it('merges simple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('resolves Tailwind conflicts (later wins)', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('px-4', undefined, null, 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes (falsy)', () => {
    expect(cn('base', false && 'hidden', undefined)).toBe('base');
  });

  it('handles conditional classes (truthy)', () => {
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('handles arrays', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });

  it('handles objects (clsx style)', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('deduplicates after merge', () => {
    const result = cn('px-4', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles complex mixed input', () => {
    const result = cn(
      'base-class',
      ['array-class'],
      { 'object-true': true, 'object-false': false },
      'conflict-class',
    );
    expect(result).toContain('base-class');
    expect(result).toContain('array-class');
    expect(result).toContain('object-true');
    expect(result).not.toContain('object-false');
  });

  it('preserves non-conflicting order', () => {
    const result = cn('first', 'second', 'third');
    expect(result).toBe('first second third');
  });

  it('handles whitespace-only strings', () => {
    expect(cn('   ', 'px-4')).toBe('px-4');
  });
});
