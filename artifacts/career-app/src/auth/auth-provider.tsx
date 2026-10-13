import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loginRequest, getMeRequest, logoutRequest } from "@/api/auth";
import { ApiError } from "@/api/errors";
import { hasApiBaseUrl } from "@/config/env";
import type { AuthUser, LoginInput } from "@/types/auth";

type AuthContextValue = {
  currentUser: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (!hasApiBaseUrl()) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getMeRequest();
      setCurrentUser(response.user);
    } catch (error) {
      // The API uses httpOnly cookie sessions. A non-network error means the
      // session is invalid or expired, so drop the cached user.
      if (!(error instanceof ApiError) || error.status !== 0) {
        setCurrentUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (input: LoginInput) => {
    if (!hasApiBaseUrl()) {
      throw new ApiError(
        "Missing API URL. Add EXPO_PUBLIC_API_URL to .env and restart Expo.",
        0,
        "MISSING_API_URL",
      );
    }
    const response = await loginRequest(input);
    setCurrentUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (hasApiBaseUrl()) {
        await logoutRequest();
      }
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [currentUser, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
