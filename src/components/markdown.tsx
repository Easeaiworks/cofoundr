"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Markdown renderer for Cofoundr chat bubbles.
 *
 * - GFM (GitHub-flavored Markdown) for tables, task lists, strikethrough, autolinks
 * - External links open in a new tab and are visually distinct
 * - Tight spacing tuned for chat bubbles (no giant paragraph margins)
 */
export function ChatMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("cf-md text-sm leading-relaxed text-ink", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-400 break-words"
            >
              {children}
            </a>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 last:mb-0 list-disc pl-5 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 last:mb-0 list-decimal pl-5 space-y-1">{children}</ol>
          ),
          li: ({ children, ...props }) => {
            // GFM task list: <li> with a leading <input type="checkbox" />
            // remark-gfm renders these with a `className="task-list-item"` we
            // can style if we want; here we just keep the native checkbox.
            return (
              <li className="leading-relaxed" {...props}>
                {children}
              </li>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-base font-semibold text-ink mt-3 mb-1 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-ink mt-3 mb-1 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-ink mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          code: ({ className, children, ...props }) => {
            const inline = !className;
            if (inline) {
              return (
                <code
                  className="rounded bg-accent-50 border border-accent-100 px-1 py-0.5 text-[12px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block rounded-md bg-ink text-white p-3 text-[12px] font-mono overflow-x-auto"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent-100 pl-3 my-2 text-ink-muted italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-accent-100 bg-canvas px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-accent-100 px-2 py-1 align-top">{children}</td>
          ),
          hr: () => <hr className="my-3 border-accent-100" />,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
