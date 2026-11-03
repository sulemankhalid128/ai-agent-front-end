/**
 * Auth client — signup / login / me + localStorage token storage.
 */

import { API_BASE, readApiError } from "./apiBase";

const TOKEN_KEY = "msk-auth-token";
const USER_KEY = "msk-auth-user";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Headers for authenticated API calls (includes Content-Type when needed) */
export function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function postAuth(
  path: "/auth/signup" | "/auth/login",
  body: Record<string, string>,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function signup(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const body: Record<string, string> = {
    email: input.email.trim(),
    password: input.password,
  };
  if (input.name?.trim()) body.name = input.name.trim();

  const result = await postAuth("/auth/signup", body);
  storeAuth(result.token, result.user);
  return result;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await postAuth("/auth/login", {
    email: input.email.trim(),
    password: input.password,
  });
  storeAuth(result.token, result.user);
  return result;
}

/** Validate stored token against GET /auth/me */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const token = getStoredToken();
  if (!token) throw new Error("Not signed in");

  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: authHeaders(false),
  });

  if (!response.ok) {
    clearAuth();
    throw new Error(await readApiError(response));
  }

  const data = (await response.json()) as { user: AuthUser };
  storeAuth(token, data.user);
  return data.user;
}

export function logout() {
  clearAuth();
}
