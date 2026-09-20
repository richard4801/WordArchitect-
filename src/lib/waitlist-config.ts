/**
 * Waitlist form destination — a Google Form standing in as a zero-backend,
 * spreadsheet-backed store (no Supabase, no server code, no credentials).
 * Every submission lands as a new row in the "WordArchitect-Waitlist"
 * Google Sheet this Form is linked to, viewable in Sheets or downloadable
 * as a real .xlsx at any time — a live website writing a row to a real
 * spreadsheet, which a file sitting in this repo or in a chat can't do.
 *
 * TO POINT THIS AT A DIFFERENT FORM LATER: open that Form's editor, "⋮"
 * menu → "Pre-fill form" (or "Get pre-filled link" on older UIs), type a
 * recognizable placeholder into each of its 3 fields (in the same order:
 * email, what-you-write, AI-usage), click "Get link", and read the result:
 *   https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111=X&entry.222=Y&entry.333=Z
 * `WAITLIST_FORM_ACTION_URL` is everything before "/viewform" with
 * "/viewform" swapped for "/formResponse"; `WAITLIST_ENTRY_IDS` are the
 * three "entry.NNNNNN" numbers, matched to whichever placeholder you typed
 * into that field.
 */
export const WAITLIST_FORM_ACTION_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdiS9k8ujsr3MySCCHCry_f_pYwuvnCyaJ3YCWphn92qRlW6w/formResponse";

export const WAITLIST_ENTRY_IDS = {
  email: "entry.1093230551",
  whatYouWrite: "entry.1619264672",
  aiUsage: "entry.1437735719",
};

/** True once every placeholder above has been replaced with a real value. */
export const WAITLIST_CONFIGURED =
  !WAITLIST_FORM_ACTION_URL.startsWith("REPLACE_") &&
  !Object.values(WAITLIST_ENTRY_IDS).some((value) => value.startsWith("REPLACE_"));
