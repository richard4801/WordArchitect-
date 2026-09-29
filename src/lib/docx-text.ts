"use client";

import JSZip from "jszip";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Extracts plain text from a .docx file's main document part — one
 * paragraph per line, blank line between paragraphs, the exact shape the
 * bulk-import textarea/`splitIntoChapters` already expects (a real
 * "Chapter N" header has to sit alone on its own line to be detected). A
 * .docx is just a zip archive; `word/document.xml` holds the body as
 * `<w:p>` paragraph elements, each made of `<w:r>` runs containing `<w:t>`
 * text nodes — reading those directly avoids pulling in a full docx→HTML
 * conversion library for something this app only ever turns back into a
 * flat string anyway. Only the body's own paragraph text survives —
 * headers/footers, images, table borders/styling, and all formatting are
 * dropped, since `rawText` has nowhere to put any of that.
 */
export async function extractDocxText(file: File): Promise<string> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("Couldn't open that file — is it a real .docx document?");
  }
  const entry = zip.file("word/document.xml");
  if (!entry) {
    throw new Error("That file doesn't look like a valid .docx document.");
  }
  const xml = await entry.async("text");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Couldn't read that document's contents.");
  }

  const paragraphs = doc.getElementsByTagNameNS(W_NS, "p");
  const lines: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    lines.push(paragraphText(paragraphs[i]));
  }
  return lines.join("\n\n");
}

function paragraphText(paragraph: Element): string {
  let text = "";
  const nodes = paragraph.getElementsByTagNameNS(W_NS, "*");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.localName === "t") text += node.textContent ?? "";
    else if (node.localName === "br" || node.localName === "cr") text += "\n";
    else if (node.localName === "tab") text += "\t";
  }
  return text;
}
