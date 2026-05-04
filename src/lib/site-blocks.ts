/**
 * Block schemas for Cofoundr-hosted sites.
 *
 * A page is an ordered array of blocks. Each block has a stable id, a type
 * tag, and a typed `props` object. When we render publicly we look up the
 * renderer for the type and pass props in.
 *
 * Adding a new block type = (1) add to BlockType union + props, (2) add a
 * default in defaultBlock(), (3) add a renderer in PublicSiteShell, (4) add
 * an editor card in the editor.
 */
import { z } from "zod";

export const BlockTypes = [
  "hero",
  "rich_text",
  "features",
  "cta",
  "gallery",
  "testimonials",
] as const;
export type BlockType = (typeof BlockTypes)[number];

// ----- Per-block prop schemas (Zod) ----------------------------------------

export const HeroPropsSchema = z.object({
  eyebrow: z.string().max(60).optional(),
  headline: z.string().min(1).max(160),
  subhead: z.string().max(400).optional(),
  ctaPrimaryText: z.string().max(40).optional(),
  ctaPrimaryHref: z.string().max(500).optional(),
  ctaSecondaryText: z.string().max(40).optional(),
  ctaSecondaryHref: z.string().max(500).optional(),
  imageUrl: z.string().max(800).optional(),
  // Visual variants
  layout: z.enum(["centered", "splitRight", "imageBg"]).default("centered"),
  bgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  overlayDarkness: z.number().min(0).max(100).default(35).optional(),
});

export const RichTextPropsSchema = z.object({
  markdown: z.string().max(10_000),
});

export const FeaturesPropsSchema = z.object({
  title: z.string().max(120).optional(),
  intro: z.string().max(400).optional(),
  items: z
    .array(
      z.object({
        title: z.string().max(80),
        description: z.string().max(400),
      })
    )
    .max(8),
  // Visual variants
  layout: z.enum(["cards", "compact", "iconList"]).default("cards"),
  bgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const CtaPropsSchema = z.object({
  headline: z.string().max(140),
  body: z.string().max(400).optional(),
  ctaText: z.string().max(40),
  ctaHref: z.string().max(500),
  // Visual variants
  variant: z.enum(["soft", "bold", "imageBg"]).default("soft"),
  bgImageUrl: z.string().max(800).optional(),
});

export const GalleryPropsSchema = z.object({
  title: z.string().max(120).optional(),
  images: z
    .array(
      z.object({
        url: z.string().max(800),
        alt: z.string().max(160).optional(),
      })
    )
    .max(12),
});

export const TestimonialsPropsSchema = z.object({
  title: z.string().max(120).optional(),
  items: z
    .array(
      z.object({
        quote: z.string().max(600),
        author: z.string().max(80),
        role: z.string().max(80).optional(),
      })
    )
    .max(6),
});

// ----- Discriminated union of all block schemas ----------------------------

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("hero"),
    props: HeroPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("rich_text"),
    props: RichTextPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("features"),
    props: FeaturesPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("cta"),
    props: CtaPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("gallery"),
    props: GalleryPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("testimonials"),
    props: TestimonialsPropsSchema,
    ai_drafted_at: z.string().optional().nullable(),
  }),
]);

export type Block = z.infer<typeof BlockSchema>;

export const PageBlocksSchema = z.array(BlockSchema);

// ----- Defaults for new blocks ---------------------------------------------

export function defaultBlock(type: BlockType, brandName: string): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        props: {
          eyebrow: "Welcome",
          headline: brandName,
          subhead: "A short, punchy line about what you do for whom.",
          ctaPrimaryText: "Get started",
          ctaPrimaryHref: "#contact",
          imageUrl: "",
        },
      };
    case "rich_text":
      return {
        id,
        type: "rich_text",
        props: {
          markdown: "## A section heading\n\nSome paragraph text. **Bold** and *italic* work.",
        },
      };
    case "features":
      return {
        id,
        type: "features",
        props: {
          title: "What we do",
          intro: "A short intro to your three best features or services.",
          items: [
            { title: "Feature one", description: "What it is, why it matters." },
            { title: "Feature two", description: "What it is, why it matters." },
            { title: "Feature three", description: "What it is, why it matters." },
          ],
        },
      };
    case "cta":
      return {
        id,
        type: "cta",
        props: {
          headline: "Ready to get started?",
          body: "A line that nudges them across the line.",
          ctaText: "Book a call",
          ctaHref: "mailto:hello@example.com",
        },
      };
    case "gallery":
      return {
        id,
        type: "gallery",
        props: { title: "Gallery", images: [] },
      };
    case "testimonials":
      return {
        id,
        type: "testimonials",
        props: {
          title: "What people say",
          items: [
            {
              quote: "A quote from a happy customer goes here.",
              author: "First Last",
              role: "Title, Company",
            },
          ],
        },
      };
  }
}

export function defaultHomePageBlocks(brandName: string): Block[] {
  return [
    defaultBlock("hero", brandName),
    defaultBlock("features", brandName),
    defaultBlock("cta", brandName),
  ];
}
