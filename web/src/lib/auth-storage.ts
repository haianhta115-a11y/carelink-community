import type { Auth } from '../api/types';
const key = 'carelink-session';
export function readAuth(): Auth | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Auth | null;
    return value?.token && Date.parse(value.expiresAt) > Date.now() ? value : null;
  } catch {
    return null;
  }
}
export function writeAuth(auth: Auth | null) {
  if (auth) sessionStorage.setItem(key, JSON.stringify(auth));
  else sessionStorage.removeItem(key);
}
export function safeReturnPath(value: string | null, fallback: string) {
  return value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !Array.from(value).some((character) => character.charCodeAt(0) < 32)
    ? value
    : fallback;
}
