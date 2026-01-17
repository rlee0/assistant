import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

import type { Pluggable } from "unified";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

/**
 * Sanitization schema that allows necessary HTML while blocking dangerous elements.
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
} as const;

/**
 * Remark plugins for markdown processing.
 */
export const remarkPlugins: Pluggable[] = [remarkGfm];

/**
 * Rehype plugins for HTML processing.
 * Order: Raw HTML → Sanitization
 */
export const rehypePlugins: Pluggable[] = [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]];
