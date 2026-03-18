import axios from 'axios';

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.CAPTCHA_SECRET_KEY,
        response: token,
      },
    });
    return response.data.success;
  } catch {
    return false;
  }
};
