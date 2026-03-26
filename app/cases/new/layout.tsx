import type { ReactNode } from "react";
import { env, hasConfiguredGmailConnector } from "@/lib/config/env";
import { SiteHeader } from "@/components/siteHeader";
import { IntakeWorkspaceProvider } from "@/components/intakeWorkspaceProvider";
import { IntakeTabs } from "@/components/intakeTabs";
import { getSessionUser } from "@/server/auth/session";

export default async function NewCaseLayout({
  children
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <IntakeWorkspaceProvider
      initialSessionUser={user}
      authAvailable={Boolean(env.nextPublicSupabaseUrl && env.nextPublicSupabaseAnonKey)}
      gmailAvailable={hasConfiguredGmailConnector()}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
        <SiteHeader actionHref="/" actionLabel="Back home" />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Intake workspace
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Keep the live call clean. Switch to integrations only when the agent needs more authority.
            </p>
          </div>
          <IntakeTabs />
        </div>
        {children}
      </main>
    </IntakeWorkspaceProvider>
  );
}
