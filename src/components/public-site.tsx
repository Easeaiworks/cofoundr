/**
 * Public site renderer — turns a site + page (block array) into the styled
 * marketing page that visitors see at /site/[slug] and /site/[slug]/[page].
 *
 * Pure server component. Theme tokens come from src/lib/site-themes.ts and
 * are applied as inline styles + a small set of class hooks. We don't rely
 * on Tailwind's color utilities since themes are dynamic per site.
 */
import Link from "next/link";
import { ChatMarkdown } from "@/components/markdown";
import { getTheme, googleFontsHref, type SiteTheme } from "@/lib/site-themes";
import type { Block } from "@/lib/site-blocks";

type Site = {
  slug: string;
  name: string;
  tagline: string | null;
  theme_key: string;
  primary_color: string | null;
  secondary_color: string | null;
};

type Page = {
  slug: string;
  title: string;
  is_home: boolean;
};

export function PublicSite({
  site,
  pages,
  active,
  blocks,
}: {
  site: Site;
  pages: Page[];
  active: string;
  blocks: Block[];
}) {
  const theme = getTheme(site.theme_key);
  const accent = site.primary_color ?? theme.primary;

  return (
    <>
      {/* Google Fonts for theme typography */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={googleFontsHref()} />

      <main
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          fontFamily: `${theme.bodyFont}, ui-sans-serif, system-ui, sans-serif`,
          minHeight: "100vh",
        }}
      >
        <Header site={site} pages={pages} active={active} theme={theme} accent={accent} />

        <article style={{ maxWidth: 980, margin: "0 auto", padding: "48px 16px" }}>
          {blocks.length === 0 ? (
            <p style={{ color: theme.muted }}>This page is empty.</p>
          ) : (
            blocks.map((b) => (
              <BlockRenderer key={b.id} block={b} theme={theme} accent={accent} />
            ))
          )}
        </article>

        <Footer site={site} theme={theme} accent={accent} />
      </main>
    </>
  );
}

// ---------------------- Header / Nav --------------------------------------

function Header({
  site,
  pages,
  active,
  theme,
  accent,
}: {
  site: Site;
  pages: Page[];
  active: string;
  theme: SiteTheme;
  accent: string;
}) {
  return (
    <header style={{ borderBottom: `1px solid ${theme.border}` }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href={`/site/${site.slug}`}
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontWeight: 700,
            fontSize: 20,
            color: accent,
            textDecoration: "none",
          }}
        >
          {site.name}
        </a>
        <nav style={{ display: "flex", gap: 18, fontSize: 14 }}>
          {pages.map((p) => {
            const isActive = p.slug === active;
            return (
              <Link
                key={p.slug}
                href={p.is_home ? `/site/${site.slug}` : `/site/${site.slug}/${p.slug}`}
                style={{
                  color: isActive ? accent : theme.muted,
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {p.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// ---------------------- Footer --------------------------------------------

function Footer({
  site,
  theme,
  accent,
}: {
  site: Site;
  theme: SiteTheme;
  accent: string;
}) {
  return (
    <footer style={{ borderTop: `1px solid ${theme.border}`, marginTop: 48 }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 16px",
          fontSize: 12,
          color: theme.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p>© {new Date().getFullYear()} {site.name}</p>
        <p>
          Built with{" "}
          <a
            href="https://cofoundr.ca"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: accent, textDecoration: "underline" }}
          >
            Cofoundr
          </a>
        </p>
      </div>
    </footer>
  );
}

// ---------------------- Block renderer ------------------------------------

function buttonStyle(theme: SiteTheme, accent: string, variant: "primary" | "ghost" = "primary") {
  const radius =
    theme.buttonStyle === "pill"
      ? 9999
      : theme.buttonStyle === "square"
      ? 0
      : 8;
  const base = {
    display: "inline-block",
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    borderRadius: radius,
    transition: "opacity 0.15s",
  } as const;
  if (variant === "primary") {
    return { ...base, backgroundColor: accent, color: theme.primaryText };
  }
  return {
    ...base,
    backgroundColor: "transparent",
    color: accent,
    border: `1px solid ${accent}`,
  };
}

function BlockRenderer({
  block,
  theme,
  accent,
}: {
  block: Block;
  theme: SiteTheme;
  accent: string;
}) {
  if (block.type === "hero") {
    return (
      <section
        style={{
          textAlign: theme.heroLayout === "centered" ? "center" : "left",
          padding: "48px 0 32px",
        }}
      >
        {block.props.eyebrow && (
          <p
            style={{
              color: accent,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {block.props.eyebrow}
          </p>
        )}
        <h1
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "0 0 12px",
          }}
        >
          {block.props.headline}
        </h1>
        {block.props.subhead && (
          <p
            style={{
              color: theme.muted,
              fontSize: 18,
              maxWidth: 620,
              margin: theme.heroLayout === "centered" ? "0 auto 18px" : "0 0 18px",
            }}
          >
            {block.props.subhead}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: theme.heroLayout === "centered" ? "center" : "flex-start",
          }}
        >
          {block.props.ctaPrimaryText && (
            <a href={block.props.ctaPrimaryHref ?? "#"} style={buttonStyle(theme, accent, "primary")}>
              {block.props.ctaPrimaryText}
            </a>
          )}
          {block.props.ctaSecondaryText && (
            <a href={block.props.ctaSecondaryHref ?? "#"} style={buttonStyle(theme, accent, "ghost")}>
              {block.props.ctaSecondaryText}
            </a>
          )}
        </div>
        {block.props.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={block.props.imageUrl}
            alt=""
            style={{
              marginTop: 32,
              maxWidth: "100%",
              borderRadius: 12,
              display: theme.heroLayout === "centered" ? "block" : "block",
              marginLeft: theme.heroLayout === "centered" ? "auto" : 0,
              marginRight: theme.heroLayout === "centered" ? "auto" : 0,
            }}
          />
        )}
      </section>
    );
  }

  if (block.type === "rich_text") {
    return (
      <section style={{ padding: "24px 0" }}>
        <ChatMarkdown>{block.props.markdown}</ChatMarkdown>
      </section>
    );
  }

  if (block.type === "features") {
    return (
      <section style={{ padding: "32px 0", textAlign: "center" }}>
        {block.props.title && (
          <h2
            style={{
              fontFamily: `${theme.headingFont}, serif`,
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            {block.props.title}
          </h2>
        )}
        {block.props.intro && (
          <p style={{ color: theme.muted, marginBottom: 24 }}>{block.props.intro}</p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            textAlign: "left",
          }}
        >
          {block.props.items.map((it, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              <h3
                style={{
                  fontFamily: `${theme.headingFont}, serif`,
                  fontSize: 16,
                  fontWeight: 700,
                  color: accent,
                  margin: "0 0 6px",
                }}
              >
                {it.title}
              </h3>
              <p style={{ color: theme.muted, fontSize: 14, margin: 0 }}>{it.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "cta") {
    return (
      <section
        style={{
          padding: "40px 24px",
          textAlign: "center",
          backgroundColor: `${accent}10`,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          margin: "32px 0",
        }}
      >
        <h2
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 12px",
          }}
        >
          {block.props.headline}
        </h2>
        {block.props.body && (
          <p style={{ color: theme.muted, marginBottom: 18 }}>{block.props.body}</p>
        )}
        <a href={block.props.ctaHref} style={buttonStyle(theme, accent, "primary")}>
          {block.props.ctaText}
        </a>
      </section>
    );
  }

  if (block.type === "gallery") {
    return (
      <section style={{ padding: "32px 0" }}>
        {block.props.title && (
          <h2
            style={{
              fontFamily: `${theme.headingFont}, serif`,
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            {block.props.title}
          </h2>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {block.props.images.map((img, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={i}
              src={img.url}
              alt={img.alt ?? ""}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                borderRadius: 10,
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "testimonials") {
    return (
      <section style={{ padding: "32px 0" }}>
        {block.props.title && (
          <h2
            style={{
              fontFamily: `${theme.headingFont}, serif`,
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 16px",
              textAlign: "center",
            }}
          >
            {block.props.title}
          </h2>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {block.props.items.map((t, i) => (
            <blockquote
              key={i}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 18,
                fontStyle: "italic",
                color: theme.text,
                margin: 0,
              }}
            >
              <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.6 }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer style={{ fontStyle: "normal", fontSize: 12, color: theme.muted }}>
                {t.author}
                {t.role && <span> · {t.role}</span>}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
