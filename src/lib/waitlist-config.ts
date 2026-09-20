/**
 * Waitlist form destination — a Google Form standing in as a zero-backend,
 * spreadsheet-backed store (no Supabase, no server code, no credentials).
 * Every submission lands as a new row in that Form's own "Responses"
 * Google Sheet, which can be opened in Sheets or downloaded as a real
 * .xlsx at any time — this is genuinely "an Excel file," just one that a
 * live website can actually write a row to, which a file sitting in this
 * repo or in a chat can't.
 *
 * HOW TO FINISH WIRING THIS (one-time, ~2 minutes, no code beyond this file):
 *
 * 1. Go to https://forms.google.com and create a new blank form.
 * 2. Add exactly 3 questions, in this order (the question TEXT doesn't
 *    matter for wiring — only that there are 3 fields, in this order,
 *    with these types):
 *      Q1: Email                                  — Short answer, Required
 *      Q2: What do you write?                      — Short answer
 *      Q3: How do you currently use AI for writing? — Paragraph
 * 3. In the form editor, click the "⋮" (more options) menu in the
 *    top-right toolbar → "Get pre-filled link".
 * 4. Type a recognizable placeholder into each field so you can tell them
 *    apart afterward — e.g. type "EMAILFIELD" into Q1, "WRITEFIELD" into
 *    Q2, "AIFIELD" into Q3 — then click "Get link" and "Copy link".
 * 5. Paste that copied link to Claude (or read it yourself): it looks like
 *    https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111111=EMAILFIELD&entry.222222=WRITEFIELD&entry.333333=AIFIELD
 *    - WAITLIST_FORM_ACTION_URL is everything before "/viewform", with
 *      "/viewform" replaced by "/formResponse":
 *      https://docs.google.com/forms/d/e/FORM_ID/formResponse
 *    - The three WAITLIST_ENTRY_IDS values are the "entry.NNNNNN" numbers,
 *      matched to whichever placeholder text you typed into that field.
 * 6. Replace the four placeholder strings below with your real values and
 *    save — that's the entire integration. No redeploy step beyond the
 *    normal push, no other file needs to change.
 */
export const WAITLIST_FORM_ACTION_URL = "REPLACE_WITH_YOUR_FORM_ACTION_URL";

export const WAITLIST_ENTRY_IDS = {
  email: "REPLACE_WITH_ENTRY_ID",
  whatYouWrite: "REPLACE_WITH_ENTRY_ID",
  aiUsage: "REPLACE_WITH_ENTRY_ID",
};

/** True once every placeholder above has been replaced with a real value. */
export const WAITLIST_CONFIGURED =
  !WAITLIST_FORM_ACTION_URL.startsWith("REPLACE_") &&
  !Object.values(WAITLIST_ENTRY_IDS).some((value) => value.startsWith("REPLACE_"));
