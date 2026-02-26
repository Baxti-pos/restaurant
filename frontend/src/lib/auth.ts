import { User, AuthState } from './types';

const AUTH_KEY = 'rms_auth';

export function getAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { user: null, token: null, activeBranchId: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, token: null, activeBranchId: null };
  }
}

export function setAuth(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  const auth = getAuth();
  return !!auth.token && !!auth.user;
}

export function generateToken(userId: string): string {
  return `mock-jwt-token-${userId}-${Date.now()}`;
}