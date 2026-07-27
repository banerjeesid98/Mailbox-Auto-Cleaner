import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const resolvedConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || firebaseConfig.oAuthClientId,
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || firebaseConfig.recaptchaSiteKey,
};

const app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.modify');

let isSigningIn = false;
let cachedAccessToken: string | null =
  typeof window !== 'undefined' ? sessionStorage.getItem('gmail_access_token') : null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('gmail_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from sign-in result.');
    }
    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gmail_access_token', credential.accessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = sessionStorage.getItem('gmail_access_token');
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('gmail_access_token');
  }
};
