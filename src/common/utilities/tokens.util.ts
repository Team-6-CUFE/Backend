import * as crypto from 'crypto';

export const generateVerificationToken = (): string => crypto.randomBytes(32).toString('hex');

export const generateSixDigitCode = (): string => crypto.randomInt(100000, 999999).toString();

export const getExpiryDate = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);
