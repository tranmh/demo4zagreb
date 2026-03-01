import { describe, it, expect } from '@jest/globals';
import { greet } from '../../src/js/greeting.js';

describe('greet', () => {
  it('returns a greeting with the given name', () => {
    expect(greet('World')).toBe('Hello, World!');
  });
});
