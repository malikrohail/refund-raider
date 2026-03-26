import { env, getProviderRuntimeState, type ProviderRuntimeState } from "@/lib/config/env";

export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  provider: "resend" | "mock";
  mode: ProviderRuntimeState["mode"];
  readiness: ProviderRuntimeState["readiness"];
  externalId: string;
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}`);
  }

  const body = (await response.json()) as { id?: string };

  return {
    provider: "resend",
    mode: "live",
    readiness: "ready",
    externalId: body.id ?? `resend_${crypto.randomUUID()}`
  };
}

function sendWithMock(readiness: ProviderRuntimeState["readiness"]): SendEmailResult {
  return {
    provider: "mock",
    mode: "mock",
    readiness,
    externalId: `mock_email_${crypto.randomUUID()}`
  };
}

export function getEmailRuntimeState() {
  return getProviderRuntimeState("email", Boolean(env.resendApiKey && env.resendFromEmail));
}

export async function sendRefundEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const runtimeState = getEmailRuntimeState();

  if (runtimeState.mode === "live") {
    try {
      return await sendWithResend(input);
    } catch {
      return sendWithMock("provider_failure");
    }
  }

  return sendWithMock(runtimeState.readiness);
}
