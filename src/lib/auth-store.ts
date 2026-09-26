"use client";

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";

/**
 * Real accounts, replacing the old "generate a random UUID per browser on
 * first load" identity (api-client.ts's old `getUserId()`) — the thing
 * that made a writer's data invisible the moment they opened the app on a
 * second device. `userId` everywhere else in the app now only ever comes
 * from a successful `/auth/me` response or the `user.id` a fresh
 * signup/login call returns — see `getCurrentUserId()` below, which
 * `api-client.ts`'s `getUserId()` now delegates to entirely.
 */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const TOKEN_KEY = "wordarchitect_auth_token";
const USER_CACHE_KEY = "wordarchitect_auth_user";

let token: string | null = null;
let user: AuthUser | null = null;
// Starts "loading", not "unauthenticated" — the very first render (server
// and client, before hydration) must not assume "no session" before
// restoreSession() has actually had a chance to check localStorage, or a
// real logged-in visitor would flash the login screen on every load.
let status: AuthStatus = "loading";

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function persist(nextToken: string | null, nextUser: AuthUser | null) {
  token = nextToken;
  user = nextUser;
  if (typeof window === "undefined") return;
  if (nextToken && nextUser) {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(nextUser));
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_CACHE_KEY);
  }
}

/**
 * `api-client.ts`'s `getUserId()` — called from every domain store's own
 * fetches — delegates to this. Throws if no session exists yet; every
 * page that can reach a store call is gated behind `(app)/layout.tsx`'s
 * auth check first (see that file), so an authenticated `user` should
 * always be present by the time any real call site runs this — a throw
 * here means that gate was bypassed somewhere, not a normal user-facing
 * error to design a fallback UI around.
 */
export function getCurrentUserId(): string {
  if (!user) throw new Error("getCurrentUserId() called with no authenticated session.");
  return user.id;
}

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, () => user, () => null);
}

export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(subscribe, () => status, () => "loading");
}

type AuthResponse = { user: AuthUser; token: string };
type MeResponse = { user: AuthUser };

/**
 * Called once at app boot (see `(app)/layout.tsx`). A persisted token is
 * shown optimistically via its cached `user` object (avoids a blank flash
 * while the real round trip is in flight) but is always re-verified for
 * real against `GET /auth/me` — the cached copy is never trusted on its
 * own, per the backend's own integration notes. A 401 here (expired
 * token, deleted account, or any other rejection) clears the stored
 * session and falls back to the login screen.
 */
export function restoreSession(): void {
  if (typeof window === "undefined") return;
  const storedToken = window.localStorage.getItem(TOKEN_KEY);
  if (!storedToken) {
    status = "unauthenticated";
    emit();
    return;
  }
  token = storedToken;
  const cached = window.localStorage.getItem(USER_CACHE_KEY);
  if (cached) {
    try {
      user = JSON.parse(cached) as AuthUser;
    } catch {
      user = null;
    }
  }
  void (async () => {
    try {
      const res = await apiFetch<MeResponse>("/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      persist(storedToken, res.user);
      status = "authenticated";
    } catch {
      persist(null, null);
      status = "unauthenticated";
    }
    emit();
  })();
}

export async function signup(params: { email: string; password: string; displayName?: string }): Promise<void> {
  const res = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(params),
  });
  completeSignIn(res);
}

export async function login(params: { email: string; password: string }): Promise<void> {
  const res = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(params),
  });
  completeSignIn(res);
}

/**
 * Every OTHER store in this app is a module-level singleton cache
 * (`project-store.ts`'s `hasStartedLoad`, the active planning run, etc.)
 * that persists for as long as the page stays loaded — correct for one
 * signed-in account, wrong the instant a second account signs in on the
 * same tab without a real reload, which would otherwise show account A's
 * still-cached projects/characters/notes/etc. under account B's name.
 * A full `window.location` navigation (not a client-side route change) is
 * the simple, whole-class fix: it tears down every module's in-memory
 * state along with the page itself, so the next load starts genuinely
 * clean. Same reasoning applies to `logout()` below.
 */
function completeSignIn(res: AuthResponse): void {
  persist(res.token, res.user);
  if (typeof window !== "undefined") window.location.href = "/";
}

export function logout(): void {
  persist(null, null);
  if (typeof window !== "undefined") window.location.href = "/login";
}

export async function changePassword(newPassword: string): Promise<void> {
  if (!token) throw new Error("Not logged in.");
  const res = await apiFetch<MeResponse>("/auth/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: newPassword }),
  });
  persist(token, res.user);
}
