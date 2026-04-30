import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatMarkdown } from "@/components/markdown";

export default async function PublicSiteHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, slug, name, tagline, primary_color, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!site) notFound();
  type Site = {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    primary_color: string | null;
    published: boolean;
  };
  const s = site as Site;

  const { data: pages } = await supabase
    .from("site_pages")
    .select("id, slug, title, content_md, is_home, position")
    .eq("site_id", s.id)
    .order("position", { ascending: true });

  type Page = {
    id: string;
    slug: string;
    title: string;
    content_md: string;
    is_home: boolean;
  };
  const allPages = (pages as Page[] | null) ?? [];
  const home = allPages.find((p) => p.is_home) ?? allPages[0];
  if (!home) notFound();

  return (
    <PublicSiteShell site={s} pages={allPages} active={home.slug} body={home.content_md} title={home.title} />
  );
}

function PublicSiteShell({
  site,
  pages,
  active,
  body,
  title,
}: {
  site: { slug: string; name: string; tagline: string | null; primary_color: string | null };
  pages: { slug: string; title: string; is_home: boolean }[];
  active: string;
  body: string;
  title: string;
}) {
  const accent = site.primary_color ?? "#1F3A8A";
  return (
    <main className="min-h-screen bg-white text-[#0B1220]">
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <a href={`/site/${site.slug}`} className="font-semibold text-lg" style={{ color: accent }}>
            {site.name}
          </a>
          <nav className="flex gap-4 text-sm">
            {pages.map((p) => (
              <a
                key={p.slug}
                href={p.is_home ? `/site/${site.slug}` : `/site/${site.slug}/${p.slug}`}
                className={
                  p.slug === active
                    ? "font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }
                style={p.slug === active ? { color: accent } : undefined}
              >
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-4 py-12">
        <ChatMarkdown>{body}</ChatMarkdown>
      </article>
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-gray-500 flex items-center justify-between">
          <p>&copy; {new Date().getFullYear()} {site.name}</p>
          <p>
            Built with{" "}
            <a
              href="https://cofoundr.ca"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent }}
              className="underline"
            >
              Cofoundr
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
