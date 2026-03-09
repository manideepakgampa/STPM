import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import TransportLoader from "@/components/TransportLoader";
import { getAppState, subscribeToAppState, updateAppState } from "@/lib/app-state";
import type { AppUser, UserRole } from "@/lib/app-state";

export type { UserRole };

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  userType: string;
  role: UserRole;
  status: string;
  token: string;
  photoUrl: string | null;
  faceDescriptor: number[] | null;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; userId?: string; error?: string }>;
  logout: () => void;
  generateOtp: () => string;
  verifyOtp: (input: string, expected: string) => boolean;
}

interface SignupData {
  fullName: string;
  email: string;
  mobile: string;
  userType: string;
  password: string;
  photoUrl?: string | null;
  faceDescriptor?: number[] | null;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "stp_session";

const generateToken = () => `jwt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const generateUserId = () => {
  const state = getAppState();
  let nextId = "";

  do {
    const a = Math.floor(100 + Math.random() * 900);
    const b = Math.floor(1000 + Math.random() * 9000);
    nextId = `STPM-${a}-${b}`;
  } while (state.users.some((entry) => entry.id === nextId));

  return nextId;
};

const toSessionUser = (user: AppUser, token?: string): SessionUser => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  mobile: user.mobile,
  userType: user.userType,
  role: user.role,
  status: user.status,
  token: token ?? generateToken(),
  photoUrl: user.photoUrl,
  faceDescriptor: user.faceDescriptor ?? null,
});

const readStoredSession = (): SessionUser | null => {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    const current = getAppState().users.find((entry) => entry.id === parsed.id);
    return current ? toSessionUser(current, parsed.token) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);

  const persistSession = useCallback((sessionUser: SessionUser | null) => {
    if (typeof window !== "undefined") {
      if (sessionUser) {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }

    setUser(sessionUser);
  }, []);

  useEffect(() => {
    persistSession(readStoredSession());
    const t1 = setTimeout(() => setFading(true), 800);
    const t2 = setTimeout(() => setLoading(false), 1200);

    const unsubscribe = subscribeToAppState(() => {
      const refreshed = readStoredSession();
      persistSession(refreshed);
    });

    return () => { clearTimeout(t1); clearTimeout(t2); unsubscribe(); };
  }, [persistSession]);

  const login = useCallback(async (userId: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const found = getAppState().users.find(
      (entry) =>
        (entry.id.toLowerCase() === userId.toLowerCase() ||
          entry.email.toLowerCase() === userId.toLowerCase()) &&
        entry.password === password
    );

    if (!found) {
      return { success: false, error: "Invalid credentials. Please try again." };
    }

    if (found.status !== "active") {
      return { success: false, error: "Account is suspended." };
    }

    persistSession(toSessionUser(found));
    return { success: true };
  }, [persistSession]);

  const signup = useCallback(async (data: SignupData) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const existing = getAppState().users.find(
      (entry) => entry.email.toLowerCase() === data.email.toLowerCase()
    );

    if (existing) {
      return { success: false, error: "Email already registered." };
    }

    const userId = generateUserId();
    const createdAt = new Date().toISOString().split("T")[0];

    updateAppState((draft) => {
      draft.users.unshift({
        id: userId,
        fullName: data.fullName,
        email: data.email,
        mobile: data.mobile,
        userType: data.userType as AppUser["userType"],
        password: data.password,
        role: "user",
        status: "active",
        createdAt,
        photoUrl: data.photoUrl ?? null,
        faceDescriptor: data.faceDescriptor ?? null,
      });

      draft.wallets[userId] = { balance: 0, transactions: [] };
      draft.notifications.unshift({
        id: `NOT-${Date.now()}`,
        type: "targeted",
        userId,
        title: "Welcome to Smart Transport",
        message: "Your account is ready. You can now apply for transport passes.",
        date: createdAt,
        read: false,
      });
    });

    return { success: true, userId };
  }, []);

  const logout = useCallback(() => {
    persistSession(null);
  }, [persistSession]);

  const generateOtp = useCallback(() => String(Math.floor(100000 + Math.random() * 900000)), []);
  const verifyOtp = useCallback((input: string, expected: string) => input === expected, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, generateOtp, verifyOtp }}>
      {loading ? <TransportLoader fading={fading} /> : children}
    </AuthContext.Provider>
  );
};

const defaultAuth: AuthContextType = {
  user: null,
  loading: true,
  login: async () => ({ success: false, error: "Auth not ready" }),
  signup: async () => ({ success: false, error: "Auth not ready" }),
  logout: () => {},
  generateOtp: () => "",
  verifyOtp: () => false,
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuth;
};
