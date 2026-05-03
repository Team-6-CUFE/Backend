import axios from 'axios';

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { verifyCaptcha, getFirebaseApp, verifyAppCheckToken } from './captcha.util';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/app-check', () => ({
  getAppCheck: jest.fn(),
}));

describe('verifyCaptcha', () => {
  const token = 'test-captcha-token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when Google responds with success: true', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await verifyCaptcha(token);

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.CAPTCHA_SECRET_KEY, response: token } }
    );
  });

  it('should return false when Google responds with success: false', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: false } });

    const result = await verifyCaptcha(token);

    expect(result).toBe(false);
  });

  it('should return false when axios throws an error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    const result = await verifyCaptcha(token);

    expect(result).toBe(false);
  });

  it('should return false when request times out', async () => {
    mockedAxios.post.mockRejectedValue(new Error('timeout of 0ms exceeded'));

    const result = await verifyCaptcha(token);

    expect(result).toBe(false);
  });
});

describe('getFirebaseApp', () => {
  const mockApp = { name: 'mock-firebase-app' };

  beforeEach(() => {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  it('should return existing app when getApps().length > 0', () => {
    (getApps as jest.Mock).mockReturnValue([mockApp]);

    const result = getFirebaseApp();

    expect(result).toBe(mockApp);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('should throw Error when env vars are missing', () => {
    (getApps as jest.Mock).mockReturnValue([]);
    delete process.env.FIREBASE_PROJECT_ID;

    expect(() => getFirebaseApp()).toThrow(
      'Missing Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  });

  it('should call initializeApp with cert when env vars are present', () => {
    (getApps as jest.Mock).mockReturnValue([]);
    (cert as jest.Mock).mockReturnValue({ credential: 'mock-cert' });
    (initializeApp as jest.Mock).mockReturnValue(mockApp);

    getFirebaseApp();

    expect(cert).toHaveBeenCalled();
    expect(initializeApp).toHaveBeenCalled();
  });
});

describe('verifyAppCheckToken', () => {
  const mockApp = { name: 'mock-firebase-app' };

  beforeEach(() => {
    process.env.FIREBASE_DEBUG_TOKEN = 'debug-token';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    jest.clearAllMocks();
    (getApps as jest.Mock).mockReturnValue([mockApp]);
  });

  afterEach(() => {
    delete process.env.FIREBASE_DEBUG_TOKEN;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  it('should return true when token matches FIREBASE_DEBUG_TOKEN', async () => {
    const result = await verifyAppCheckToken('debug-token');

    expect(result).toBe(true);
    expect(getAppCheck).not.toHaveBeenCalled();
  });

  it('should return true when getAppCheck().verifyToken resolves successfully', async () => {
    (getAppCheck as jest.Mock).mockReturnValue({
      verifyToken: jest.fn().mockResolvedValue({}),
    });

    const result = await verifyAppCheckToken('valid-token');

    expect(result).toBe(true);
  });

  it('should return false when getAppCheck().verifyToken throws', async () => {
    (getAppCheck as jest.Mock).mockReturnValue({
      verifyToken: jest.fn().mockRejectedValue(new Error('invalid token')),
    });

    const result = await verifyAppCheckToken('bad-token');

    expect(result).toBe(false);
  });
});
