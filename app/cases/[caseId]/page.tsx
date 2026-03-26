import { CaseWorkspace } from "@/components/caseWorkspace";
import { SiteHeader } from "@/components/siteHeader";
import { env } from "@/lib/config/env";
import { formatIssueTypeLabel } from "@/lib/presentation/labels";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { getCaseDetailForUser } from "@/server/services/casesService";
import { getAgentRuntime } from "@/server/services/elevenLabsAgentService";

type CasePageProps = {
  params: Promise<{ caseId: string }> | { caseId: string };
};

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params;
  const user = await getSessionUser();
  let caseDetail;

  try {
    caseDetail = await getCaseDetailForUser(user.id, caseId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const agentRuntime = await getAgentRuntime("case");
  const agentConfig = {
    agentId: agentRuntime.agentId || env.elevenLabsAgentId || "mock-agent",
    mode: agentRuntime.mode,
    preferredTransport: agentRuntime.preferredTransport,
    configurationState: agentRuntime.configurationState,
    missingToolNames: agentRuntime.missingToolNames,
    ...(agentRuntime.conversationToken
      ? { conversationToken: agentRuntime.conversationToken }
      : {}),
    ...(agentRuntime.signedUrl ? { signedUrl: agentRuntime.signedUrl } : {})
  };
  const caseLabel = `${caseDetail.case.merchantName} ${formatIssueTypeLabel(caseDetail.case.issueType).toLowerCase()} case`;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 md:px-10 md:py-10">
      <SiteHeader actionHref="/cases/new" actionLabel="New case" />

      <header className="grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Case</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
            {caseLabel}
          </h1>
        </div>
        <div className="space-y-3 text-sm leading-7 text-[var(--muted)] md:justify-self-end">
          <p className="max-w-2xl">
            Refund Raider has already researched the policy path and now exposes the live plan,
            approvals, execution steps, and follow-up queue around the conversation.
          </p>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Reference · {caseId}</p>
        </div>
      </header>

      <CaseWorkspace initialCaseDetail={caseDetail} initialAgentConfig={agentConfig} />
    </main>
  );
}
