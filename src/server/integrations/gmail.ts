import crypto from "node:crypto";
import type { GmailConnectionRecord } from "@/lib/contracts/domain";
import type { GmailSearchResult, IntakeSuggestion } from "@/lib/contracts/api";
import { env, getProviderRuntimeState, hasConfiguredGmailConnector, type ProviderRuntimeState } from "@/lib/config/env";
import { UnauthorizedError, ValidationError, ConflictError } from "@/server/errors";
import { refundRaiderRepository } from "@/server/repositories/refundRaiderRepository";
import { parseIntakeRequest } from "@/server/services/intakeAutomationService";

const GMAIL_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly"
].join(" ");

export interface GmailProviderState extends ProviderRuntimeState {
  provider: "gmail";
}

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GmailMessageHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: {
    data?: string;
  };
  headers?: GmailMessageHeader[];
  parts?: GmailMessagePart[];
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: GmailMessagePart;
  internalDate?: string;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function deriveEncryptionKey() {
  if (!env.gmailTokenEncryptionKey) {
    throw new ValidationError("Gmail token encryption is not configured.");
  }

  return crypto.createHash("sha256").update(env.gmailTokenEncryptionKey).digest();
}

function encryptSecret(value: string) {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSecret(value: string) {
  const [ivPart, tagPart, bodyPart] = value.split(".");
  if (!ivPart || !tagPart || !bodyPart) {
    throw new ValidationError("Stored Gmail token is malformed.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(bodyPart, "base64url")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

async function parseGoogleResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof body.error_description === "string"
        ? body.error_description
        : typeof body.error === "string"
          ? body.error
          : "Google request failed.";
    throw new ValidationError(message);
  }

  return body as T;
}

function getCallbackUrl() {
  if (!env.appUrl) {
    throw new ValidationError("NEXT_PUBLIC_APP_URL is required for Gmail connect.");
  }

  return `${env.appUrl.replace(/\/$/, "")}/api/v1/integrations/gmail/callback`;
}

async function exchangeCodeForTokens(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getCallbackUrl()
    })
  });

  return parseGoogleResponse<GmailTokenResponse>(response);
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  return parseGoogleResponse<GmailTokenResponse>(response);
}

async function fetchGmailProfile(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return parseGoogleResponse<{ emailAddress: string }>(response);
}

function getHeaderValue(headers: GmailMessageHeader[] | undefined, headerName: string) {
  return headers?.find((header) => header.name?.toLowerCase() === headerName.toLowerCase())?.value ?? "";
}

function decodeBodyData(value: string | undefined) {
  if (!value) {
    return "";
  }

  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function stripHtml(html: string) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractBodyText(part: GmailMessagePart | undefined): string {
  if (!part) {
    return "";
  }

  if (part.mimeType === "text/plain") {
    return decodeBodyData(part.body?.data);
  }

  if (part.mimeType === "text/html") {
    return stripHtml(decodeBodyData(part.body?.data));
  }

  for (const child of part.parts ?? []) {
    const extracted = extractBodyText(child);
    if (extracted) {
      return extracted;
    }
  }

  return decodeBodyData(part.body?.data);
}

function buildRawMessageText(message: GmailMessageResponse) {
  const payload = message.payload;
  const headers = payload?.headers ?? [];
  const subject = getHeaderValue(headers, "Subject");
  const from = getHeaderValue(headers, "From");
  const date = getHeaderValue(headers, "Date");
  const bodyText = extractBodyText(payload);

  return [
    from ? `From: ${from}` : "",
    subject ? `Subject: ${subject}` : "",
    date ? `Date: ${date}` : "",
    bodyText
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function gmailApiRequest<T>(accessToken: string, path: string, params?: Record<string, string>) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return parseGoogleResponse<T>(response);
}

async function getStoredRefreshToken(userId: string) {
  const connection = await refundRaiderRepository.getGmailConnection(userId);
  if (!connection) {
    throw new ConflictError("Gmail is not connected for this account.");
  }

  return {
    connection,
    refreshToken: decryptSecret(connection.encryptedRefreshToken)
  };
}

export function getGmailRuntimeState(): GmailProviderState {
  const base = getProviderRuntimeState("gmail", hasConfiguredGmailConnector());
  return {
    ...base,
    provider: "gmail",
    message: hasConfiguredGmailConnector()
      ? "Gmail OAuth is configured and can be connected by signed-in users."
      : "Gmail connect is not configured yet."
  };
}

export function requireAuthenticatedUser(mode: "demo" | "authenticated") {
  if (mode !== "authenticated") {
    throw new UnauthorizedError("Sign in to unlock Gmail inbox search.");
  }
}

export function buildGoogleAuthUrl(params: { state: string; redirectTo: string }) {
  if (!hasConfiguredGmailConnector()) {
    throw new ValidationError("Google OAuth is not configured yet.");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", getCallbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", base64UrlEncode(JSON.stringify(params)));
  return url.toString();
}

export function createOauthState() {
  return crypto.randomUUID();
}

export async function storeGmailConnectionForUser(params: {
  userId: string;
  code: string;
}) {
  const tokenResponse = await exchangeCodeForTokens(params.code);
  const refreshToken = tokenResponse.refresh_token;
  const accessToken = tokenResponse.access_token;

  if (!refreshToken || !accessToken) {
    throw new ValidationError("Google did not return a refresh token. Reconnect and grant consent again.");
  }

  const profile = await fetchGmailProfile(accessToken);
  const now = new Date().toISOString();

  await refundRaiderRepository.upsertGmailConnection({
    userId: params.userId,
    email: profile.emailAddress,
    encryptedRefreshToken: encryptSecret(refreshToken),
    scope: tokenResponse.scope ?? GMAIL_SCOPE,
    createdAt: now,
    updatedAt: now
  });
}

export async function getGmailConnectionStatus(userId: string) {
  const connection = await refundRaiderRepository.getGmailConnection(userId);
  return {
    available: hasConfiguredGmailConnector(),
    connected: Boolean(connection),
    email: connection?.email ?? null
  };
}

export async function disconnectGmail(userId: string) {
  return refundRaiderRepository.deleteGmailConnection(userId);
}

export async function searchGmailMessages(params: {
  userId: string;
  query: string;
}): Promise<GmailSearchResult[]> {
  if (!params.query.trim()) {
    return [];
  }

  const { refreshToken } = await getStoredRefreshToken(params.userId);
  const tokenResponse = await refreshAccessToken(refreshToken);
  const accessToken = tokenResponse.access_token;
  if (!accessToken) {
    throw new ValidationError("Failed to refresh Gmail access.");
  }

  const listResponse = await gmailApiRequest<{ messages?: Array<{ id: string; threadId: string }> }>(
    accessToken,
    "users/me/messages",
    {
      maxResults: "5",
      q: params.query
    }
  );

  const messages = listResponse.messages ?? [];
  const results = await Promise.all(
    messages.map(async (message) => {
      const detail = await gmailApiRequest<GmailMessageResponse>(accessToken, `users/me/messages/${message.id}`, {
        format: "full"
      });
      const rawText = buildRawMessageText(detail);
      const suggestion: IntakeSuggestion = parseIntakeRequest({
        rawText
      });

      return {
        messageId: detail.id,
        threadId: detail.threadId,
        from: getHeaderValue(detail.payload?.headers, "From"),
        subject: getHeaderValue(detail.payload?.headers, "Subject"),
        receivedAt: detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : null,
        snippet: detail.snippet ?? rawText.slice(0, 180),
        rawText,
        suggestion
      };
    })
  );

  return results;
}
