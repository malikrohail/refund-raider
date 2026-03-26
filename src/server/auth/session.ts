import { env } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  mode: "demo" | "authenticated";
}

const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";

export async function getSessionUser(): Promise<SessionUser> {
  if (env.nextPublicSupabaseUrl && env.nextPublicSupabaseAnonKey) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user?.id && user.email) {
        return {
          id: user.id,
          email: user.email,
          mode: "authenticated"
        };
      }
    } catch {
      // Fall back to the controlled demo user if auth is not available yet.
    }
  }

  return {
    id: DEMO_USER_ID,
    email: "demo@refundraider.local",
    mode: "demo"
  };
}
