import type { ReactNode } from "react";

/**
 * A small, dependency-free markdown renderer for AI Assistant replies —
 * this app has no markdown library installed (`package.json` is
 * deliberately minimal), and assistant replies only ever need a common
 * subset: paragraphs, bold, italic, inline code, links, and bulleted or
 * numbered lists. Not a general-purpose parser — headers/lists/paragraphs
 * are line-based, inline formatting is a single regex pass. Renders to
 * real React elements (never `dangerouslySetInnerHTML`), so it's safe
 * against anything a model might return.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-${i++}`} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-${i++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(
        linkMatch ? (
          <a
            key={`${keyPrefix}-${i++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline decoration-gold/40 underline-offset-2 hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        ) : (
          token
        ),
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-${i++}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADER_RE = /^(#{1,3})\s+(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const NUMBERED_RE = /^\d+\.\s+(.*)$/;

export function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const header = line.match(HEADER_RE);
    if (header) {
      const level = header[1].length;
      const className = "mt-3 font-display text-ink first:mt-0";
      blocks.push(
        level === 1 ? (
          <h3 key={key++} className={className}>
            {renderInline(header[2], `h${key}`)}
          </h3>
        ) : level === 2 ? (
          <h4 key={key++} className={className}>
            {renderInline(header[2], `h${key}`)}
          </h4>
        ) : (
          <h5 key={key++} className={className}>
            {renderInline(header[2], `h${key}`)}
          </h5>
        ),
      );
      i++;
      continue;
    }

    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        items.push(lines[i].match(BULLET_RE)![1]);
        i++;
      }
      blocks.push(
        <ul key={key++} className="mt-2 list-disc space-y-1 pl-5 first:mt-0">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (NUMBERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBERED_RE.test(lines[i])) {
        items.push(lines[i].match(NUMBERED_RE)![1]);
        i++;
      }
      blocks.push(
        <ol key={key++} className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `oli${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !HEADER_RE.test(lines[i]) && !BULLET_RE.test(lines[i]) && !NUMBERED_RE.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="mt-2 leading-relaxed first:mt-0">
        {paraLines.map((l, idx) => (
          <span key={idx}>
            {renderInline(l, `p${key}-${idx}`)}
            {idx < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  }

  return <>{blocks}</>;
}
