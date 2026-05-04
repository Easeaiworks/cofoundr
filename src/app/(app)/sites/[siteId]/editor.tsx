"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Eye,
  Edit3,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMarkdown } from "@/components/markdown";
import {
  type Block,
  type BlockType,
  defaultBlock,
} from "@/lib/site-blocks";
import { SITE_THEMES, type SiteTheme } from "@/lib/site-themes";
import {
  updateSitePageBlocksAction,
  updateSiteSettingsAction,
} from "../actions";

type Page = {
  id: string;
  slug: string;
  title: string;
  content_blocks: Block[];
  is_home: boolean;
};

type Site = {
  id: string;
  slug: string;
  name: string;
  workspace_id: string;
  theme_key: string;
  primary_color: string | null;
  secondary_color: string | null;
};

export function SitePageEditor({
  site,
  page,
  workspaceTitle,
}: {
  site: Site;
  page: Page;
  workspaceTitle: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(page.content_blocks ?? []);
  const [view, setView] = useState<"edit" | "preview" | "design">("edit");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setBlocks(page.content_blocks ?? []);
  }, [page.id, page.content_blocks]);

  const dirty = JSON.stringify(blocks) !== JSON.stringify(page.content_blocks);

  function save() {
    const fd = new FormData();
    fd.set("page_id", page.id);
    fd.set("blocks", JSON.stringify(blocks));
    startTransition(async () => {
      await updateSitePageBlocksAction(fd);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, defaultBlock(type, workspaceTitle)]);
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }

  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBlockProps(idx: number, props: Block["props"]) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === idx ? ({ ...b, props } as Block) : b))
    );
  }

  async function aiDraftBlock(idx: number, hint?: string) {
    const block = blocks[idx];
    if (!block) return;
    try {
      const res = await fetch("/api/sites/blocks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: site.workspace_id,
          page_title: page.title,
          block_type: block.type,
          hint,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setBlocks((prev) =>
        prev.map((b, i) =>
          i === idx
            ? ({
                ...b,
                props: j.props,
                ai_drafted_at: j.ai_drafted_at,
              } as Block)
            : b
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to draft");
    }
  }

  return (
    <div className="rounded-2xl border border-accent-100 bg-white">
      <div className="border-b border-accent-100 p-4 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          /site/{site.slug}/{page.slug}
        </span>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>

      {view === "design" && <DesignPanel site={site} />}

      {view === "preview" && (
        <div className="p-8 max-h-[70vh] overflow-y-auto">
          <PagePreview blocks={blocks} site={site} />
        </div>
      )}

      {view === "edit" && (
        <div className="p-5 space-y-3">
          {blocks.length === 0 && (
            <div className="rounded-xl border border-dashed border-accent-100 p-8 text-center text-sm text-ink-muted">
              No blocks yet. Add one below to start.
            </div>
          )}

          {blocks.map((block, idx) => (
            <BlockCard
              key={block.id}
              block={block}
              idx={idx}
              total={blocks.length}
              onMove={moveBlock}
              onRemove={removeBlock}
              onChangeProps={(p) => updateBlockProps(idx, p)}
              onAiDraft={(hint) => aiDraftBlock(idx, hint)}
              workspaceId={site.workspace_id}
              siteId={site.id}
            />
          ))}

          <AddBlockMenu onAdd={addBlock} />

          <div className="flex items-center justify-between pt-3 border-t border-accent-100">
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
      )}
    </div>
  );
}

function ViewToggle({
  view,
  setView,
}: {
  view: "edit" | "preview" | "design";
  setView: (v: "edit" | "preview" | "design") => void;
}) {
  const items: { v: "edit" | "preview" | "design"; icon: React.ReactNode; label: string }[] = [
    { v: "edit", icon: <Edit3 className="h-3.5 w-3.5" />, label: "Edit" },
    { v: "preview", icon: <Eye className="h-3.5 w-3.5" />, label: "Preview" },
    {
      v: "design",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: "Design",
    },
  ];
  return (
    <>
      {items.map((it) => (
        <button
          key={it.v}
          type="button"
          onClick={() => setView(it.v)}
          className={
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs " +
            (view === it.v
              ? "bg-accent text-white"
              : "border border-accent-100 text-ink hover:bg-accent-50")
          }
        >
          {it.icon} {it.label}
        </button>
      ))}
    </>
  );
}

// ---------------------- Design panel (theme + colors) ---------------------

function DesignPanel({ site }: { site: Site }) {
  const [themeKey, setThemeKey] = useState(site.theme_key);
  const [primary, setPrimary] = useState(site.primary_color ?? "#1F3A8A");
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("site_id", site.id);
    fd.set("theme_key", themeKey);
    fd.set("primary_color", primary);
    startTransition(async () => {
      await updateSiteSettingsAction(fd);
    });
  }

  const dirty = themeKey !== site.theme_key || primary !== (site.primary_color ?? "#1F3A8A");

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-sm font-medium text-ink mb-2">Theme</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SITE_THEMES.map((t) => (
            <ThemeCard
              key={t.key}
              theme={t}
              selected={t.key === themeKey}
              onSelect={() => {
                setThemeKey(t.key);
                setPrimary(t.primary);
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          Primary color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-10 w-14 rounded-md border border-accent-100"
          />
          <Input
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="max-w-[200px]"
          />
          <p className="text-xs text-ink-muted">
            Overrides the theme&rsquo;s default accent.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-accent-100">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save design"}
        </Button>
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: SiteTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "rounded-xl border p-4 text-left transition-all " +
        (selected
          ? "border-accent ring-2 ring-accent-100"
          : "border-accent-100 hover:border-accent-400")
      }
    >
      <div
        className="h-16 rounded-md mb-3 flex items-end p-2"
        style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}
      >
        <span
          className="px-2 py-1 text-[11px]"
          style={{
            backgroundColor: theme.primary,
            color: theme.primaryText,
            borderRadius:
              theme.buttonStyle === "pill"
                ? 9999
                : theme.buttonStyle === "square"
                ? 0
                : 6,
          }}
        >
          Button
        </span>
      </div>
      <p className="text-sm font-semibold text-ink">{theme.name}</p>
      <p className="text-xs text-ink-muted mt-0.5">{theme.description}</p>
    </button>
  );
}

// ---------------------- Block cards ---------------------------------------

function BlockCard({
  block,
  idx,
  total,
  onMove,
  onRemove,
  onChangeProps,
  onAiDraft,
  workspaceId,
  siteId,
}: {
  block: Block;
  idx: number;
  total: number;
  onMove: (idx: number, dir: -1 | 1) => void;
  onRemove: (idx: number) => void;
  onChangeProps: (props: Block["props"]) => void;
  onAiDraft: (hint?: string) => void;
  workspaceId: string;
  siteId: string;
}) {
  return (
    <div className="rounded-xl border border-accent-100 bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-accent-100 bg-canvas rounded-t-xl">
        <p className="text-xs uppercase tracking-wider text-accent font-semibold">
          {block.type.replace("_", " ")}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => onMove(idx, -1)}
            className="rounded-md p-1 text-ink-muted hover:bg-accent-50 disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={idx === total - 1}
            onClick={() => onMove(idx, 1)}
            className="rounded-md p-1 text-ink-muted hover:bg-accent-50 disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAiDraft()}
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-accent-100 px-2 py-1 text-[11px] text-accent hover:bg-accent-50"
            title="Have Cofoundr draft this block"
          >
            <Sparkles className="h-3 w-3" /> Draft
          </button>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="rounded-md p-1 text-red-600 hover:bg-red-50"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        {block.type === "hero" && (
          <HeroEditor
            props={block.props}
            onChange={(p) => onChangeProps(p)}
            workspaceId={workspaceId}
            siteId={siteId}
          />
        )}
        {block.type === "rich_text" && (
          <RichTextEditor props={block.props} onChange={(p) => onChangeProps(p)} />
        )}
        {block.type === "features" && (
          <FeaturesEditor props={block.props} onChange={(p) => onChangeProps(p)} />
        )}
        {block.type === "cta" && (
          <CtaEditor props={block.props} onChange={(p) => onChangeProps(p)} />
        )}
        {block.type === "gallery" && (
          <GalleryEditor
            props={block.props}
            onChange={(p) => onChangeProps(p)}
            workspaceId={workspaceId}
            siteId={siteId}
          />
        )}
        {block.type === "testimonials" && (
          <TestimonialsEditor props={block.props} onChange={(p) => onChangeProps(p)} />
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-ink mb-1">{children}</label>;
}

function HeroEditor({
  props,
  onChange,
  workspaceId,
  siteId,
}: {
  props: Extract<Block, { type: "hero" }>["props"];
  onChange: (p: Extract<Block, { type: "hero" }>["props"]) => void;
  workspaceId: string;
  siteId: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <FieldLabel>Eyebrow</FieldLabel>
        <Input
          value={props.eyebrow ?? ""}
          onChange={(e) => onChange({ ...props, eyebrow: e.target.value })}
          maxLength={60}
        />
      </div>
      <div>
        <FieldLabel>Primary CTA text</FieldLabel>
        <Input
          value={props.ctaPrimaryText ?? ""}
          onChange={(e) => onChange({ ...props, ctaPrimaryText: e.target.value })}
          maxLength={40}
        />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Headline</FieldLabel>
        <Input
          value={props.headline}
          onChange={(e) => onChange({ ...props, headline: e.target.value })}
          maxLength={160}
        />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Subhead</FieldLabel>
        <textarea
          value={props.subhead ?? ""}
          onChange={(e) => onChange({ ...props, subhead: e.target.value })}
          rows={2}
          maxLength={400}
          className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Hero image</FieldLabel>
        <ImageUploader
          currentUrl={props.imageUrl}
          onUploaded={(url) => onChange({ ...props, imageUrl: url })}
          workspaceId={workspaceId}
          siteId={siteId}
        />
      </div>
    </div>
  );
}

function RichTextEditor({
  props,
  onChange,
}: {
  props: Extract<Block, { type: "rich_text" }>["props"];
  onChange: (p: Extract<Block, { type: "rich_text" }>["props"]) => void;
}) {
  return (
    <div>
      <FieldLabel>Markdown</FieldLabel>
      <textarea
        value={props.markdown}
        onChange={(e) => onChange({ ...props, markdown: e.target.value })}
        rows={8}
        maxLength={10_000}
        className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      />
    </div>
  );
}

function FeaturesEditor({
  props,
  onChange,
}: {
  props: Extract<Block, { type: "features" }>["props"];
  onChange: (p: Extract<Block, { type: "features" }>["props"]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Title</FieldLabel>
        <Input
          value={props.title ?? ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          maxLength={120}
        />
      </div>
      <div>
        <FieldLabel>Intro</FieldLabel>
        <Input
          value={props.intro ?? ""}
          onChange={(e) => onChange({ ...props, intro: e.target.value })}
          maxLength={400}
        />
      </div>
      {props.items.map((it, i) => (
        <div key={i} className="rounded-lg border border-accent-100 p-3 space-y-2">
          <Input
            value={it.title}
            onChange={(e) => {
              const items = [...props.items];
              items[i] = { ...items[i]!, title: e.target.value };
              onChange({ ...props, items });
            }}
            maxLength={80}
            placeholder="Feature title"
          />
          <textarea
            value={it.description}
            onChange={(e) => {
              const items = [...props.items];
              items[i] = { ...items[i]!, description: e.target.value };
              onChange({ ...props, items });
            }}
            rows={2}
            maxLength={400}
            placeholder="Feature description"
            className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          />
        </div>
      ))}
    </div>
  );
}

function CtaEditor({
  props,
  onChange,
}: {
  props: Extract<Block, { type: "cta" }>["props"];
  onChange: (p: Extract<Block, { type: "cta" }>["props"]) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <FieldLabel>Headline</FieldLabel>
        <Input
          value={props.headline}
          onChange={(e) => onChange({ ...props, headline: e.target.value })}
          maxLength={140}
        />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Body</FieldLabel>
        <textarea
          value={props.body ?? ""}
          onChange={(e) => onChange({ ...props, body: e.target.value })}
          rows={2}
          maxLength={400}
          className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        />
      </div>
      <div>
        <FieldLabel>Button text</FieldLabel>
        <Input
          value={props.ctaText}
          onChange={(e) => onChange({ ...props, ctaText: e.target.value })}
          maxLength={40}
        />
      </div>
      <div>
        <FieldLabel>Button URL</FieldLabel>
        <Input
          value={props.ctaHref}
          onChange={(e) => onChange({ ...props, ctaHref: e.target.value })}
          maxLength={500}
          placeholder="mailto:hello@ or https://..."
        />
      </div>
    </div>
  );
}

function GalleryEditor({
  props,
  onChange,
  workspaceId,
  siteId,
}: {
  props: Extract<Block, { type: "gallery" }>["props"];
  onChange: (p: Extract<Block, { type: "gallery" }>["props"]) => void;
  workspaceId: string;
  siteId: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Title</FieldLabel>
        <Input
          value={props.title ?? ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          maxLength={120}
        />
      </div>
      <ImageUploader
        currentUrl=""
        onUploaded={(url) =>
          onChange({ ...props, images: [...props.images, { url, alt: "" }] })
        }
        workspaceId={workspaceId}
        siteId={siteId}
        label="Add image"
      />
      <div className="grid grid-cols-3 gap-2">
        {props.images.map((img, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt ?? ""} className="w-full aspect-square object-cover rounded-md border border-accent-100" />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...props,
                  images: props.images.filter((_, j) => j !== i),
                })
              }
              className="absolute top-1 right-1 rounded-md bg-white/90 border border-accent-100 p-1 hover:bg-red-50"
              aria-label="Remove"
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsEditor({
  props,
  onChange,
}: {
  props: Extract<Block, { type: "testimonials" }>["props"];
  onChange: (p: Extract<Block, { type: "testimonials" }>["props"]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Title</FieldLabel>
        <Input
          value={props.title ?? ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          maxLength={120}
        />
      </div>
      {props.items.map((it, i) => (
        <div key={i} className="rounded-lg border border-accent-100 p-3 space-y-2">
          <textarea
            value={it.quote}
            onChange={(e) => {
              const items = [...props.items];
              items[i] = { ...items[i]!, quote: e.target.value };
              onChange({ ...props, items });
            }}
            rows={3}
            maxLength={600}
            placeholder="Quote"
            className="w-full rounded-lg border border-accent-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={it.author}
              onChange={(e) => {
                const items = [...props.items];
                items[i] = { ...items[i]!, author: e.target.value };
                onChange({ ...props, items });
              }}
              placeholder="Author"
            />
            <Input
              value={it.role ?? ""}
              onChange={(e) => {
                const items = [...props.items];
                items[i] = { ...items[i]!, role: e.target.value };
                onChange({ ...props, items });
              }}
              placeholder="Role / Company"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageUploader({
  currentUrl,
  onUploaded,
  workspaceId,
  siteId,
  label,
}: {
  currentUrl: string | undefined;
  onUploaded: (url: string) => void;
  workspaceId: string;
  siteId: string;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(
        `/api/sites/upload-image?workspace_id=${workspaceId}&site_id=${siteId}`,
        { method: "POST", body: fd }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      onUploaded(j.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {currentUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={currentUrl}
          alt=""
          className="h-16 w-24 object-cover rounded-md border border-accent-100"
        />
      )}
      <label className="inline-flex items-center gap-1 rounded-md border border-accent-100 px-3 py-1.5 text-xs text-ink hover:bg-accent-50 cursor-pointer">
        <ImageIcon className="h-3.5 w-3.5" />
        {uploading ? "Uploading…" : label ?? (currentUrl ? "Replace" : "Upload image")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AddBlockMenu({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const choices: { type: BlockType; label: string }[] = [
    { type: "hero", label: "Hero" },
    { type: "features", label: "Features (3-up)" },
    { type: "rich_text", label: "Rich text" },
    { type: "cta", label: "Call to action" },
    { type: "gallery", label: "Gallery" },
    { type: "testimonials", label: "Testimonials" },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-accent bg-accent-50 py-3 text-sm text-accent hover:bg-accent-100"
      >
        <Plus className="h-4 w-4" /> Add block
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-accent-100 bg-white shadow-lg p-2">
          {choices.map((c) => (
            <button
              key={c.type}
              type="button"
              onClick={() => {
                onAdd(c.type);
                setOpen(false);
              }}
              className="block w-full text-left rounded-md px-3 py-2 text-sm text-ink hover:bg-accent-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------- Inline preview rendering --------------------------
// Tiny preview that mimics the public renderer; full styling lives in the
// public site shell. This is just for the editor's Preview tab.

function PagePreview({ blocks, site }: { blocks: Block[]; site: Site }) {
  const accent = site.primary_color ?? "#1F3A8A";
  return (
    <div className="space-y-8">
      {blocks.map((b) => {
        if (b.type === "hero") {
          return (
            <section key={b.id} className="text-center space-y-3">
              {b.props.eyebrow && (
                <p className="text-xs uppercase tracking-wider" style={{ color: accent }}>
                  {b.props.eyebrow}
                </p>
              )}
              <h1 className="text-3xl font-semibold">{b.props.headline}</h1>
              {b.props.subhead && (
                <p className="text-base text-ink-muted max-w-xl mx-auto">{b.props.subhead}</p>
              )}
              {b.props.ctaPrimaryText && (
                <a
                  href={b.props.ctaPrimaryHref ?? "#"}
                  className="inline-block px-4 py-2 rounded-md text-white text-sm"
                  style={{ backgroundColor: accent }}
                >
                  {b.props.ctaPrimaryText}
                </a>
              )}
              {b.props.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={b.props.imageUrl}
                  alt=""
                  className="mx-auto max-h-64 rounded-lg object-contain"
                />
              )}
            </section>
          );
        }
        if (b.type === "rich_text") {
          return (
            <section key={b.id}>
              <ChatMarkdown>{b.props.markdown}</ChatMarkdown>
            </section>
          );
        }
        if (b.type === "features") {
          return (
            <section key={b.id} className="space-y-4">
              {b.props.title && (
                <h2 className="text-2xl font-semibold text-center">{b.props.title}</h2>
              )}
              {b.props.intro && (
                <p className="text-center text-ink-muted">{b.props.intro}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {b.props.items.map((it, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <h3 className="font-semibold mb-1" style={{ color: accent }}>
                      {it.title}
                    </h3>
                    <p className="text-sm text-ink-muted">{it.description}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (b.type === "cta") {
          return (
            <section
              key={b.id}
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: accent + "10" }}
            >
              <h2 className="text-2xl font-semibold mb-2">{b.props.headline}</h2>
              {b.props.body && <p className="text-ink-muted mb-4">{b.props.body}</p>}
              <a
                href={b.props.ctaHref}
                className="inline-block px-4 py-2 rounded-md text-white text-sm"
                style={{ backgroundColor: accent }}
              >
                {b.props.ctaText}
              </a>
            </section>
          );
        }
        if (b.type === "gallery") {
          return (
            <section key={b.id} className="space-y-3">
              {b.props.title && <h2 className="text-2xl font-semibold">{b.props.title}</h2>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {b.props.images.map((img, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={img.url}
                    alt={img.alt ?? ""}
                    className="aspect-square object-cover rounded-lg"
                  />
                ))}
              </div>
            </section>
          );
        }
        if (b.type === "testimonials") {
          return (
            <section key={b.id} className="space-y-4">
              {b.props.title && <h2 className="text-2xl font-semibold">{b.props.title}</h2>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {b.props.items.map((it, i) => (
                  <blockquote
                    key={i}
                    className="rounded-xl border p-4 text-sm italic text-ink-muted"
                  >
                    &ldquo;{it.quote}&rdquo;
                    <footer className="mt-2 text-xs not-italic text-ink">
                      {it.author}
                      {it.role && <span className="text-ink-muted"> · {it.role}</span>}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          );
        }
        return null;
      })}
    </div>
  );
}
