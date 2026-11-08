import { describe, expect, it } from 'vitest';
import { isSafeToReload } from './playing';

describe('isSafeToReload (SW update)', () => {
  it('reloads on the landing screen and on Today', () => {
    expect(isSafeToReload('', undefined, false)).toBe(true);
    expect(isSafeToReload('#/', 'quiz', false)).toBe(true);
    expect(isSafeToReload('#/?x=1', 'landing', false)).toBe(true);
    expect(isSafeToReload('#/today', 'home', false)).toBe(true);
  });
  it('never reloads during quiz, play or re-test, or while a game runs', () => {
    expect(isSafeToReload('#/quiz', 'quiz', false)).toBe(false);
    expect(isSafeToReload('#/play/flash41?from=today', 'home', false)).toBe(false);
    expect(isSafeToReload('#/retest', 'home', false)).toBe(false);
    expect(isSafeToReload('#/today', 'home', true)).toBe(false);
    expect(isSafeToReload('#/', 'landing', true)).toBe(false);
  });
  it('waits on other screens (teaser, paywall, index animation, report)', () => {
    expect(isSafeToReload('#/teaser', 'teaser', false)).toBe(false);
    expect(isSafeToReload('#/index?from=onboarding', 'home', false)).toBe(false);
    expect(isSafeToReload('#/report', 'home', false)).toBe(false);
    expect(isSafeToReload('#/today', 'onboarding', false)).toBe(false);
  });
});
