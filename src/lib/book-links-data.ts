import type { BookLinkRow } from "@/lib/book-links-store";

export type LinkType = "sequel_of" | "translation_of";

export const LINK_TYPES: { type: LinkType; label: string; description: string }[] = [
  { type: "sequel_of", label: "Sequel of", description: "This project continues another one you've already written." },
  { type: "translation_of", label: "Translation of", description: "This project is a translation of another one." },
];

// `language` is a free-text VARCHAR(50) on the backend (see
// 030_book_links.sql — "only meaningful for translation_of, e.g. \"es\"")
// — no server-side enum, so this list is a frontend-only convenience, same
// "dropdown instead of typo-prone free text" convention the Planning
// Engine's MODEL_OPTIONS already established. Codes are real ISO 639-1
// (plus the two common regional variants), since that's what the backend
// actually expects — a plain language name like "Spanish"/"Espaniol" isn't
// a real code and would save as meaningless free text.
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "vi", label: "Vietnamese" },
  { code: "id", label: "Indonesian" },
  { code: "th", label: "Thai" },
  { code: "sv", label: "Swedish" },
];

export function languageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
}

export function relationshipLabel(l: BookLinkRow): string {
  if (l.link_type === "sequel_of") return "sequel";
  if (l.link_type === "translation_of") return `translation${l.language ? ` (${languageLabel(l.language)})` : ""}`;
  return l.link_type;
}
