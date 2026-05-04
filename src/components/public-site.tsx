/**
 * Public site renderer — turns a site + page (block array) into the styled
 * marketing page that visitors see at /site/[slug] and /site/[slug]/[page].
 *
 * Pure server component. Theme tokens come from src/lib/site-themes.ts and
 * are applied as inline styles. Per-block visual variants (hero layouts, CTA
 * styles, features layouts, bg colors/images) live alongside the props.
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

        <div>
          {blocks.length === 0 ? (
            <p style={{ maxWidth: 980, margin: "48px auto", padding: "0 16px", color: theme.muted }}>
              This page is empty.
            </p>
          ) : (
            blocks.map((b) => (
              <BlockRenderer key={b.id} block={b} theme={theme} accent={accent} />
            ))
          )}
        </div>

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
    <header style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bg }}>
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
    <footer style={{ borderTop: `1px solid ${theme.border}`, marginTop: 48, backgroundColor: theme.bg }}>
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

// ---------------------- Helpers -------------------------------------------

function buttonStyle(
  theme: SiteTheme,
  accent: string,
  variant: "primary" | "ghost" | "onImage" = "primary"
) {
  const radius =
    theme.buttonStyle === "pill"
      ? 9999
      : theme.buttonStyle === "square"
      ? 0
      : 8;
  const base = {
    display: "inline-block",
    padding: "12px 22px",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    borderRadius: radius,
    transition: "opacity 0.15s",
  } as const;
  if (variant === "primary")
    return { ...base, backgroundColor: accent, color: theme.primaryText };
  if (variant === "onImage")
    return {
      ...base,
      backgroundColor: "#FFFFFF",
      color: "#0B1220",
      boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
    };
  return {
    ...base,
    backgroundColor: "transparent",
    color: accent,
    border: `1.5px solid ${accent}`,
  };
}

function sectionWrap(
  bgColor: string | undefined,
  fullBleed: boolean,
  children: React.ReactNode,
  pad: string = "64px 16px"
) {
  if (bgColor || fullBleed) {
    return (
      <section style={{ backgroundColor: bgColor }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: pad }}>{children}</div>
      </section>
    );
  }
  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: pad }}>{children}</section>
  );
}

// ---------------------- Block renderer ------------------------------------

function BlockRenderer({
  block,
  theme,
  accent,
}: {
  block: Block;
  theme: SiteTheme;
  accent: string;
}) {
  if (block.type === "hero") return <HeroBlock block={block} theme={theme} accent={accent} />;
  if (block.type === "rich_text") {
    return sectionWrap(undefined, false, <ChatMarkdown>{block.props.markdown}</ChatMarkdown>, "32px 16px");
  }
  if (block.type === "features") return <FeaturesBlock block={block} theme={theme} accent={accent} />;
  if (block.type === "cta") return <CtaBlock block={block} theme={theme} accent={accent} />;
  if (block.type === "gallery") return <GalleryBlock block={block} theme={theme} />;
  if (block.type === "testimonials") return <TestimonialsBlock block={block} theme={theme} />;
  return null;
}

// ---------------------- Hero ----------------------------------------------

function HeroBlock({
  block,
  theme,
  accent,
}: {
  block: Extract<Block, { type: "hero" }>;
  theme: SiteTheme;
  accent: string;
}) {
  const p = block.props;
  const layout = p.layout ?? theme.heroLayout ?? "centered";

  // ----- Full-bleed image background -----
  if (layout === "imageBg" && p.imageUrl) {
    const overlay = (p.overlayDarkness ?? 35) / 100;
    return (
      <section
        style={{
          position: "relative",
          backgroundImage: `url(${p.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            backgroundColor: `rgba(0,0,0,${overlay})`,
          }}
        >
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto",
              padding: "120px 16px",
              textAlign: "center",
            }}
          >
            {p.eyebrow && (
              <p
                style={{
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                  opacity: 0.9,
                }}
              >
                {p.eyebrow}
              </p>
            )}
            <h1
              style={{
                fontFamily: `${theme.headingFont}, serif`,
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 700,
                lineHeight: 1.05,
                margin: "0 0 18px",
              }}
            >
              {p.headline}
            </h1>
            {p.subhead && (
              <p
                style={{
                  fontSize: 19,
                  maxWidth: 680,
                  margin: "0 auto 28px",
                  opacity: 0.92,
                }}
              >
                {p.subhead}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {p.ctaPrimaryText && (
                <a href={p.ctaPrimaryHref ?? "#"} style={buttonStyle(theme, accent, "onImage")}>
                  {p.ctaPrimaryText}
                </a>
              )}
              {p.ctaSecondaryText && (
                <a
                  href={p.ctaSecondaryHref ?? "#"}
                  style={{
                    ...buttonStyle(theme, accent, "ghost"),
                    color: "#FFFFFF",
                    borderColor: "rgba(255,255,255,0.6)",
                  }}
                >
                  {p.ctaSecondaryText}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ----- Split: text left, image right -----
  if (layout === "splitRight") {
    return (
      <section style={{ backgroundColor: p.bgColor }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "72px 16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div>
            {p.eyebrow && (
              <p
                style={{
                  color: accent,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {p.eyebrow}
              </p>
            )}
            <h1
              style={{
                fontFamily: `${theme.headingFont}, serif`,
                fontSize: "clamp(32px, 4.5vw, 52px)",
                fontWeight: 700,
                lineHeight: 1.08,
                margin: "0 0 16px",
              }}
            >
              {p.headline}
            </h1>
            {p.subhead && (
              <p style={{ color: theme.muted, fontSize: 18, marginBottom: 24 }}>{p.subhead}</p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              {p.ctaPrimaryText && (
                <a href={p.ctaPrimaryHref ?? "#"} style={buttonStyle(theme, accent, "primary")}>
                  {p.ctaPrimaryText}
                </a>
              )}
              {p.ctaSecondaryText && (
                <a href={p.ctaSecondaryHref ?? "#"} style={buttonStyle(theme, accent, "ghost")}>
                  {p.ctaSecondaryText}
                </a>
              )}
            </div>
          </div>
          {p.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={p.imageUrl}
              alt=""
              style={{
                width: "100%",
                borderRadius: 16,
                aspectRatio: "4 / 3",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                borderRadius: 16,
                backgroundColor: `${accent}15`,
                border: `1px dashed ${accent}40`,
              }}
            />
          )}
        </div>
      </section>
    );
  }

  // ----- Centered (default) -----
  return (
    <section style={{ backgroundColor: p.bgColor }}>
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "80px 16px 64px",
          textAlign: "center",
        }}
      >
        {p.eyebrow && (
          <p
            style={{
              color: accent,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {p.eyebrow}
          </p>
        )}
        <h1
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: "clamp(34px, 5vw, 56px)",
            fontWeight: 700,
            lineHeight: 1.05,
            margin: "0 0 16px",
          }}
        >
          {p.headline}
        </h1>
        {p.subhead && (
          <p
            style={{
              color: theme.muted,
              fontSize: 19,
              maxWidth: 640,
              margin: "0 auto 28px",
            }}
          >
            {p.subhead}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {p.ctaPrimaryText && (
            <a href={p.ctaPrimaryHref ?? "#"} style={buttonStyle(theme, accent, "primary")}>
              {p.ctaPrimaryText}
            </a>
          )}
          {p.ctaSecondaryText && (
            <a href={p.ctaSecondaryHref ?? "#"} style={buttonStyle(theme, accent, "ghost")}>
              {p.ctaSecondaryText}
            </a>
          )}
        </div>
        {p.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={p.imageUrl}
            alt=""
            style={{
              marginTop: 40,
              maxWidth: "100%",
              borderRadius: 12,
              display: "block",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        )}
      </div>
    </section>
  );
}

// ---------------------- Features ------------------------------------------

function FeaturesBlock({
  block,
  theme,
  accent,
}: {
  block: Extract<Block, { type: "features" }>;
  theme: SiteTheme;
  accent: string;
}) {
  const p = block.props;
  const layout = p.layout ?? "cards";

  const header = (
    <>
      {p.title && (
        <h2
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: 32,
            fontWeight: 700,
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          {p.title}
        </h2>
      )}
      {p.intro && (
        <p
          style={{
            color: theme.muted,
            textAlign: "center",
            marginBottom: 32,
            maxWidth: 620,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {p.intro}
        </p>
      )}
    </>
  );

  const grid = (() => {
    if (layout === "compact") {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 32,
            textAlign: "left",
          }}
        >
          {p.items.map((it, i) => (
            <div key={i}>
              <h3
                style={{
                  fontFamily: `${theme.headingFont}, serif`,
                  fontSize: 18,
                  fontWeight: 700,
                  color: accent,
                  margin: "0 0 8px",
                }}
              >
                {it.title}
              </h3>
              <p style={{ color: theme.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {it.description}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (layout === "iconList") {
      return (
        <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 18 }}>
          {p.items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  backgroundColor: `${accent}15`,
                  color: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: `${theme.headingFont}, serif`,
                    fontSize: 17,
                    fontWeight: 700,
                    margin: "0 0 4px",
                  }}
                >
                  {it.title}
                </h3>
                <p style={{ color: theme.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  {it.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // cards (default)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          textAlign: "left",
        }}
      >
        {p.items.map((it, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 22,
              backgroundColor: theme.bg,
            }}
          >
            <h3
              style={{
                fontFamily: `${theme.headingFont}, serif`,
                fontSize: 18,
                fontWeight: 700,
                color: accent,
                margin: "0 0 8px",
              }}
            >
              {it.title}
            </h3>
            <p style={{ color: theme.muted, fontSize: 14, margin: 0, lineHeight: 1.55 }}>
              {it.description}
            </p>
          </div>
        ))}
      </div>
    );
  })();

  return sectionWrap(p.bgColor, false, <>{header}{grid}</>, "64px 16px");
}

// ---------------------- CTA -----------------------------------------------

function CtaBlock({
  block,
  theme,
  accent,
}: {
  block: Extract<Block, { type: "cta" }>;
  theme: SiteTheme;
  accent: string;
}) {
  const p = block.props;
  const variant = p.variant ?? "soft";

  if (variant === "imageBg" && p.bgImageUrl) {
    return (
      <section
        style={{
          backgroundImage: `url(${p.bgImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#FFFFFF",
        }}
      >
        <div style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div
            style={{
              maxWidth: 880,
              margin: "0 auto",
              padding: "88px 16px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: `${theme.headingFont}, serif`,
                fontSize: 34,
                fontWeight: 700,
                margin: "0 0 12px",
              }}
            >
              {p.headline}
            </h2>
            {p.body && <p style={{ marginBottom: 24, opacity: 0.9 }}>{p.body}</p>}
            <a href={p.ctaHref} style={buttonStyle(theme, accent, "onImage")}>
              {p.ctaText}
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "bold") {
    return (
      <section style={{ backgroundColor: accent, color: theme.primaryText }}>
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "72px 16px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: `${theme.headingFont}, serif`,
              fontSize: 32,
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            {p.headline}
          </h2>
          {p.body && <p style={{ marginBottom: 24, opacity: 0.9 }}>{p.body}</p>}
          <a
            href={p.ctaHref}
            style={{
              ...buttonStyle(theme, accent, "primary"),
              backgroundColor: "#FFFFFF",
              color: accent,
            }}
          >
            {p.ctaText}
          </a>
        </div>
      </section>
    );
  }

  // soft (default)
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "32px auto",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          backgroundColor: `${accent}10`,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
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
          {p.headline}
        </h2>
        {p.body && <p style={{ color: theme.muted, marginBottom: 18 }}>{p.body}</p>}
        <a href={p.ctaHref} style={buttonStyle(theme, accent, "primary")}>
          {p.ctaText}
        </a>
      </div>
    </section>
  );
}

// ---------------------- Gallery + Testimonials ----------------------------

function GalleryBlock({
  block,
  theme,
}: {
  block: Extract<Block, { type: "gallery" }>;
  theme: SiteTheme;
}) {
  const p = block.props;
  return sectionWrap(
    undefined,
    false,
    <>
      {p.title && (
        <h2
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 20px",
          }}
        >
          {p.title}
        </h2>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {p.images.map((img, i) => (
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
    </>,
    "48px 16px"
  );
}

function TestimonialsBlock({
  block,
  theme,
}: {
  block: Extract<Block, { type: "testimonials" }>;
  theme: SiteTheme;
}) {
  const p = block.props;
  return sectionWrap(
    undefined,
    false,
    <>
      {p.title && (
        <h2
          style={{
            fontFamily: `${theme.headingFont}, serif`,
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          {p.title}
        </h2>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {p.items.map((t, i) => (
          <blockquote
            key={i}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 22,
              fontStyle: "italic",
              color: theme.text,
              margin: 0,
              backgroundColor: theme.bg,
            }}
          >
            <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.6 }}>
              &ldquo;{t.quote}&rdquo;
            </p>
            <footer style={{ fontStyle: "normal", fontSize: 13, color: theme.muted }}>
              {t.author}
              {t.role && <span> · {t.role}</span>}
            </footer>
          </blockquote>
        ))}
      </div>
    </>,
    "48px 16px"
  );
}
