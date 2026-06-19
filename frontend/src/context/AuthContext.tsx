import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const TOKEN_KEY = 'wl_token';

function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json);
    const groups: string[] = claims.groups ?? [];
    return {
      id: claims.sub,
      username: claims.upn ?? claims.preferred_username ?? '',
      email: claims.email ?? '',
      role: groups[0] ?? 'USER',
    };
  } catch {
    return null;
  }
}

function loadStoredUser(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const user = decodeJwt(token);
  if (!user) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  function login(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(decodeJwt(token));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
