"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { changePassword, useAuthUser } from "@/lib/auth-store";

export default function SettingsPage() {
  const user = useAuthUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(password);
      setPassword("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Account details and security.</p>
      </div>

      <div className="card space-y-3 p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Account</h2>
        <div>
          <p className="text-xs text-ink-faint">Email</p>
          <p className="text-sm text-ink">{user?.email}</p>
        </div>
        {user?.displayName && (
          <div>
            <p className="text-xs text-ink-faint">Display name</p>
            <p className="text-sm text-ink">{user.displayName}</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Change password</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-4" noValidate>
          <div>
            <label className="label-caps text-[0.6rem]" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </div>
          <div>
            <label className="label-caps text-[0.6rem]" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </div>

          {error && <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Update password
            </button>
            {saved && <span className="text-xs text-success">Password updated.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
