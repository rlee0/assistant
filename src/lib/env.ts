/**
 * Environment configuration singleton
 * All values are validated at module load time
 */
const environment = {
  // Runtime
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: (process.env.NODE_ENV || "development") as "development" | "production",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  apiUrl: process.env.API_URL || `http://localhost:${parseInt(process.env.PORT || "3000", 10)}`,

  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // AI Gateway
  aiGatewayUrl: process.env.AI_GATEWAY_URL,
  aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY,

  // Fallback API Keys (for specific providers)
  openaiApiKey: process.env.OPENAI_API_KEY,
  azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
} as const;

/**
 * Validate critical environment variables at startup
 */
function validateEnvironment(): void {
  const required = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: environment.supabaseUrl },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: environment.supabaseAnonKey },
    { key: "AI_GATEWAY_API_KEY", value: environment.aiGatewayApiKey },
    { key: "AI_GATEWAY_URL", value: environment.aiGatewayUrl },
  ];

  const missing = required.filter((r) => !r.value);

  if (missing.length > 0) {
    const names = missing.map((m) => m.key).join(", ");
    throw new Error(
      `Missing required environment variables: ${names}. Please check your .env.local or deployment configuration.`
    );
  }
}

/**
 * Run validation only once at module load (in server context)
 * Skip in browser to avoid errors during SSR
 */
if (typeof window === "undefined") {
  try {
    validateEnvironment();
  } catch (error) {
    // In development, fail silently to allow development flow; in production, fail fast
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

export default environment;
