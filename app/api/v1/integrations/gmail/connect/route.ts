import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { buildGoogleAuthUrl, createOauthState, requireAuthenticatedUser } from "@/server/integrations/gmail";
import { handleRouteError } from "@/server/http/handleRouteError";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    requireAuthenticatedUser(user.mode);

    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/cases/new";
    const state = createOauthState();
    const cookieStore = await cookies();
    cookieStore.set(
      "rr_gmail_oauth_state",
      JSON.stringify({
        userId: user.id,
        state,
        redirectTo
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/"
      }
    );

    return NextResponse.redirect(buildGoogleAuthUrl({ state, redirectTo }));
  } catch (error) {
    return handleRouteError(error);
  }
}
