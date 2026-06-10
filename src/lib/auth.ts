import { useSyncExternalStore } from "react";

export interface User {
  email: string;
  name: string;
}

interface StoredUser extends User {
  password: string;
}

const USERS_KEY = "dn_users";
const SESSION_KEY = "dn_session";
const MY_STORIES_KEY = "dn_my_stories";
const API_KEY_KEY = "dn_api_key";

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

function readUsers(): StoredUser[] {
  return read<StoredUser[]>(USERS_KEY, []);
}

export function signUp(email: string, password: string, name: string): User {
  const normalized = email.trim().toLowerCase();
  const users = readUsers();
  if (users.some((u) => u.email === normalized)) {
    throw new Error("이미 가입된 이메일이에요.");
  }
  const user: StoredUser = { email: normalized, name: name.trim() || normalized, password };
  users.push(user);
  write(USERS_KEY, users);
  const session: User = { email: user.email, name: user.name };
  write(SESSION_KEY, session);
  emit();
  return session;
}

export function signIn(email: string, password: string): User {
  const normalized = email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === normalized);
  if (!user || user.password !== password) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않아요.");
  }
  const session: User = { email: user.email, name: user.name };
  write(SESSION_KEY, session);
  emit();
  return session;
}

export function signOut() {
  if (hasWindow()) window.localStorage.removeItem(SESSION_KEY);
  emit();
}

export function getCurrentUser(): User | null {
  return read<User | null>(SESSION_KEY, null);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (hasWindow()) window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    if (hasWindow()) window.removeEventListener("storage", callback);
  };
}

export function useAuth(): User | null {
  return useSyncExternalStore(
    subscribe,
    () => getCurrentUser(),
    () => null,
  );
}

/* 내가 만든 동화 추적 (이메일별 동화 id 목록) */

type MyStoriesMap = Record<string, string[]>;

export function getMyStoryIds(email: string): string[] {
  const map = read<MyStoriesMap>(MY_STORIES_KEY, {});
  return map[email] ?? [];
}

export function addMyStoryId(email: string, id: string) {
  const map = read<MyStoriesMap>(MY_STORIES_KEY, {});
  const list = map[email] ?? [];
  if (!list.includes(id)) {
    map[email] = [id, ...list];
    write(MY_STORIES_KEY, map);
    emit();
  }
}

export function removeMyStoryId(email: string, id: string) {
  const map = read<MyStoriesMap>(MY_STORIES_KEY, {});
  map[email] = (map[email] ?? []).filter((storyId) => storyId !== id);
  write(MY_STORIES_KEY, map);
  emit();
}

/* 동화 생성용 API 키 */

export function getApiKey(): string {
  return read<string>(API_KEY_KEY, "");
}

export function setApiKey(value: string) {
  write(API_KEY_KEY, value.trim());
  emit();
}
