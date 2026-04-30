"use client";

import { useState, useTransition } from "react";
import { Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMarkdown } from "@/components/markdown";
import { updateSitePageAction } from "../actions";

type Page = {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  content_md: string;
  is_home: boolean;
};

export function SitePageEditor({
  page,
  siteSlug,
}: {
  page: Page;
  siteSlug: string;
}) {
  const [title, setTitle] = useState(page.title);
  const [meta, setMeta] = useState(page.meta_description ?? "");
  const [body, setBody] = useState(page.content_md);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save() {
    const fd = new FormData();
    fd.set("page_id", page.id);
    fd.set("title", title);
    fd.set("meta_description", meta);
    fd.set("content_md", body);
    startTransition(async () => {
      await updateSitePageAction(fd);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  // Replace state with new page data when navigating between pages
  // (parent rerenders this component with a fresh page prop, so this is fine)
  if (page.id && title === "" && body === "") {
    setTitle(page.title);
    setBody(page.content_md);
  }

  const dirty =
    title !== page.title ||
    body !== page.content_md ||
    (meta || "") !== (page.meta_description ?? "");

  return (
    <div className="rounded-2xl border border-accent-100 bg-white">
      <div className="border-b border-accent-100 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
            /site/{siteSlug}/{page.slug}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs " +
              (view === "edit"
                ? "bg-accent text-white"
                : "border border-accent-100 text-ink hover:bg-accent-50")
            }
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs " +
              (view === "preview"
                ? "bg-accent text-white"
                : "border border-accent-100 text-ink hover:bg-accent-50")
            }
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
      </div>

      {view === "edit" ? (
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Page title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Meta description (SEO)
            </label>
            <Input
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              maxLength={300}
              placeholder="A short summary that shows up in Google results."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Content (markdown)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              maxLength={50_000}
              className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Markdown supported: # headings, **bold**, *italic*, lists, [links](https://example.com).
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-accent-100">
            <p className="text-xs text-ink-muted">
              {pending
                ? "Saving…"
                : savedAt
                ? `Saved at ${savedAt}`
                : dirty
                ? "Unsaved changes"
                : "All changes saved"}
            </p>
            <Button onClick={save} disabled={!dirty || pending}>
              {pending ? "Saving…" : "Save page"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 prose prose-sm max-w-none">
          <h1 className="text-2xl font-semibold text-ink mb-1">{title}</h1>
          {meta && <p className="text-sm text-ink-muted mb-6">{meta}</p>}
          <ChatMarkdown>{body || "_Empty page._"}</ChatMarkdown>
        </div>
      )}
    </div>
  );
}
