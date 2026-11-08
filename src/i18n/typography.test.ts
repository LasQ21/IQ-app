import { describe, expect, it } from 'vitest';
import { dateRange, joinSentences } from './typography';

describe('typography', () => {
  it('joins Japanese sentences without a space', () => {
    expect(joinSentences('ja', '実際の結果です。', '誤差の範囲です。')).toBe('実際の結果です。誤差の範囲です。');
    expect(joinSentences('en', 'Real result.', 'Within noise.')).toBe('Real result. Within noise.');
    expect(joinSentences('uk', 'A.', '', false, 'B.')).toBe('A. B.');
  });

  it('uses 〜 for Japanese date ranges', () => {
    expect(dateRange('ja', '12/1', '12/7')).toBe('12/1〜12/7');
    expect(dateRange('en', '12/1', '12/7')).toBe('12/1 – 12/7');
  });
});
