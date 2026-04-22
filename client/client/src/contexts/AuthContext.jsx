import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const USERS = {
  manager: { username: 'manager', password: 'admin', role: 'manager' },
  'staff1': { username: 'staff1', password: 'pass', role: 'staff', id: 'staff1' },
  'staff2': { username: 'staff2', password: 'pass', role: 'staff', id: 'staff2' },
  'staff3': { username: 'staff3', password: 'pass', role: 'staff', id: 'staff3' },
  guest: { username: 'guest', password: '', role: 'guest' }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = localStorage.getItem('mesh-session');
        if (s && !cancelled) {
          setSession(JSON.parse(s));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username, password) => {
    const user = Object.values(USERS).find(u => u.username === username && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    const s = { username, role: user.role, id: user.id || null, expires: Date.now() + 24*60*60*1000 };
    localStorage.setItem('mesh-session', JSON.stringify(s));
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('mesh-session');
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    session,
    isLoading,
    login,
    logout,
    isAuthed: !!session
  }), [session, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
