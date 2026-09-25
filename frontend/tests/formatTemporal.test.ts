import { describe, expect, it } from 'vitest';
import { formatStoredDateTime } from '../src/util/formatTemporal';

/**
 * V7 Day 3 §10: presentation formatting is App-owned; temporal meaning is not.
 * These pin the four input kinds to "never add a time or timezone the stored
 * value does not carry".
 */
describe('formatStoredDateTime', () => {
  it('shows an offset datetime in Canberra time, with its time', () => {
    const shown = formatStoredDateTime('2099-03-02T10:00:00+11:00');
    expect(shown).toMatch(/2 Mar/);
    expect(shown).toMatch(/10:00/);
  });

  it('converts a UTC instant to the Canberra wall-clock time, not the browser zone', () => {
    // 23:30 UTC on 1 Oct is 9:30 am on 2 Oct in Canberra (AEST, +10:00).
    const shown = formatStoredDateTime('2026-10-01T23:30:00Z');
    expect(shown).toMatch(/2 Oct/);
    expect(shown).toMatch(/9:30/);
  });

  it('shows a date-only value as a date with no invented midnight/10 am time', () => {
    const shown = formatStoredDateTime('2026-10-01');
    expect(shown).toMatch(/1 Oct 2026/);
    expect(shown).not.toMatch(/:|am|pm/i);
  });

  it('keeps the same calendar day for a date-only value (no UTC shift)', () => {
    // Date.parse('2026-01-01') is UTC midnight — in a UTC-negative zone that
    // would be 31 Dec. The date-only path never goes through Date.parse.
    expect(formatStoredDateTime('2026-01-01')).toMatch(/1 Jan 2026/);
  });

  it('shows a datetime with no offset exactly as stored — no timezone is invented', () => {
    expect(formatStoredDateTime('2026-10-01T18:00')).toBe('2026-10-01T18:00');
    expect(formatStoredDateTime('2026-10-01T18:00:00')).toBe('2026-10-01T18:00:00');
  });

  it('shows an impossible date or unrecognised text exactly as stored', () => {
    expect(formatStoredDateTime('2026-02-30')).toBe('2026-02-30');
    expect(formatStoredDateTime('Semester 2, week 3')).toBe('Semester 2, week 3');
    expect(formatStoredDateTime('')).toBe('');
  });
});
