import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' };

/** Sign-in / sign-up screen, built from the dashboard's existing card, input and button styles. */
const Login: React.FC = () => {
  const { status, error, signIn, createAccount, completeRegistration, signOut } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const finishing = status === 'unregistered';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (finishing) await completeRegistration(name.trim());
      else if (mode === 'signUp') await createAccount(name.trim(), email, password);
      else await signIn(email, password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form className="card" onSubmit={submit} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="SERVE Logo" style={{ width: '36px', height: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '1px', lineHeight: '1.1' }}>SERVE</span>
            <span style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>STAFF DASHBOARD</span>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
          {finishing ? 'Complete Staff Registration' : mode === 'signUp' ? 'Create Staff Account' : 'Sign In'}
        </h2>

        <div className="flex flex-col gap-4">
          {(finishing || mode === 'signUp') && (
            <div>
              <label style={labelStyle} htmlFor="name">Full Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
            </div>
          )}
          {!finishing && (
            <>
              <div>
                <label style={labelStyle} htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={inputStyle}
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--color-accent)', fontSize: '14px', fontWeight: 600, marginTop: '16px' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} disabled={busy}>
          {busy ? 'Please wait…' : finishing ? 'Complete Registration' : mode === 'signUp' ? 'Create Account' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {finishing ? (
            <button type="button" onClick={() => void signOut()} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600 }}>
              Use a different account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600 }}
            >
              {mode === 'signIn' ? 'New staff member? Create an account' : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Login;
