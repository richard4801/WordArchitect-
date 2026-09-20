"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { WAITLIST_CONFIGURED, WAITLIST_ENTRY_IDS, WAITLIST_FORM_ACTION_URL } from "@/lib/waitlist-config";

type SubmitState = "idle" | "submitting" | "success" | "error";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [whatYouWrite, setWhatYouWrite] = useState("");
  const [aiUsage, setAiUsage] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");

  const emailValid = isValidEmail(email);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || state === "submitting") return;

    if (!WAITLIST_CONFIGURED) {
      // Nothing to actually submit to yet — see waitlist-config.ts. Shown
      // as a real error rather than faking a success, so this state is
      // honestly distinguishable from a working submission during setup.
      setState("error");
      return;
    }

    setState("submitting");
    const body = new URLSearchParams({
      [WAITLIST_ENTRY_IDS.email]: email.trim(),
      [WAITLIST_ENTRY_IDS.whatYouWrite]: whatYouWrite.trim(),
      [WAITLIST_ENTRY_IDS.aiUsage]: aiUsage.trim(),
    });
    try {
      // Google's form-response endpoint sends no CORS headers, so this is
      // deliberately `no-cors` — the browser still sends the request for
      // real (confirmed against a live Form: the row lands in its Sheet),
      // it just can't let this code read back a status code. A genuine
      // network failure (offline, blocked) is the one thing this can still
      // detect, via the fetch throwing — anything else Google might reject
      // (e.g. a wrong entry id) is silent from here, which is exactly why
      // getting waitlist-config.ts's ids right matters.
      await fetch(WAITLIST_FORM_ACTION_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="relative z-0 flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-6 py-16">
      <div aria-hidden className="wa-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="wa-grid-glow pointer-events-none absolute inset-0 -z-10" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-7 text-gold" />
          <div className="mt-3 font-display text-2xl leading-none tracking-wide text-ink">
            WORD<span className="text-gold">ARCHITECT</span>
          </div>
          <p className="label-caps mt-2 text-[0.6rem]">Write. Craft. Conquer.</p>
        </div>

        <div className="card p-8">
          {state === "success" ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
                <Check className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-xl text-ink">You&apos;re on the list.</h2>
              <p className="mt-2 text-sm text-ink-muted">
                We&apos;ll email <span className="text-ink">{email.trim()}</span> the moment it&apos;s your
                turn. Thanks for the interest.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="font-display text-2xl text-ink">Get early access</h1>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="label-caps text-[0.6rem]" htmlFor="waitlist-email">
                    What&apos;s your email?
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="you@example.com"
                    className={`mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
                      touched && !emailValid ? "border-danger" : "border-line focus:border-line-strong"
                    }`}
                  />
                  {touched && !emailValid && <p className="mt-1 text-xs text-danger">A real email address, please.</p>}
                </div>

                <div>
                  <label className="label-caps text-[0.6rem]" htmlFor="waitlist-genre">
                    What do you write?
                  </label>
                  <input
                    id="waitlist-genre"
                    type="text"
                    value={whatYouWrite}
                    onChange={(e) => setWhatYouWrite(e.target.value)}
                    placeholder="Romance, fantasy, thriller..."
                    className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                  />
                </div>

                <div>
                  <label className="label-caps text-[0.6rem]" htmlFor="waitlist-ai-usage">
                    How do you currently use AI for writing?
                  </label>
                  <textarea
                    id="waitlist-ai-usage"
                    rows={3}
                    value={aiUsage}
                    onChange={(e) => setAiUsage(e.target.value)}
                    placeholder="Optional — I just want to know what I'm dealing with 😂"
                    className="scroll-slim mt-1.5 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                  />
                </div>

                {state === "error" && (
                  <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                    {WAITLIST_CONFIGURED
                      ? "Couldn't reach the waitlist right now — check your connection and try again."
                      : "The waitlist isn't connected yet — nothing was sent."}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {state === "submitting" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Joining…
                    </>
                  ) : (
                    <>
                      Yeah, I want in
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
