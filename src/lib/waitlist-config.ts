/**
 * Waitlist submission destination — a Google Apps Script Web App bound to
 * the "WordArchitect-Waitlist" Google Sheet, standing in as a zero-backend,
 * spreadsheet-backed store (no Supabase, no server code we host, no
 * credentials in this repo). Every submission lands as a new row in that
 * Sheet's "Waitlist" tab, viewable in Sheets or downloadable as a real
 * .xlsx at any time — a live website writing a row to a real spreadsheet,
 * which a file sitting in this repo or in a chat can't do.
 *
 * Replaces an earlier Google Form-based approach: Forms' own "link an
 * existing spreadsheet as the response destination" step turned out
 * unreliable in practice (a test submission landed in the Form's own
 * response store but never made it into the linked Sheet). This endpoint
 * writes directly into the Sheet itself — no separate Form, no response-
 * destination linking step to get wrong.
 *
 * TO POINT THIS AT A DIFFERENT SHEET/SCRIPT LATER: open that Sheet →
 * Extensions → Apps Script → paste a `doPost(e)` handler that appends a
 * row to its own sheet from `JSON.parse(e.postData.contents)` → Deploy →
 * New deployment → Web app (Execute as: Me, Who has access: Anyone) →
 * copy the resulting URL (ends in "/exec") → paste it below.
 */
export const WAITLIST_ENDPOINT_URL =
  "https://script.google.com/macros/s/AKfycbxg52XddBj2Pa8CPIMAcZhri7ojtbBinuR3XKNQtYs9DP82_51ZQn1yBisXo702XPbD7A/exec";

/** True once the placeholder above has been replaced with a real value. */
export const WAITLIST_CONFIGURED = !WAITLIST_ENDPOINT_URL.startsWith("REPLACE_");
