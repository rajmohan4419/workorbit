import { describe, expect, it } from 'vitest';
import { dailyQuiz, QUIZ_QUESTIONS } from './quickQuiz';

describe('daily quick quiz', () => {
  it('picks one question from each category', () => {
    const selected = dailyQuiz(new Date(2026, 10, 9));
    expect(selected).toHaveLength(3);
    expect(selected.map(item => item.category)).toEqual(['General Knowledge', 'Business', 'Technology']);
  });

  it('is stable within a day', () => {
    expect(dailyQuiz(new Date(2026, 10, 9, 8))).toEqual(dailyQuiz(new Date(2026, 10, 9, 21)));
  });

  it('has valid answers and tool links', () => {
    for (const item of QUIZ_QUESTIONS) {
      expect(item.options).toHaveLength(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(4);
      expect(item.tool.href).toMatch(/^\/tools(?:\?|$)/);
    }
  });
});
