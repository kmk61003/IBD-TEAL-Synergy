'use strict';

const { describe, test, expect } = require('@jest/globals');

// ─── formatPrice helper ───────────────────────────────────────────────────────
function formatPrice(minor) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

describe('formatPrice', () => {
  test('converts pence to formatted GBP', () => {
    expect(formatPrice(9999)).toBe('£99.99');
    expect(formatPrice(100)).toBe('£1.00');
    expect(formatPrice(129900)).toBe('£1,299.00');
  });

  test('handles zero', () => {
    expect(formatPrice(0)).toBe('£0.00');
  });
});

// ─── safeParseJson helper ─────────────────────────────────────────────────────
function safeParseJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

describe('safeParseJson', () => {
  test('parses valid JSON', () => {
    expect(safeParseJson('["Rings","Diamonds"]', [])).toEqual(['Rings', 'Diamonds']);
  });

  test('returns fallback for invalid JSON', () => {
    expect(safeParseJson('not json', [])).toEqual([]);
  });

  test('returns fallback for empty string', () => {
    expect(safeParseJson('', null)).toBeNull();
  });
});

// ─── Slug validation ──────────────────────────────────────────────────────────
function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug);
}

describe('slug validation', () => {
  test('accepts valid slugs', () => {
    expect(isValidSlug('eternal-teal-ring')).toBe(true);
    expect(isValidSlug('diamond-123')).toBe(true);
  });

  test('rejects invalid slugs', () => {
    expect(isValidSlug('My Ring!')).toBe(false);
    expect(isValidSlug('ring_with_underscores')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

// ─── Cart subtotal calculation ────────────────────────────────────────────────
function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

describe('calculateSubtotal', () => {
  test('sums line totals correctly', () => {
    const items = [
      { price: 9999, qty: 2 },
      { price: 4999, qty: 1 },
    ];
    expect(calculateSubtotal(items)).toBe(9999 * 2 + 4999);
  });

  test('returns 0 for empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});
