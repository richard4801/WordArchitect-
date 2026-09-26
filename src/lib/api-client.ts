/**
 * Thin client for the real WordArchitect backend (see the backend repo's
 * CLAUDE.md — "Frontend Integration Reference" — for the full contract).
 * Every domain store (`project-store.ts`, etc.) should go through
 * `apiFetch` here rather than calling `fetch` directly, so the base URL
 * and error shape stay in one place.
 */
import { getCurrentUserId } from "@/lib/auth-store";

const DEFAULT_BASE_URL = "https://wordarchitect-backend.onrender.com";

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

/**
 * The signed-in account's real id — every domain store's own `userId`
 * field now comes from here, not a locally-invented per-browser UUID (the
 * old implementation, deleted along with the cross-device bug it caused:
 * a writer's data was invisible on any second device, since nothing tied
 * a browser's random id back to a real account). See `auth-store.ts` for
 * where this id actually comes from — a real backend account, restored
 * from a persisted token and re-verified via `/auth/me` on every load.
 */
export function getUserId(): string {
  return getCurrentUserId();
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
