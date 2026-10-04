import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { api, ApiError, errorMessage } from '../lib/api';
import { firebaseAuth } from '../lib/firebase';

export type AuthStatus = 'loading' | 'signedOut' | 'ready';

interface AuthContextType {
  status: AuthStatus;
  firebaseUser: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('network-request-failed')) return 'Cannot reach the sign-in service. Check your connection.';
  return errorMessage(error);
}

/**
 * Admin access is granted only by the backend (PostgreSQL role ADMIN, provisioned
 * with `npm run admin:create`). There is no self-registration for admins.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolution = useRef(0);

  const resolveAccount = useCallback(async (user: User | null) => {
    const attempt = ++resolution.current;
    setFirebaseUser(user);
    if (!user) {
      setStatus('signedOut');
      return;
    }
    try {
      const { account } = await api.get<{ account: { role: string } }>('/api/me');
      if (attempt !== resolution.current) return;
      if (account.role !== 'ADMIN') {
        setError('This account does not have admin access.');
        await firebaseSignOut(firebaseAuth());
        return;
      }
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (attempt !== resolution.current) return;
      setError(
        err instanceof ApiError && err.code === 'ACCOUNT_NOT_REGISTERED'
          ? 'This account does not have admin access.'
          : errorMessage(err),
      );
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

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ status, firebaseUser, error, signIn, signOut }}>{children}</AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
