/**
 * Server-side PDF generation. Uses @react-pdf/renderer (pure Node, no
 * headless browser required, works on Vercel out of the box).
 *
 * Public API:
 *   - renderDocumentPdf(opts): Promise<Buffer>
 *   - DocumentPdfOpts type
 *
 * Markdown is parsed with a small custom mini-renderer so we don't pull in
 * the heavy react-markdown tree just for PDF output. Supports:
 *   - # / ## / ### headings
 *   - paragraphs with **bold** and *italic*
 *   - bullet lists ("- " or "* ")
 *   - numbered lists ("1. ")
 *   - blockquotes ("> ")
 *   - horizontal rules ("---")
 *
 * The legal/financial disclaimer is rendered in the footer of every page.
 */
import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import React from "react";

export type DocumentPdfOpts = {
  title: string;
  subtitle?: string;
  workspaceName?: string;
  jurisdictionLabel?: string;
  preparedFor?: string;
  preparedDate?: string;
  body: string; // markdown
  documentKind?: string; // 'plan' | 'nda' | 'legal' | etc.
};

const COLORS = {
  ink: "#0B1220",
  inkSoft: "#111827",
  muted: "#6B7280",
  accent: "#1F3A8A",
  accent400: "#2563EB",
  bg50: "#F8FAFC",
  bg100: "#EFF4FB",
  border: "#DCE7F7",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.ink,
    lineHeight: 1.45,
  },
  cover: {
    backgroundColor: "#FFFFFF",
    padding: 56,
    fontFamily: "Helvetica",
  },
  coverEyebrow: {
    fontSize: 10,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.inkSoft,
    marginBottom: 24,
  },
  metaTable: {
    marginTop: 30,
    borderTop: `1pt solid ${COLORS.border}`,
  },
  metaRow: {
    flexDirection: "row",
    borderBottom: `1pt solid ${COLORS.border}`,
    paddingVertical: 6,
  },
  metaLabel: {
    width: 120,
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: { fontSize: 11, color: COLORS.ink, flex: 1 },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: COLORS.accent,
    marginTop: 18,
    marginBottom: 8,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: COLORS.accent400,
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLORS.ink,
    marginTop: 10,
    marginBottom: 4,
  },
  p: { fontSize: 11, color: COLORS.ink, marginBottom: 8 },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  bulletDot: { width: 10, fontSize: 11, color: COLORS.accent },
  bulletText: { flex: 1, fontSize: 11, color: COLORS.ink },
  hr: {
    borderTop: `1pt solid ${COLORS.border}`,
    marginVertical: 10,
  },
  blockquote: {
    borderLeft: `2pt solid ${COLORS.accent}`,
    paddingLeft: 10,
    marginVertical: 8,
    color: COLORS.muted,
    fontSize: 11,
    fontStyle: "italic",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontStyle: "italic" },
  pageHeader: {
    position: "absolute",
    top: 24,
    right: 56,
    fontSize: 9,
    color: COLORS.muted,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 9,
    color: COLORS.muted,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5pt solid ${COLORS.border}`,
    paddingTop: 8,
  },
});

/** Mini markdown renderer for PDF. Returns React-PDF JSX. */
function renderMarkdown(md: string): React.ReactElement[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactElement[] = [];
  let listBuffer: { kind: "ul" | "ol"; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer) return;
    listBuffer.items.forEach((item, idx) => {
      out.push(
        React.createElement(
          View,
          { key: key++, style: styles.bullet },
          React.createElement(
            Text,
            { style: styles.bulletDot },
            listBuffer!.kind === "ol" ? `${idx + 1}.` : "•"
          ),
          React.createElement(
            Text,
            { style: styles.bulletText },
            renderInline(item)
          )
        )
      );
    });
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.kind !== "ul") {
        flushList();
        listBuffer = { kind: "ul", items: [] };
      }
      listBuffer.items.push(ulMatch[1]!);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.kind !== "ol") {
        flushList();
        listBuffer = { kind: "ol", items: [] };
      }
      listBuffer.items.push(olMatch[1]!);
      continue;
    }

    flushList();

    if (line === "---" || line === "***") {
      out.push(React.createElement(View, { key: key++, style: styles.hr }));
      continue;
    }

    if (line.startsWith("### ")) {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.h3 },
          line.slice(4)
        )
      );
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.h2 },
          line.slice(3)
        )
      );
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.h1 },
          line.slice(2)
        )
      );
      continue;
    }
    if (line.startsWith("> ")) {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.blockquote },
          renderInline(line.slice(2))
        )
      );
      continue;
    }

    out.push(
      React.createElement(
        Text,
        { key: key++, style: styles.p },
        renderInline(line)
      )
    );
  }
  flushList();

  return out;
}

/** Inline formatting: bold + italic. Returns array of React elements. */
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize **bold** and *italic*
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.bold },
          token.slice(2, -2)
        )
      );
    } else {
      out.push(
        React.createElement(
          Text,
          { key: key++, style: styles.italic },
          token.slice(1, -1)
        )
      );
    }
    lastIdx = match.index + token.length;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

function CofoundrPdfDoc(opts: DocumentPdfOpts) {
  const today =
    opts.preparedDate ??
    new Date().toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return React.createElement(
    Document,
    {
      title: opts.title,
      author: opts.workspaceName ?? "Cofoundr",
      creator: "Cofoundr",
      producer: "Cofoundr (cofoundr.ca)",
    },
    // ----- Cover page ----------------------------------------------------
    React.createElement(
      Page,
      { size: "LETTER", style: styles.cover },
      React.createElement(
        Text,
        { style: styles.coverEyebrow },
        opts.documentKind ? opts.documentKind.toUpperCase() : "DOCUMENT"
      ),
      React.createElement(Text, { style: styles.coverTitle }, opts.title),
      opts.subtitle &&
        React.createElement(Text, { style: styles.coverSubtitle }, opts.subtitle),
      React.createElement(
        View,
        { style: styles.metaTable },
        opts.workspaceName &&
          React.createElement(
            View,
            { style: styles.metaRow },
            React.createElement(Text, { style: styles.metaLabel }, "Workspace"),
            React.createElement(
              Text,
              { style: styles.metaValue },
              opts.workspaceName
            )
          ),
        opts.jurisdictionLabel &&
          React.createElement(
            View,
            { style: styles.metaRow },
            React.createElement(
              Text,
              { style: styles.metaLabel },
              "Jurisdiction"
            ),
            React.createElement(
              Text,
              { style: styles.metaValue },
              opts.jurisdictionLabel
            )
          ),
        opts.preparedFor &&
          React.createElement(
            View,
            { style: styles.metaRow },
            React.createElement(
              Text,
              { style: styles.metaLabel },
              "Prepared for"
            ),
            React.createElement(
              Text,
              { style: styles.metaValue },
              opts.preparedFor
            )
          ),
        React.createElement(
          View,
          { style: styles.metaRow },
          React.createElement(Text, { style: styles.metaLabel }, "Date"),
          React.createElement(Text, { style: styles.metaValue }, today)
        )
      )
    ),
    // ----- Body pages ----------------------------------------------------
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page, wrap: true },
      React.createElement(
        Text,
        { style: styles.pageHeader, fixed: true },
        opts.title
      ),
      ...renderMarkdown(opts.body),
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          {},
          "AI guidance only — Cofoundr is not a law firm, accounting firm, or financial advisor."
        ),
        React.createElement(Text, {
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Page ${pageNumber} / ${totalPages}`,
        })
      )
    )
  );
}

export async function renderDocumentPdf(opts: DocumentPdfOpts): Promise<Buffer> {
  const stream = await pdf(CofoundrPdfDoc(opts) as React.ReactElement).toBuffer();
  // @react-pdf returns a Node Readable; collect it.
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks);
}
