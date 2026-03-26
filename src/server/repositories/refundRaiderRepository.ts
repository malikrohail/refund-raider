import {
  type ActionRecord,
  type ActionPlanRecord,
  type ActionRunRecord,
  type ApprovalGrantRecord,
  type AutomationEventRecord,
  type AutomationSessionRecord,
  type ArtifactRecord,
  type AutomationConfidence,
  type BrowserCommandRecord,
  type BrowserSnapshotRecord,
  type CaseDetailPayload,
  type CaseKind,
  type CaseRecord,
  type CasePriority,
  type ConsentState,
  type DraftRecord,
  type FollowUpTaskRecord,
  type GmailConnectionRecord,
  type MerchantProfileRecord,
  type MessageRecord,
  type PaymentMethod,
  type PolicySourceRecord,
  type ProfileRecord,
  type RecommendedPath,
  type RefundStrategyRecord,
  type ResearchRunRecord
} from "@/lib/contracts/domain";
import { getDatabaseSnapshot, mutateDatabase } from "@/server/db/fileStore";
import { NotFoundError } from "@/server/errors";

type CreateCaseInput = Pick<
  CaseRecord,
  | "merchantName"
  | "merchantUrl"
  | "issueSummary"
  | "issueType"
  | "desiredOutcome"
  | "caseKind"
  | "purchaseDate"
  | "paymentMethod"
  | "automationConfidence"
  | "consentState"
  | "priority"
  | "merchantContactEmail"
> & {
  userId: string;
};

type CreateArtifactInput = Omit<ArtifactRecord, "id" | "createdAt">;
type CreateResearchRunInput = Omit<ResearchRunRecord, "id" | "createdAt">;
type CreatePolicySourceInput = Omit<PolicySourceRecord, "id" | "createdAt">;
type CreateStrategyInput = Omit<RefundStrategyRecord, "id" | "createdAt" | "updatedAt">;
type CreateMerchantProfileInput = Omit<MerchantProfileRecord, "id" | "createdAt" | "updatedAt">;
type CreateActionPlanInput = Omit<ActionPlanRecord, "id" | "createdAt" | "updatedAt">;
type CreateActionRunInput = Omit<ActionRunRecord, "id" | "createdAt" | "updatedAt">;
type CreateApprovalGrantInput = Omit<ApprovalGrantRecord, "id" | "createdAt" | "updatedAt">;
type CreateFollowUpTaskInput = Omit<FollowUpTaskRecord, "id" | "createdAt" | "updatedAt">;
type CreateAutomationSessionInput = Omit<AutomationSessionRecord, "id" | "createdAt" | "updatedAt">;
type CreateBrowserSnapshotInput = Omit<BrowserSnapshotRecord, "id" | "createdAt">;
type CreateBrowserCommandInput = Omit<BrowserCommandRecord, "id" | "createdAt" | "updatedAt">;
type CreateAutomationEventInput = Omit<AutomationEventRecord, "id" | "createdAt">;
type CreateDraftInput = Omit<DraftRecord, "id" | "createdAt" | "updatedAt">;
type CreateActionInput = Omit<ActionRecord, "id" | "createdAt">;
type CreateMessageInput = Omit<MessageRecord, "id" | "createdAt">;
type UpsertGmailConnectionInput = GmailConnectionRecord;

function createTimestamp() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sortByCreatedAtAsc<T extends { createdAt: string }>(records: T[]) {
  return [...records].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(records: T[]) {
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export const refundRaiderRepository = {
  async ensureProfile(userId: string, email: string) {
    return mutateDatabase<ProfileRecord>((database) => {
      const existing = database.profiles.find((profile) => profile.id === userId);

      if (existing) {
        existing.email = email;
        existing.updatedAt = createTimestamp();
        return existing;
      }

      const profile: ProfileRecord = {
        id: userId,
        email,
        fullName: null,
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      };

      database.profiles.push(profile);
      return profile;
    });
  },

  async createCase(input: CreateCaseInput) {
    return mutateDatabase<CaseRecord>((database) => {
      const now = createTimestamp();
      const paymentMethod: PaymentMethod = input.paymentMethod ?? "unknown";
      const caseKind: CaseKind = input.caseKind ?? "refund";
      const automationConfidence: AutomationConfidence = input.automationConfidence ?? "medium";
      const consentState: ConsentState = input.consentState ?? "required";
      const priority: CasePriority = input.priority ?? "normal";

      const record: CaseRecord = {
        id: createId("case"),
        userId: input.userId,
        merchantName: input.merchantName,
        merchantUrl: input.merchantUrl ?? null,
        issueSummary: input.issueSummary,
        issueType: input.issueType,
        desiredOutcome: input.desiredOutcome,
        caseKind,
        purchaseDate: input.purchaseDate ?? null,
        paymentMethod,
        status: "intake",
        automationConfidence,
        consentState,
        priority,
        currency: "USD",
        orderTotalAmount: null,
        merchantContactEmail: input.merchantContactEmail ?? null,
        createdAt: now,
        updatedAt: now
      };

      database.cases.push(record);
      return record;
    });
  },

  async updateCase(caseId: string, userId: string, patch: Partial<CaseRecord>) {
    return mutateDatabase<CaseRecord>((database) => {
      const record = database.cases.find((candidate) => candidate.id === caseId && candidate.userId === userId);

      if (!record) {
        throw new NotFoundError("Case not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async getCase(caseId: string, userId: string) {
    const database = await getDatabaseSnapshot();
    const record = database.cases.find((candidate) => candidate.id === caseId && candidate.userId === userId);

    if (!record) {
      throw new NotFoundError("Case not found");
    }

    return record;
  },

  async createArtifact(input: CreateArtifactInput) {
    return mutateDatabase<ArtifactRecord>((database) => {
      const record: ArtifactRecord = {
        id: createId("artifact"),
        ...input,
        createdAt: createTimestamp()
      };

      database.artifacts.push(record);
      return record;
    });
  },

  async listArtifacts(caseId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(database.artifacts.filter((artifact) => artifact.caseId === caseId));
  },

  async createResearchRun(input: CreateResearchRunInput) {
    return mutateDatabase<ResearchRunRecord>((database) => {
      const record: ResearchRunRecord = {
        id: createId("research"),
        ...input,
        createdAt: createTimestamp()
      };

      database.researchRuns.push(record);
      return record;
    });
  },

  async updateResearchRun(researchRunId: string, patch: Partial<ResearchRunRecord>) {
    return mutateDatabase<ResearchRunRecord>((database) => {
      const record = database.researchRuns.find((candidate) => candidate.id === researchRunId);

      if (!record) {
        throw new NotFoundError("Research run not found");
      }

      Object.assign(record, patch);
      return record;
    });
  },

  async replacePolicySources(caseId: string, researchRunId: string, records: CreatePolicySourceInput[]) {
    return mutateDatabase<PolicySourceRecord[]>((database) => {
      database.policySources = database.policySources.filter(
        (candidate) => !(candidate.caseId === caseId && candidate.researchRunId === researchRunId)
      );

      const created = records.map((record) => ({
        id: createId("source"),
        ...record,
        createdAt: createTimestamp()
      }));

      database.policySources.push(...created);
      return created;
    });
  },

  async createOrReplaceStrategy(caseId: string, strategy: CreateStrategyInput) {
    return mutateDatabase<RefundStrategyRecord>((database) => {
      database.refundStrategies = database.refundStrategies.filter((candidate) => candidate.caseId !== caseId);

      const now = createTimestamp();
      const record: RefundStrategyRecord = {
        id: createId("strategy"),
        ...strategy,
        createdAt: now,
        updatedAt: now
      };

      database.refundStrategies.push(record);
      return record;
    });
  },

  async createOrReplaceMerchantProfile(caseId: string, profile: CreateMerchantProfileInput) {
    return mutateDatabase<MerchantProfileRecord>((database) => {
      database.merchantProfiles = database.merchantProfiles.filter((candidate) => candidate.caseId !== caseId);

      const now = createTimestamp();
      const record: MerchantProfileRecord = {
        id: createId("merchant_profile"),
        ...profile,
        createdAt: now,
        updatedAt: now
      };

      database.merchantProfiles.push(record);
      return record;
    });
  },

  async createOrReplaceActionPlan(caseId: string, plan: CreateActionPlanInput) {
    return mutateDatabase<ActionPlanRecord>((database) => {
      database.actionPlans = database.actionPlans.filter((candidate) => candidate.caseId !== caseId);

      const now = createTimestamp();
      const record: ActionPlanRecord = {
        id: createId("plan"),
        ...plan,
        createdAt: now,
        updatedAt: now
      };

      database.actionPlans.push(record);
      return record;
    });
  },

  async replaceActionRuns(caseId: string, planId: string, records: CreateActionRunInput[]) {
    return mutateDatabase<ActionRunRecord[]>((database) => {
      database.actionRuns = database.actionRuns.filter(
        (candidate) => !(candidate.caseId === caseId && candidate.planId === planId)
      );

      const now = createTimestamp();
      const created = records.map((record) => ({
        id: createId("action_run"),
        ...record,
        createdAt: now,
        updatedAt: now
      }));

      database.actionRuns.push(...created);
      return created;
    });
  },

  async getActionRun(actionRunId: string) {
    const database = await getDatabaseSnapshot();
    const record = database.actionRuns.find((candidate) => candidate.id === actionRunId);

    if (!record) {
      throw new NotFoundError("Action run not found");
    }

    return record;
  },

  async updateActionRun(actionRunId: string, patch: Partial<ActionRunRecord>) {
    return mutateDatabase<ActionRunRecord>((database) => {
      const record = database.actionRuns.find((candidate) => candidate.id === actionRunId);

      if (!record) {
        throw new NotFoundError("Action run not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async getApprovalGrantForActionRun(actionRunId: string) {
    const database = await getDatabaseSnapshot();
    return database.approvalGrants.find((candidate) => candidate.actionRunId === actionRunId) ?? null;
  },

  async upsertApprovalGrant(input: CreateApprovalGrantInput) {
    return mutateDatabase<ApprovalGrantRecord>((database) => {
      const existing = database.approvalGrants.find((candidate) => candidate.actionRunId === input.actionRunId);
      const now = createTimestamp();

      if (existing) {
        Object.assign(existing, input, {
          requestedAt: existing.requestedAt,
          createdAt: existing.createdAt,
          updatedAt: now
        });
        return existing;
      }

      const record: ApprovalGrantRecord = {
        id: createId("approval"),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      database.approvalGrants.push(record);
      return record;
    });
  },

  async replaceFollowUpTasks(caseId: string, records: CreateFollowUpTaskInput[]) {
    return mutateDatabase<FollowUpTaskRecord[]>((database) => {
      database.followUpTasks = database.followUpTasks.filter((candidate) => candidate.caseId !== caseId);

      const now = createTimestamp();
      const created = records.map((record) => ({
        id: createId("follow_up"),
        ...record,
        createdAt: now,
        updatedAt: now
      }));

      database.followUpTasks.push(...created);
      return created;
    });
  },

  async createFollowUpTask(input: CreateFollowUpTaskInput) {
    return mutateDatabase<FollowUpTaskRecord>((database) => {
      const now = createTimestamp();
      const record: FollowUpTaskRecord = {
        id: createId("follow_up"),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      database.followUpTasks.push(record);
      return record;
    });
  },

  async updateFollowUpTask(taskId: string, patch: Partial<FollowUpTaskRecord>) {
    return mutateDatabase<FollowUpTaskRecord>((database) => {
      const record = database.followUpTasks.find((candidate) => candidate.id === taskId);

      if (!record) {
        throw new NotFoundError("Follow-up task not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async createDraft(input: CreateDraftInput) {
    return mutateDatabase<DraftRecord>((database) => {
      const now = createTimestamp();
      const record: DraftRecord = {
        id: createId("draft"),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      database.drafts.push(record);
      return record;
    });
  },

  async getDraft(draftId: string) {
    const database = await getDatabaseSnapshot();
    const record = database.drafts.find((candidate) => candidate.id === draftId);

    if (!record) {
      throw new NotFoundError("Draft not found");
    }

    return record;
  },

  async updateDraft(draftId: string, patch: Partial<DraftRecord>) {
    return mutateDatabase<DraftRecord>((database) => {
      const record = database.drafts.find((candidate) => candidate.id === draftId);

      if (!record) {
        throw new NotFoundError("Draft not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async createAction(input: CreateActionInput) {
    return mutateDatabase<ActionRecord>((database) => {
      const record: ActionRecord = {
        id: createId("action"),
        ...input,
        createdAt: createTimestamp()
      };

      database.actions.push(record);
      return record;
    });
  },

  async createMessage(input: CreateMessageInput) {
    return mutateDatabase<MessageRecord>((database) => {
      const record: MessageRecord = {
        id: createId("message"),
        ...input,
        createdAt: createTimestamp()
      };

      database.messages.push(record);
      return record;
    });
  },

  async createAutomationSession(input: CreateAutomationSessionInput) {
    return mutateDatabase<AutomationSessionRecord>((database) => {
      const now = createTimestamp();
      const record: AutomationSessionRecord = {
        id: createId("automation_session"),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      database.automationSessions.push(record);
      return record;
    });
  },

  async getAutomationSession(sessionId: string) {
    const database = await getDatabaseSnapshot();
    const record = database.automationSessions.find((candidate) => candidate.id === sessionId);

    if (!record) {
      throw new NotFoundError("Automation session not found");
    }

    return record;
  },

  async getLatestAutomationSession(caseId: string) {
    const database = await getDatabaseSnapshot();
    return (
      sortByCreatedAtDesc(
        database.automationSessions.filter((candidate) => candidate.caseId === caseId)
      )[0] ?? null
    );
  },

  async updateAutomationSession(sessionId: string, patch: Partial<AutomationSessionRecord>) {
    return mutateDatabase<AutomationSessionRecord>((database) => {
      const record = database.automationSessions.find((candidate) => candidate.id === sessionId);

      if (!record) {
        throw new NotFoundError("Automation session not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async createBrowserSnapshot(input: CreateBrowserSnapshotInput) {
    return mutateDatabase<BrowserSnapshotRecord>((database) => {
      const record: BrowserSnapshotRecord = {
        id: createId("browser_snapshot"),
        ...input,
        createdAt: createTimestamp()
      };

      database.browserSnapshots.push(record);
      return record;
    });
  },

  async listBrowserSnapshots(automationSessionId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(
      database.browserSnapshots.filter((snapshot) => snapshot.automationSessionId === automationSessionId)
    );
  },

  async createBrowserCommand(input: CreateBrowserCommandInput) {
    return mutateDatabase<BrowserCommandRecord>((database) => {
      const now = createTimestamp();
      const record: BrowserCommandRecord = {
        id: createId("browser_command"),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      database.browserCommands.push(record);
      return record;
    });
  },

  async getBrowserCommand(commandId: string) {
    const database = await getDatabaseSnapshot();
    const record = database.browserCommands.find((candidate) => candidate.id === commandId);

    if (!record) {
      throw new NotFoundError("Browser command not found");
    }

    return record;
  },

  async claimNextBrowserCommand(automationSessionId: string) {
    return mutateDatabase<BrowserCommandRecord | null>((database) => {
      const record = database.browserCommands.find(
        (candidate) => candidate.automationSessionId === automationSessionId && candidate.status === "pending"
      );

      if (!record) {
        return null;
      }

      record.status = "claimed";
      record.updatedAt = createTimestamp();
      return record;
    });
  },

  async updateBrowserCommand(commandId: string, patch: Partial<BrowserCommandRecord>) {
    return mutateDatabase<BrowserCommandRecord>((database) => {
      const record = database.browserCommands.find((candidate) => candidate.id === commandId);

      if (!record) {
        throw new NotFoundError("Browser command not found");
      }

      Object.assign(record, patch, {
        updatedAt: createTimestamp()
      });

      return record;
    });
  },

  async listBrowserCommands(automationSessionId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(
      database.browserCommands.filter((command) => command.automationSessionId === automationSessionId)
    );
  },

  async createAutomationEvent(input: CreateAutomationEventInput) {
    return mutateDatabase<AutomationEventRecord>((database) => {
      const record: AutomationEventRecord = {
        id: createId("automation_event"),
        ...input,
        createdAt: createTimestamp()
      };

      database.automationEvents.push(record);
      return record;
    });
  },

  async listAutomationEvents(automationSessionId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(
      database.automationEvents.filter((event) => event.automationSessionId === automationSessionId)
    );
  },

  async upsertGmailConnection(input: UpsertGmailConnectionInput) {
    return mutateDatabase<GmailConnectionRecord>((database) => {
      const existing = database.gmailConnections.find((candidate) => candidate.userId === input.userId);

      if (existing) {
        Object.assign(existing, input, {
          createdAt: existing.createdAt,
          updatedAt: createTimestamp()
        });
        return existing;
      }

      const record: GmailConnectionRecord = {
        ...input,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      };

      database.gmailConnections.push(record);
      return record;
    });
  },

  async getGmailConnection(userId: string) {
    const database = await getDatabaseSnapshot();
    return database.gmailConnections.find((candidate) => candidate.userId === userId) ?? null;
  },

  async deleteGmailConnection(userId: string) {
    return mutateDatabase<GmailConnectionRecord | null>((database) => {
      const index = database.gmailConnections.findIndex((candidate) => candidate.userId === userId);
      if (index === -1) {
        return null;
      }

      const [removed] = database.gmailConnections.splice(index, 1);
      return removed ?? null;
    });
  },

  async setCaseContactEmail(caseId: string, userId: string, merchantContactEmail: string | null) {
    return this.updateCase(caseId, userId, { merchantContactEmail });
  },

  async listTimeline(caseId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(database.actions.filter((action) => action.caseId === caseId));
  },

  async listMessages(caseId: string) {
    const database = await getDatabaseSnapshot();
    return sortByCreatedAtAsc(database.messages.filter((message) => message.caseId === caseId));
  },

  async getCaseDetail(caseId: string, userId: string): Promise<CaseDetailPayload> {
    const database = await getDatabaseSnapshot();
    const record = database.cases.find((candidate) => candidate.id === caseId && candidate.userId === userId);

    if (!record) {
      throw new NotFoundError("Case not found");
    }

    const artifacts = sortByCreatedAtAsc(database.artifacts.filter((artifact) => artifact.caseId === caseId));
    const latestResearchRun =
      sortByCreatedAtDesc(database.researchRuns.filter((researchRun) => researchRun.caseId === caseId))[0] ?? null;
    const policySources = sortByCreatedAtAsc(database.policySources.filter((source) => source.caseId === caseId));
    const activeStrategy =
      sortByCreatedAtDesc(database.refundStrategies.filter((strategy) => strategy.caseId === caseId))[0] ?? null;
    const merchantProfile =
      sortByCreatedAtDesc(database.merchantProfiles.filter((profile) => profile.caseId === caseId))[0] ?? null;
    const activeActionPlan =
      sortByCreatedAtDesc(database.actionPlans.filter((plan) => plan.caseId === caseId))[0] ?? null;
    const actionRuns = sortByCreatedAtAsc(database.actionRuns.filter((actionRun) => actionRun.caseId === caseId));
    const approvals = sortByCreatedAtAsc(
      database.approvalGrants.filter((approval) => approval.caseId === caseId)
    );
    const followUps = sortByCreatedAtAsc(
      database.followUpTasks.filter((followUp) => followUp.caseId === caseId)
    );
    const currentAutomationSession =
      sortByCreatedAtDesc(
        database.automationSessions.filter((automationSession) => automationSession.caseId === caseId)
      )[0] ?? null;
    const browserSnapshots = sortByCreatedAtAsc(
      database.browserSnapshots.filter((snapshot) => snapshot.caseId === caseId)
    );
    const browserCommands = sortByCreatedAtAsc(
      database.browserCommands.filter((command) => command.caseId === caseId)
    );
    const automationEvents = sortByCreatedAtAsc(
      database.automationEvents.filter((event) => event.caseId === caseId)
    );
    const activeDraft = sortByCreatedAtDesc(database.drafts.filter((draft) => draft.caseId === caseId))[0] ?? null;
    const timeline = sortByCreatedAtAsc(database.actions.filter((action) => action.caseId === caseId));

    return {
      case: record,
      artifacts,
      latestResearchRun,
      policySources,
      activeStrategy,
      merchantProfile,
      activeActionPlan,
      actionRuns,
      approvals,
      followUps,
      currentAutomationSession,
      browserSnapshots,
      browserCommands,
      automationEvents,
      activeDraft,
      timeline
    };
  },

  async getPreferredSupportAddress(caseId: string): Promise<string | null> {
    const database = await getDatabaseSnapshot();
    const record = database.cases.find((candidate) => candidate.id === caseId);

    if (!record) {
      throw new NotFoundError("Case not found");
    }

    if (record.merchantContactEmail) {
      return record.merchantContactEmail;
    }

    const sources = database.policySources.filter((source) => source.caseId === caseId);
    for (const source of sources) {
      const supportEmail = source.normalizedFacts.supportEmail;
      if (typeof supportEmail === "string" && supportEmail.length > 0) {
        return supportEmail;
      }
    }

    return null;
  }
};
