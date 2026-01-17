import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

import type { Pluggable } from "unified";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * Sanitization schema that allows necessary HTML while blocking dangerous elements.
 * Extends the default schema to support KaTeX math rendering.
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow className for KaTeX rendering
    div: [...(defaultSchema.attributes?.div ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    // Allow math-specific attributes
    annotation: ["encoding"],
    semantics: [],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // MathML elements for KaTeX
    "math",
    "semantics",
    "mrow",
    "mi",
    "mo",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "annotation",
  ],
} as const;

/**
 * Remark plugins for markdown processing.
 * Order: GFM → Math
 */
export const remarkPlugins: Pluggable[] = [remarkGfm, remarkMath];

/**
 * Rehype plugins for HTML processing.
 * Order: Raw HTML → Sanitization → KaTeX rendering
 */
export const rehypePlugins: Pluggable[] = [
  rehypeRaw,
  [rehypeSanitize, markdownSanitizeSchema],
  rehypeKatex,
];
