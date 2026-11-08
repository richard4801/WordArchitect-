import JSZip from "jszip";
import { apiFetch } from "@/lib/api-client";
import type { ChapterParagraph } from "@/lib/manuscript-data";

/**
 * Client-side book export (PDF / DOCX). No backend endpoint — fetches the
 * book's real chapter list + each chapter's saved paragraphs (same
 * endpoints manuscript-store.ts uses) and renders them locally.
 *
 * Known limit: the backend only stores plain text per paragraph (plus
 * break/emphasis flags), so inline bold/italic typed in the editor is not
 * in the exported file — see CLAUDE.md §3.5.
 */

export type ExportFormat = "pdf" | "docx";

export type ExportChapter = { number: number; title: string; paragraphs: ChapterParagraph[] };

export type ExportOptions = {
  bookId: string;
  title: string;
  subtitle?: string;
  format: ExportFormat;
  /** Restrict to these chapter ids; omit for the whole book. */
  chapterIds?: string[];
  onProgress?: (done: number, total: number) => void;
};

type ListRow = { id: string; number: number; title: string | null };
type DetailRow = { id: string; number: number; title: string | null; paragraphs: ChapterParagraph[] | null };

const CONCURRENCY = 6;

export async function fetchChaptersForExport(
  bookId: string,
  chapterIds: string[] | undefined,
  onProgress?: (done: number, total: number) => void,
): Promise<ExportChapter[]> {
  const list = await apiFetch<{ chapters: ListRow[] }>(`/manuscript/chapters?bookId=${encodeURIComponent(bookId)}`);
  let rows = [...list.chapters].sort((a, b) => a.number - b.number);
  if (chapterIds) {
    const wanted = new Set(chapterIds);
    rows = rows.filter((r) => wanted.has(r.id));
  }
  const out: ExportChapter[] = new Array(rows.length);
  let next = 0;
  let done = 0;
  onProgress?.(0, rows.length);
  async function worker() {
    while (next < rows.length) {
      const i = next++;
      const row = rows[i]!;
      const res = await apiFetch<{ chapter: DetailRow }>(`/manuscript/chapters/${row.id}`);
      out[i] = {
        number: row.number,
        title: row.title?.trim() || `Chapter ${row.number}`,
        paragraphs: res.chapter.paragraphs ?? [],
      };
      onProgress?.(++done, rows.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  return out;
}

function chapterHeading(c: ExportChapter): string {
  const generic = `Chapter ${c.number}`;
  return c.title === generic ? generic : `Chapter ${c.number}: ${c.title}`;
}

function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "manuscript";
  return `${base}.${ext}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------

function xmlEscape(s: string): string {
  // Strip characters illegal in XML 1.0, then escape.
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function run(text: string, rPr = ""): string {
  const parts = text.split("\n");
  const inner = parts
    .map((p, i) => `${i > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${xmlEscape(p)}</w:t>`)
    .join("");
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}${inner}</w:r>`;
}

function para(inner: string, pPr = ""): string {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;
}

async function buildDocx(title: string, subtitle: string | undefined, chapters: ExportChapter[]): Promise<Blob> {
  const body: string[] = [];
  // Title page
  body.push(para("", `<w:spacing w:before="4000"/>`));
  body.push(para(run(title), `<w:pStyle w:val="Title"/>`));
  if (subtitle) body.push(para(run(subtitle), `<w:jc w:val="center"/>`));

  chapters.forEach((c) => {
    body.push(para(run(chapterHeading(c)), `<w:pStyle w:val="Heading1"/><w:pageBreakBefore/>`));
    for (const p of c.paragraphs) {
      if (p.break) {
        body.push(para(run("* * *"), `<w:jc w:val="center"/>`));
      } else if (p.text.trim()) {
        body.push(para(run(p.text, p.emphasis ? "<w:i/>" : "")));
      }
    }
  });

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}` +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/><w:ind w:firstLine="720"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:jc w:val="center"/><w:spacing w:before="480" w:after="480" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>` +
    `</w:styles>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ---------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------

async function buildPdf(title: string, subtitle: string | undefined, chapters: ExportChapter[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 72;
  const textW = pageW - margin * 2;
  const fontSize = 12;
  const lineH = fontSize * 1.6;
  const indent = 28;

  // Title page
  doc.setFont("times", "bold").setFontSize(28);
  const titleLines = doc.splitTextToSize(title, textW) as string[];
  doc.text(titleLines, pageW / 2, pageH / 3, { align: "center" });
  if (subtitle) {
    doc.setFont("times", "normal").setFontSize(14);
    doc.text(subtitle, pageW / 2, pageH / 3 + titleLines.length * 34 + 10, { align: "center" });
  }

  for (const c of chapters) {
    doc.addPage();
    let y = margin + 24;
    doc.setFont("times", "bold").setFontSize(18);
    const headLines = doc.splitTextToSize(chapterHeading(c), textW) as string[];
    doc.text(headLines, pageW / 2, y, { align: "center" });
    y += headLines.length * 24 + 24;

    for (const p of c.paragraphs) {
      if (p.break) {
        if (y + lineH > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("times", "normal").setFontSize(fontSize);
        doc.text("* * *", pageW / 2, y, { align: "center" });
        y += lineH * 1.5;
        continue;
      }
      if (!p.text.trim()) continue;
      doc.setFont("times", p.emphasis ? "italic" : "normal").setFontSize(fontSize);
      // First line is indented; wrap it narrower, then re-wrap the rest at full width.
      const words = p.text.trim();
      const first = doc.splitTextToSize(words, textW - indent) as string[];
      const firstLine = first[0] ?? "";
      const rest = words.slice(firstLine.length).trim();
      const restLines = rest ? (doc.splitTextToSize(rest, textW) as string[]) : [];
      const lines: { text: string; x: number }[] = [
        { text: firstLine, x: margin + indent },
        ...restLines.map((t) => ({ text: t, x: margin })),
      ];
      for (const l of lines) {
        if (y > pageH - margin) {
          doc.addPage();
          y = margin;
          doc.setFont("times", p.emphasis ? "italic" : "normal").setFontSize(fontSize);
        }
        doc.text(l.text, l.x, y);
        y += lineH;
      }
    }
  }

  // Page numbers (skip title page)
  const total = doc.getNumberOfPages();
  doc.setFont("times", "normal").setFontSize(10);
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.text(String(i - 1), pageW / 2, pageH - 36, { align: "center" });
  }
  return doc.output("blob");
}

// ---------------------------------------------------------------------

export async function exportBook(opts: ExportOptions): Promise<{ chapters: number }> {
  const chapters = await fetchChaptersForExport(opts.bookId, opts.chapterIds, opts.onProgress);
  if (chapters.length === 0) throw new Error("This project has no chapters to export yet.");
  const blob =
    opts.format === "docx"
      ? await buildDocx(opts.title, opts.subtitle, chapters)
      : await buildPdf(opts.title, opts.subtitle, chapters);
  download(blob, safeFilename(opts.title, opts.format));
  return { chapters: chapters.length };
}
