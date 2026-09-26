"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { login, restoreSession, signup, useAuthStatus } from "@/lib/auth-store";

/**
 * Shared by /login and /signup — same markup/logic either way, just which
 * endpoint it calls and one extra field. Kept as two real routes (not one
 * page with client-side state) so the back button and a bookmark both do
 * the right thing.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const authStatus = useAuthStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `/login`/`/signup` live outside the `(app)` route group, so its own
  // layout-level restoreSession() call never runs for a fresh, direct load
  // of this page (a bookmark, a manual URL) — without this, a visitor with
  // a genuinely valid stored token would be stuck here forever, since
  // authStatus would never leave "loading" to trigger the redirect below.
  useEffect(() => {
    restoreSession();
  }, []);

  // Already signed in (e.g. a valid token restored from a prior session)
  // and landed here anyway — bounce to the Dashboard. A plain client-side
  // redirect is fine here, unlike the hard reload login()/signup() do on
  // success: this is the SAME account staying signed in, not a different
  // one that could be leaving another account's cached data behind.
  useEffect(() => {
    if (authStatus === "authenticated") router.replace("/");
  }, [authStatus, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({ email, password, displayName: displayName.trim() || undefined });
      } else {
        await login({ email, password });
      }
      // On success, login()/signup() themselves navigate away via a hard
      // reload (see auth-store.ts) — nothing further to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-7 text-gold" />
          <div className="mt-3 font-display text-2xl leading-none tracking-wide text-ink">
            WORD<span className="text-gold">ARCHITECT</span>
          </div>
          <p className="label-caps mt-2 text-[0.6rem]">Write. Craft. Conquer.</p>
        </div>

        <div className="card p-8">
          <h1 className="text-center font-display text-2xl text-ink">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" && (
              <div>
                <label className="label-caps text-[0.6rem]" htmlFor="auth-name">
                  Display name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional"
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="label-caps text-[0.6rem]" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
            </div>

            <div>
              <label className="label-caps text-[0.6rem]" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {mode === "signup" ? "Creating account…" : "Logging in…"}
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Log in"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-muted">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-gold hover:opacity-80">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New to WordArchitect?{" "}
                <Link href="/signup" className="text-gold hover:opacity-80">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
