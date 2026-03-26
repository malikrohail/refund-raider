import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.nextPublicSupabaseUrl, env.nextPublicSupabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignored when called from a Server Component without a writable cookie response.
        }
      }
    }
  });
}
