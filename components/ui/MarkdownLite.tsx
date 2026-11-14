"use client";

import { Fragment } from "react";

/**
 * Tiny markdown renderer for assistant messages: paragraphs, bold, inline code,
 * lists, and links. Avoids pulling a full markdown parser into the bundle.
 */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  const inline = (s: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(s))) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const token = m[0];
      if (token.startsWith("**")) parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
      else if (token.startsWith("`")) parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
      else {
        const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch)
          parts.push(
            <a key={key++} href={linkMatch[2]} className="text-aurora-300 underline underline-offset-2">
              {linkMatch[1]}
            </a>,
          );
      }
      last = m.index + token.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length ? parts : s;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^\s*[-•*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-•*]\s+/, ""));
      continue;
    }
    flushList();
    blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flushList();

  return <div className="assistant-md text-[13px] leading-relaxed text-slate-300">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
