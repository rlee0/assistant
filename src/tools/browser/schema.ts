import {
  BROWSER_DEFAULT_ENABLED,
  BROWSER_DEFAULT_MAX_DEPTH,
  BROWSER_DEFAULT_TIMEOUT_MS,
  BROWSER_DEFAULT_USER_AGENT,
  BROWSER_MAX_DEPTH_LIMIT,
  BROWSER_TIMEOUT_MAX_MS,
  BROWSER_TIMEOUT_MIN_MS,
} from "@/lib/constants";

import { z } from "zod";

export const browserSettings = z.object({
  enabled: z.boolean().default(BROWSER_DEFAULT_ENABLED),
  userAgent: z.string().default(BROWSER_DEFAULT_USER_AGENT),
  maxDepth: z.number().int().min(1).max(BROWSER_MAX_DEPTH_LIMIT).default(BROWSER_DEFAULT_MAX_DEPTH),
  timeoutMs: z
    .number()
    .int()
    .min(BROWSER_TIMEOUT_MIN_MS)
    .max(BROWSER_TIMEOUT_MAX_MS)
    .default(BROWSER_DEFAULT_TIMEOUT_MS),
});

export type BrowserSettings = z.infer<typeof browserSettings>;
