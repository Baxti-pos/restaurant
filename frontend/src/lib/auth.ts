import { User, AuthState } from './types';

const AUTH_KEY = 'rms_auth';

export function getAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { user: null, token: null, activeBranchId: null, branches: [] };
    const parsed = JSON.parse(raw) as AuthState;
    if (parsed.user && !Array.isArray(parsed.user.permissions)) {
      parsed.user.permissions = [];
    }
    if (!Array.isArray(parsed.branches)) {
      parsed.branches = [];
    }
    return parsed;
  } catch {
    return { user: null, token: null, activeBranchId: null, branches: [] };
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
