import { generateVerificationToken, generateSixDigitCode, getExpiryDate } from './tokens.util';

describe('generateVerificationToken', () => {
  it('should return a 64-character hex string', () => {
    const token = generateVerificationToken();

    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return a different token on each call', () => {
    const t1 = generateVerificationToken();
    const t2 = generateVerificationToken();

    expect(t1).not.toBe(t2);
  });
});

describe('generateSixDigitCode', () => {
  it('should return a 6-character string of digits', () => {
    const code = generateSixDigitCode();

    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should return a value between 100000 and 999999', () => {
    const code = parseInt(generateSixDigitCode(), 10);

    expect(code).toBeGreaterThanOrEqual(100000);
    expect(code).toBeLessThanOrEqual(999999);
  });

  it('should return different codes across multiple calls', () => {
    const codes = new Set(Array.from({ length: 5 }, () => generateSixDigitCode()));

    // With 5 random 6-digit codes, the probability of all being identical is negligible
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('getExpiryDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return a date in the future by the given minutes', () => {
    const now = new Date('2025-01-01T12:00:00.000Z');
    jest.setSystemTime(now);

    const result = getExpiryDate(30);

    expect(result).toEqual(new Date('2025-01-01T12:30:00.000Z'));
  });

  it('should handle 0 minutes (returns now)', () => {
    const now = new Date('2025-06-01T08:00:00.000Z');
    jest.setSystemTime(now);

    const result = getExpiryDate(0);

    expect(result).toEqual(now);
  });

  it('should handle fractional minutes', () => {
    const now = new Date('2025-01-01T12:00:00.000Z');
    jest.setSystemTime(now);

    const result = getExpiryDate(1.5);

    expect(result).toEqual(new Date('2025-01-01T12:01:30.000Z'));
  });
});
