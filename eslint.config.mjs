import { defineConfig, globalIgnores } from "eslint/config";

import nextTs from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore vendor-scaffolded AI Elements components to keep lint clean.
    "src/components/ai-elements/**",
  ]),
  // Enforce usage of centralized logging across source files
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Disallow direct console usage; prefer lib/logging.ts helpers
      "no-console": "error",
    },
  },
  // Allow console calls in the core logger and the JSON-structured API route logger
  {
    files: ["src/lib/logging.ts", "src/app/api/models/route.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
