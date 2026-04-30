import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatMarkdown } from "@/components/markdown";

export default async function PublicSiteSubPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page: pageSlug } = await params;
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
  const page = allPages.find((p) => p.slug === pageSlug);
  if (!page) notFound();

  const accent = s.primary_color ?? "#1F3A8A";

  return (
    <main className="min-h-screen bg-white text-[#0B1220]">
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <a
            href={`/site/${s.slug}`}
            className="font-semibold text-lg"
            style={{ color: accent }}
          >
            {s.name}
          </a>
          <nav className="flex gap-4 text-sm">
            {allPages.map((p) => (
              <a
                key={p.slug}
                href={p.is_home ? `/site/${s.slug}` : `/site/${s.slug}/${p.slug}`}
                className={
                  p.slug === page.slug
                    ? "font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }
                style={p.slug === page.slug ? { color: accent } : undefined}
              >
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-4 py-12">
        <ChatMarkdown>{page.content_md}</ChatMarkdown>
      </article>
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-xs text-gray-500 flex items-center justify-between">
          <p>&copy; {new Date().getFullYear()} {s.name}</p>
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
