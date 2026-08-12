/**
 * Thin client for the real WordArchitect backend (see the backend repo's
 * CLAUDE.md — "Frontend Integration Reference" — for the full contract).
 * No auth exists yet (a documented, deliberate MVP tradeoff on the backend
 * side): every write just needs a `userId`, so this module owns generating
 * and persisting one stable per-browser id rather than every store
 * reinventing that. Every domain store (`project-store.ts`, etc.) should
 * go through `apiFetch` here rather than calling `fetch` directly, so the
 * base URL, error shape, and userId handling stay in one place.
 */

const DEFAULT_BASE_URL = "https://wordarchitect-backend.onrender.com";

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

const USER_ID_STORAGE_KEY = "wordarchitect_user_id";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for any environment without crypto.randomUUID (older browsers).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * The current browser's stable pseudo-identity. Backend has no real auth
 * yet, so every request just needs *a* consistent `userId` — generated
 * once and persisted to localStorage, not tied to a real account. Safe to
 * call from any client component; returns a fresh id (not persisted) if
 * called during SSR/on the server, where localStorage doesn't exist.
 */
export function getUserId(): string {
  if (typeof window === "undefined") return generateUuid();
  let id = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!id) {
    id = generateUuid();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Fetch wrapper for `/api/v1/*`. `path` is relative to that prefix, e.g.
 * `apiFetch("/books?userId=...")`. Throws `ApiError` on a non-2xx response
 * or network failure — callers (store `load*` functions) are responsible
 * for catching and surfacing that as loading/error state, per the
 * established "keep hook signatures, add loading/error state" pattern.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}/api/v1${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Response wasn't JSON — keep the generic message.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
