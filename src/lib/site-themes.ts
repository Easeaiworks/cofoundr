/**
 * Cofoundr site themes — 5 presets that wrap a site's blocks in a coherent
 * visual system. Each theme is defined as a token bag we can interpolate
 * into Tailwind classes and inline styles in the public renderer.
 *
 * Themes do NOT touch the editor — they only style the rendered public site.
 * Users override primary/secondary color per-site via the editor.
 */

export type SiteTheme = {
  key: string;
  name: string;
  description: string;
  // Colors (hex) — these become defaults; user can override `primary` per-site.
  bg: string;
  text: string;
  muted: string;
  primary: string;        // accent
  primaryText: string;    // text on primary
  border: string;
  // Typography — uses Google Fonts loaded by the public renderer.
  headingFont: string;    // e.g. "Inter", "Playfair Display"
  bodyFont: string;
  // Visual rhythm
  radius: "none" | "md" | "lg" | "xl" | "full";
  buttonStyle: "rounded" | "pill" | "square";
  // Hero treatment
  heroLayout: "centered" | "split" | "imageRight";
};

export const SITE_THEMES: SiteTheme[] = [
  {
    key: "cofoundr-classic",
    name: "Classic",
    description: "Cofoundr's house style — confident indigo on a clean canvas.",
    bg: "#FFFFFF",
    text: "#0B1220",
    muted: "#6B7280",
    primary: "#1F3A8A",
    primaryText: "#FFFFFF",
    border: "#DCE7F7",
    headingFont: "Inter",
    bodyFont: "Inter",
    radius: "lg",
    buttonStyle: "rounded",
    heroLayout: "centered",
  },
  {
    key: "warm-artisan",
    name: "Warm Artisan",
    description: "Cream + terracotta. For makers, candle shops, bakeries, boutique services.",
    bg: "#FBF7EF",
    text: "#2A1810",
    muted: "#7E695B",
    primary: "#C44536",
    primaryText: "#FFFFFF",
    border: "#E8DDC8",
    headingFont: "Playfair Display",
    bodyFont: "Source Sans 3",
    radius: "md",
    buttonStyle: "pill",
    heroLayout: "split",
  },
  {
    key: "modern-tech",
    name: "Modern Tech",
    description: "Deep navy + electric cyan. SaaS, agencies, B2B.",
    bg: "#0A0F1E",
    text: "#E8EEF7",
    muted: "#8B95A8",
    primary: "#22D3EE",
    primaryText: "#0A0F1E",
    border: "#1B2540",
    headingFont: "Inter",
    bodyFont: "Inter",
    radius: "md",
    buttonStyle: "rounded",
    heroLayout: "imageRight",
  },
  {
    key: "natural-green",
    name: "Natural & Green",
    description: "Sage + warm earth. Wellness, sustainability, nature-adjacent brands.",
    bg: "#F4F1E8",
    text: "#1F2D1F",
    muted: "#6E7A6E",
    primary: "#3D6647",
    primaryText: "#FFFFFF",
    border: "#D7DDC9",
    headingFont: "Lora",
    bodyFont: "Lora",
    radius: "lg",
    buttonStyle: "rounded",
    heroLayout: "centered",
  },
  {
    key: "bold-statement",
    name: "Bold Statement",
    description: "Black + neon yellow. For brands that want to be unmissable.",
    bg: "#0B0B0B",
    text: "#F5F5F5",
    muted: "#A0A0A0",
    primary: "#D4FF00",
    primaryText: "#0B0B0B",
    border: "#262626",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    radius: "none",
    buttonStyle: "square",
    heroLayout: "split",
  },
];

export function getTheme(key: string | null | undefined): SiteTheme {
  return SITE_THEMES.find((t) => t.key === key) ?? SITE_THEMES[0]!;
}

/** Build a Google Fonts URL covering all the fonts referenced by the themes. */
export function googleFontsHref(): string {
  const families = new Set<string>();
  for (const t of SITE_THEMES) {
    families.add(t.headingFont);
    families.add(t.bodyFont);
  }
  const list = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${list}&display=swap`;
}
