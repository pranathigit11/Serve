import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { api, ApiError, errorMessage } from '../lib/api';
import { firebaseAuth } from '../lib/firebase';

interface Account {
  id: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
}

export type AuthStatus = 'loading' | 'signedOut' | 'unregistered' | 'ready';

interface AuthContextType {
  status: AuthStatus;
  firebaseUser: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (name: string, email: string, password: string) => Promise<void>;
  completeRegistration: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('email-already-in-use')) return 'An account with this email already exists. Sign in instead.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('network-request-failed')) return 'Cannot reach the sign-in service. Check your connection.';
  return errorMessage(error);
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only the most recent resolution may update state (sign-up triggers two).
  const resolution = useRef(0);

  /** Maps the signed-in Firebase user to a SERVE staff account (role is decided by the backend). */
  const resolveAccount = useCallback(async (user: User | null) => {
    const attempt = ++resolution.current;
    setFirebaseUser(user);
    if (!user) {
      setStatus('signedOut');
      return;
    }
    try {
      const { account } = await api.get<{ account: Account }>('/api/me');
      if (attempt !== resolution.current) return;
      if (account.role !== 'STAFF') {
        setError('This account does not have staff access.');
        await firebaseSignOut(firebaseAuth());
        return;
      }
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (attempt !== resolution.current) return;
      if (err instanceof ApiError && err.code === 'ACCOUNT_NOT_REGISTERED') {
        setStatus('unregistered');
        return;
      }
      setError(errorMessage(err));
      await firebaseSignOut(firebaseAuth());
    }
  }, []);

  useEffect(() => onAuthStateChanged(firebaseAuth(), (user) => void resolveAccount(user)), [resolveAccount]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  const completeRegistration = async (name: string) => {
    setError(null);
    try {
      await api.post('/api/staff/register', { name });
      await resolveAccount(firebaseAuth().currentUser);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const createAccount = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      await completeRegistration(name);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ status, firebaseUser, error, signIn, createAccount, completeRegistration, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
