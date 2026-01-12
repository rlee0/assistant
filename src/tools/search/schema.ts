import {
  SEARCH_DEFAULT_ENABLED,
  SEARCH_DEFAULT_PROVIDER,
  SEARCH_DEFAULT_REGION,
} from "@/lib/constants";

import { z } from "zod";

export const searchSettings = z.object({
  enabled: z.boolean().default(SEARCH_DEFAULT_ENABLED),
  provider: z.enum(["duckduckgo", "serpapi"]).default(SEARCH_DEFAULT_PROVIDER),
  apiKey: z.string().optional(),
  region: z.string().default(SEARCH_DEFAULT_REGION),
});

export type SearchSettings = z.infer<typeof searchSettings>;
