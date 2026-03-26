import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/cases/new";
  }

  return value;
}

function buildRedirectUrl(origin: string, next: string, params?: Record<string, string>) {
  const redirectUrl = new URL(next, origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");

  if (providerError || providerErrorDescription) {
    return NextResponse.redirect(buildRedirectUrl(url.origin, next, { auth: "error" }));
  }

  const response = NextResponse.redirect(buildRedirectUrl(url.origin, next));

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(env.nextPublicSupabaseUrl, env.nextPublicSupabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            }
          }
        }
      });
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(buildRedirectUrl(url.origin, next, { auth: "error" }));
      }
    } catch {
      return NextResponse.redirect(buildRedirectUrl(url.origin, next, { auth: "error" }));
    }
  }

  return response;
}
