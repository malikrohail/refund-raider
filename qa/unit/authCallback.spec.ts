import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cookieStore = {
    getAll: vi.fn(() => []),
    set: vi.fn()
  };

  return {
    cookieStore,
    cookies: vi.fn(async () => cookieStore),
    createServerClient: vi.fn()
  };
});

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    nextPublicSupabaseUrl: "https://example.supabase.co",
    nextPublicSupabaseAnonKey: "supabase-anon-key"
  }
}));

beforeEach(() => {
  vi.resetModules();
  mocks.cookieStore.getAll.mockReset();
  mocks.cookieStore.set.mockReset();
  mocks.cookies.mockReset();
  mocks.createServerClient.mockReset();
  mocks.cookieStore.getAll.mockReturnValue([]);
  mocks.cookies.mockResolvedValue(mocks.cookieStore);
});

afterEach(() => {
  vi.resetModules();
});

describe("/auth/callback", () => {
  it("applies auth cookies to the redirect response after a successful code exchange", async () => {
    mocks.createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (cookiesToSet: Array<{
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }>) => Promise<void> | void;
          };
        }
      ) => ({
        auth: {
          exchangeCodeForSession: async () => {
            await options.cookies.setAll([
              {
                name: "sb-test-auth-token",
                value: "session-cookie",
                options: {
                  httpOnly: true,
                  path: "/"
                }
              }
            ]);

            return {
              data: {
                session: null
              },
              error: null
            };
          }
        }
      })
    );

    const { GET } = await import("../../app/auth/callback/route");
    const response = await GET(
      new Request("https://refund-raider.vercel.app/auth/callback?code=test-code&next=/cases/new")
    );

    expect(response.headers.get("location")).toBe("https://refund-raider.vercel.app/cases/new");
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token=session-cookie");
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "sb-test-auth-token",
      "session-cookie",
      expect.objectContaining({
        httpOnly: true,
        path: "/"
      })
    );
  });

  it("surfaces an auth error instead of silently falling back to demo mode", async () => {
    mocks.createServerClient.mockImplementation(() => ({
      auth: {
        exchangeCodeForSession: async () => ({
          data: {
            session: null
          },
          error: {
            message: "PKCE verifier missing"
          }
        })
      }
    }));

    const { GET } = await import("../../app/auth/callback/route");
    const response = await GET(
      new Request("https://refund-raider.vercel.app/auth/callback?code=test-code&next=/cases/new")
    );

    expect(response.headers.get("location")).toBe("https://refund-raider.vercel.app/cases/new?auth=error");
  });
});
