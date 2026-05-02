import axios from 'axios';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log('🔥 Firebase env check:', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!rawKey,
    keyLength: rawKey?.length,
  });

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error(
      'Missing Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  const privateKey = rawKey.replace(/\\n/g, '\n').trim();

  console.log('🔑 Firebase key processed:', {
    length: privateKey.length,
    startsWith: privateKey.slice(0, 30),
    endsWith: privateKey.slice(-30),
  });

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
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
