/**
 * ============================================================
 * Print To Frame ERP — Firebase Service
 * ============================================================
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Workspace Scopes
const provider = new GoogleAuthProvider();

let isSigningIn = false;
let cachedAccessToken = null;

export const initAuth = (onAuthSuccess, onAuthFailure) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async () => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};
testConnection();

export const emailLogin = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const emailRegister = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

