function readEnv(name: string) {
  const runtimeValue = process.env[name];
  if (runtimeValue && runtimeValue.trim().length > 0) {
    return runtimeValue.trim();
  }

  return "";
}

function isPlaceholderValue(value: string) {
  return value.includes("[YOUR-") || value.includes("<YOUR-") || value.includes("YOUR_PASSWORD");
}

function readFirstEnv(names: string[]) {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  return "";
}

function readBooleanEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value === undefined) {
      continue;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }

  return false;
}

export type ProviderRuntimeMode = "live" | "mock";

export type ProviderReadiness = "ready" | "demo_safe" | "missing_config" | "provider_failure";

export interface ProviderRuntimeState {
  provider: string;
  mode: ProviderRuntimeMode;
  readiness: ProviderReadiness;
  configured: boolean;
  demoSafe: boolean;
  label: string;
  message: string;
}

function describeProviderRuntime(provider: string, configured: boolean): ProviderRuntimeState {
  const demoSafe = readBooleanEnv([
    "RR_DEMO_SAFE_MODE",
    "DEMO_SAFE_MODE",
    "NEXT_PUBLIC_DEMO_SAFE_MODE"
  ]);
  const mode: ProviderRuntimeMode = demoSafe || !configured ? "mock" : "live";
  const readiness: ProviderReadiness = configured
    ? demoSafe
      ? "demo_safe"
      : "ready"
    : "missing_config";

  return {
    provider,
    mode,
    readiness,
    configured,
    demoSafe,
    label: mode === "live" ? "live" : "mock",
    message:
      readiness === "ready"
        ? `${provider} is live and ready.`
        : readiness === "demo_safe"
          ? `${provider} is forced into mock mode for demo safety.`
          : `${provider} is not configured and will use mock mode.`
  };
}

export const env = {
  appUrl: readEnv("NEXT_PUBLIC_APP_URL"),
  nextPublicSupabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  nextPublicSupabaseAnonKey: readFirstEnv([
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ]),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  firecrawlApiKey: readEnv("FIRECRAWL_API_KEY"),
  elevenLabsApiKey: readEnv("ELEVENLABS_API_KEY"),
  elevenLabsAgentId: readEnv("ELEVENLABS_AGENT_ID"),
  elevenLabsIntakeAgentId: readEnv("ELEVENLABS_INTAKE_AGENT_ID"),
  elevenLabsCaseAgentId: readEnv("ELEVENLABS_CASE_AGENT_ID"),
  resendApiKey: readEnv("RESEND_API_KEY"),
  resendFromEmail: readEnv("RESEND_FROM_EMAIL"),
  mistralApiKey: readEnv("MISTRAL_API_KEY"),
  googleClientId: readEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
  gmailTokenEncryptionKey: readFirstEnv(["GMAIL_TOKEN_ENCRYPTION_KEY", "GOOGLE_TOKEN_ENCRYPTION_KEY"]),
  supabaseDbUrl: readEnv("SUPABASE_DB_URL"),
  supabaseDbPassword: readEnv("SUPABASE_DB_PASSWORD"),
  inngestEventKey: readEnv("INNGEST_EVENT_KEY"),
  inngestSigningKey: readEnv("INNGEST_SIGNING_KEY"),
  demoSafeMode: readBooleanEnv(["RR_DEMO_SAFE_MODE", "DEMO_SAFE_MODE", "NEXT_PUBLIC_DEMO_SAFE_MODE"])
};

export function isDemoSafeModeEnabled() {
  return env.demoSafeMode;
}

export function getProviderRuntimeState(provider: string, configured: boolean) {
  return describeProviderRuntime(provider, configured);
}

export function hasConfiguredSupabaseDatabase() {
  return Boolean(env.supabaseDbUrl) && !isPlaceholderValue(env.supabaseDbUrl);
}

export function getMissingServerEnv() {
  const missing: string[] = [];

  if (!env.nextPublicSupabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!env.nextPublicSupabaseAnonKey) {
    missing.splice(1, 0, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_OR_ANON_KEY");
  }

  if (!env.demoSafeMode) {
    if (!env.supabaseDbUrl && !env.supabaseServiceRoleKey) {
      missing.push("SUPABASE_DB_URL_OR_SERVICE_ROLE_KEY");
    }

    if (!env.firecrawlApiKey) missing.push("FIRECRAWL_API_KEY");
    if (!env.elevenLabsApiKey) missing.push("ELEVENLABS_API_KEY");
    if (!env.elevenLabsAgentId && !env.elevenLabsIntakeAgentId && !env.elevenLabsCaseAgentId) {
      missing.push("ELEVENLABS_AGENT_ID_OR_SPLIT_AGENT_IDS");
    }
    if (!env.resendApiKey) missing.push("RESEND_API_KEY");
    if (!env.resendFromEmail) missing.push("RESEND_FROM_EMAIL");
    if (!env.mistralApiKey) missing.push("MISTRAL_API_KEY");
    if (!env.googleClientId) missing.push("GOOGLE_CLIENT_ID");
    if (!env.googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!env.gmailTokenEncryptionKey) missing.push("GMAIL_TOKEN_ENCRYPTION_KEY_OR_GOOGLE_TOKEN_ENCRYPTION_KEY");
  }

  return missing;
}

export function hasConfiguredOcrProvider() {
  return Boolean(env.mistralApiKey);
}

export function hasConfiguredGmailConnector() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.gmailTokenEncryptionKey);
}

export function getElevenLabsAgentId(kind: "intake" | "case") {
  if (kind === "intake") {
    return env.elevenLabsIntakeAgentId || env.elevenLabsAgentId;
  }

  return env.elevenLabsCaseAgentId || env.elevenLabsAgentId;
}
