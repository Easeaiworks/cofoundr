import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FileImage, Scale, FileCheck, Download, Trash2, Plus, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspace";
import { readActiveWorkspaceCookie } from "@/lib/active-workspace";
import { deleteDocumentAction } from "./actions";

const KIND_LABELS: Record<string, { label: string; icon: typeof FileText }> = {
  plan: { label: "Business plans", icon: FileCheck },
  legal: { label: "Legal documents", icon: Scale },
  nda: { label: "Legal documents", icon: Scale },
  contractor: { label: "Legal documents", icon: Scale },
  tos: { label: "Legal documents", icon: Scale },
  privacy: { label: "Legal documents", icon: Scale },
  logo: { label: "Branding", icon: FileImage },
  brand: { label: "Branding", icon: FileImage },
  other: { label: "Other", icon: FileText },
};

function groupKey(kind: string): string {
  if (["nda", "contractor", "tos", "privacy", "legal"].includes(kind)) return "legal";
  if (["logo", "brand"].includes(kind)) return "logo";
  if (kind === "plan") return "plan";
  return "other";
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  const activeSlug = (await readActiveWorkspaceCookie()) ?? workspaces[0]!.slug;
  const ws = workspaces.find((w) => w.slug === activeSlug) ?? workspaces[0]!;

  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, kind, storage_path, content_md, created_at")
    .eq("workspace_id", ws.id)
    .order("created_at", { ascending: false });

  type DocRow = {
    id: string;
    title: string;
    kind: string;
    storage_path: string | null;
    content_md: string | null;
    created_at: string;
  };
  const documents = (docs as DocRow[] | null) ?? [];

  const grouped = documents.reduce<Record<string, DocRow[]>>((acc, d) => {
    const k = groupKey(d.kind);
    (acc[k] = acc[k] ?? []).push(d);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-accent-100 bg-white">
        <div className="container max-w-5xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <span className="text-ink-muted">/</span>
            <h1 className="text-lg font-semibold text-ink">Document Vault</h1>
          </div>
          <p className="text-xs text-ink-muted">{ws.name}</p>
        </div>
      </header>

      <section className="container max-w-5xl py-8 space-y-8">
        {documents.length === 0 ? (
          <EmptyState />
        ) : (
          (["plan", "legal", "logo", "other"] as const).map((g) => {
            const items = grouped[g] ?? [];
            if (items.length === 0) return null;
            const meta = KIND_LABELS[g] ?? KIND_LABELS.other!;
            const Icon = meta.icon;
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-ink-muted">({items.length})</span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((d) => (
                    <DocumentCard key={d.id} doc={d} />
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

function DocumentCard({
  doc,
}: {
  doc: {
    id: string;
    title: string;
    kind: string;
    storage_path: string | null;
    content_md: string | null;
    created_at: string;
  };
}) {
  const date = new Date(doc.created_at).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <li className="rounded-2xl border border-accent-100 bg-white p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{doc.title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{date}</p>
        {doc.content_md && (
          <p className="mt-2 text-xs text-ink-muted line-clamp-2">
            {doc.content_md.replace(/[#*_>\-]/g, "").slice(0, 160)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {doc.content_md && (
          <Link
            href={`/api/documents/${doc.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-md border border-accent-100 px-2.5 py-1.5 text-xs text-ink hover:bg-accent-50"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Link>
        )}
        <form action={deleteDocumentAction}>
          <input type="hidden" name="id" value={doc.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md border border-accent-100 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-accent-100 bg-white p-10 text-center">
      <FileText className="h-8 w-8 mx-auto text-accent-400" />
      <h3 className="mt-3 text-base font-semibold text-ink">No documents yet</h3>
      <p className="mt-1 text-sm text-ink-muted max-w-md mx-auto">
        Documents you generate with Cofoundr — business plans, NDAs, contractor
        agreements, branding kits — will appear here. Each one can be downloaded
        as a polished PDF.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-accent text-white px-4 py-2 text-sm hover:bg-accent-400"
      >
        <Plus className="h-4 w-4" />
        Generate one in chat
      </Link>
    </div>
  );
}
