import { useEffect, useState } from "react";

export interface User {
  id: number;
  email: string;
  name: string;
  storyPoints: number;
}

interface AuthSession {
  token: string;
  user: User;
}

interface AuthResponse {
  token: string;
  user: User;
}

const SESSION_KEY = "dn_session";
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8080";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function hasWindow() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function fetchAuth(path: string, init?: RequestInit): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Authentication failed");
  }

  return response.json() as Promise<AuthResponse>;
}

async function fetchUser(path: string, init?: RequestInit): Promise<User> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Authentication failed");
  }

  return response.json() as Promise<User>;
}

function saveSession(session: AuthSession) {
  write(SESSION_KEY, session);
  emit();
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const session = await fetchAuth("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  saveSession(session);
  return session.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const session = await fetchAuth("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveSession(session);
  return session.user;
}

export async function signOut() {
  const token = getAuthToken();
  if (token) {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  if (hasWindow()) window.localStorage.removeItem(SESSION_KEY);
  emit();
}

export function getCurrentUser(): User | null {
  return read<AuthSession | null>(SESSION_KEY, null)?.user ?? null;
}

export async function refreshCurrentUser(): Promise<User | null> {
  const session = read<AuthSession | null>(SESSION_KEY, null);
  if (!session?.token) return null;

  const user = await fetchUser("/api/auth/me");
  saveSession({ token: session.token, user });
  return user;
}

export function getAuthToken(): string | null {
  return read<AuthSession | null>(SESSION_KEY, null)?.token ?? null;
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (hasWindow()) {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (hasWindow()) {
      window.removeEventListener("storage", callback);
    }
  };
}

export function useAuth(): User | null {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    refreshCurrentUser().catch(() => undefined);

    return subscribe(() => {
      setUser(getCurrentUser());
    });
  }, []);

  return user;
}
