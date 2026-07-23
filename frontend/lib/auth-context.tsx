"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import type { LoginResult, User } from "./api";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeMfaLogin: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSessionToken: (token: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (token: string) => {
    const profile = await api.me(token);
    setUser(profile);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { accessToken: token } = await api.refresh();
        setAccessToken(token);
        await loadUser(token);
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await api.login(email, password);
      if (!result.mfaRequired) {
        setAccessToken(result.accessToken);
        await loadUser(result.accessToken);
      }
      return result;
    },
    [loadUser]
  );

  const completeMfaLogin = useCallback(
    async (mfaToken: string, code: string) => {
      const { accessToken: token } = await api.verifyMfaLogin(mfaToken, code);
      setAccessToken(token);
      await loadUser(token);
    },
    [loadUser]
  );

  const logout = useCallback(async () => {
    await api.logout();
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (accessToken) {
      await loadUser(accessToken);
    }
  }, [accessToken, loadUser]);

  const setSessionToken = useCallback(
    async (token: string) => {
      setAccessToken(token);
      await loadUser(token);
    },
    [loadUser]
  );

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, completeMfaLogin, logout, refreshUser, setSessionToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
