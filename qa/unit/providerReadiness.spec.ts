import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMissingServerEnv } from "../../src/lib/config/env";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("provider readiness", () => {
  it("reports the missing server env needed to wire external providers", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    delete process.env.ELEVENLABS_INTAKE_AGENT_ID;
    delete process.env.ELEVENLABS_CASE_AGENT_ID;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    expect(getMissingServerEnv()).toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_OR_ANON_KEY",
        "SUPABASE_DB_URL_OR_SERVICE_ROLE_KEY",
        "FIRECRAWL_API_KEY",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_AGENT_ID_OR_SPLIT_AGENT_IDS",
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL"
      ])
    );
  });

  it("falls back to mock email delivery when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    const { sendRefundEmail } = await import("../../src/server/providers/email");
    const result = await sendRefundEmail({
      to: ["support@example.com"],
      subject: "Refund request",
      html: "<p>Refund request</p>",
      text: "Refund request"
    });

    expect(result.provider).toBe("mock");
    expect(result.externalId).toMatch(/^mock_email_/);
  });

  it("falls back to mock email delivery when Resend fails", async () => {
    process.env.RESEND_API_KEY = "resend_test_key";
    process.env.RESEND_FROM_EMAIL = "billing@refundraider.local";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({})
        } as Response;
      })
    );

    const { sendRefundEmail } = await import("../../src/server/providers/email");
    const result = await sendRefundEmail({
      to: ["support@example.com"],
      subject: "Refund request",
      html: "<p>Refund request</p>",
      text: "Refund request"
    });

    expect(result.provider).toBe("mock");
    expect(result.externalId).toMatch(/^mock_email_/);
  });
});
