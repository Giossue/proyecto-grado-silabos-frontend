import { describe, expect, it } from 'vitest';
import { calculateAcademicPeriodWeeks } from '@/lib/academicPeriodWeeks';

describe('calculateAcademicPeriodWeeks', () => {
  it.each([
    ['2026-08-17', '2026-12-18', 18],
    ['2026-08-17', '2026-12-04', 16],
    ['2026-08-21', '2026-08-24', 2],
    ['2026-08-19', '2026-08-21', 1],
  ])('counts calendar weeks from %s through %s', (startsOn, endsOn, expected) => {
    expect(calculateAcademicPeriodWeeks(startsOn, endsOn)).toBe(expected);
  });

  it('returns null for incomplete or inverted ranges', () => {
    expect(calculateAcademicPeriodWeeks('', '2026-08-24')).toBeNull();
    expect(calculateAcademicPeriodWeeks('2026-08-24', '2026-08-21')).toBeNull();
  });
});
