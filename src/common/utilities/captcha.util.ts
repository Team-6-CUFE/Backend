import axios from 'axios';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0];

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

  if (!b64) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64');
  }

  const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

  console.log('🔥 Firebase service account check:', {
    hasProjectId: !!serviceAccount.project_id,
    hasClientEmail: !!serviceAccount.client_email,
    hasPrivateKey: !!serviceAccount.private_key,
  });

  return initializeApp({
    credential: cert(serviceAccount),
  });
}
export const verifyAppCheckToken = async (token: string): Promise<boolean> => {
  if (token === process.env.FIREBASE_DEBUG_TOKEN) {
    return true;
  }
  try {
    const firebaseAppCheck = getFirebaseApp();
    await getAppCheck(firebaseAppCheck).verifyToken(token);
    return true;
  } catch {
    return false;
  }
};

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  if (token === 'mobile') {
    return false;
  }
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
