import axios from 'axios';
import { verifyCaptcha } from './captcha.util';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
