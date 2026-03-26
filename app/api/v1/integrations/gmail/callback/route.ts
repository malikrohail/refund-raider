import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ValidationError } from "@/server/errors";
import { storeGmailConnectionForUser } from "@/server/integrations/gmail";

function safeRedirect(target: string) {
  if (!target.startsWith("/")) {
    return "/cases/new?gmail=error";
  }

  return target;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const encodedState = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get("rr_gmail_oauth_state")?.value;
  cookieStore.delete("rr_gmail_oauth_state");

  if (googleError) {
    return NextResponse.redirect(new URL("/cases/new?gmail=error", url.origin));
  }

  if (!code || !encodedState || !rawCookie) {
    return NextResponse.redirect(new URL("/cases/new?gmail=error", url.origin));
  }

  try {
    const stored = JSON.parse(rawCookie) as { userId?: string; state?: string; redirectTo?: string };
    const parsedState = JSON.parse(Buffer.from(encodedState, "base64url").toString("utf8")) as {
      state?: string;
      redirectTo?: string;
    };

    if (!stored.userId || !stored.state || !parsedState.state || stored.state !== parsedState.state) {
      throw new ValidationError("Invalid Gmail OAuth state.");
    }

    await storeGmailConnectionForUser({
      userId: stored.userId,
      code
    });

    return NextResponse.redirect(new URL(`${safeRedirect(stored.redirectTo ?? "/cases/new")}?gmail=connected`, url.origin));
  } catch {
    return NextResponse.redirect(new URL("/cases/new?gmail=error", url.origin));
  }
}
