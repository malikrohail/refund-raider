import type {
  ActionRecord,
  ActionPlanRecord,
  ActionRunRecord,
  ApprovalGrantRecord,
  AutomationEventRecord,
  AutomationSessionRecord,
  ArtifactKind,
  ArtifactRecord,
  AutomationConfidence,
  BrowserActionType,
  BrowserCommandRecord,
  BrowserSnapshotRecord,
  CaseKind,
  CaseDetailPayload,
  CaseRecord,
  CaseResolution,
  DesiredOutcome,
  DraftRecord,
  DraftTone,
  ExecutionChannel,
  FollowUpTaskRecord,
  IssueType,
  MerchantProfileRecord,
  PaymentMethod,
  PolicySourceRecord,
  RecommendedPath,
  RefundStrategyRecord,
  ResearchRunRecord,
  StrategyEligibility,
  GmailConnectionRecord
} from "@/lib/contracts/domain";

export interface CreateCaseRequest {
  merchantName: string;
  merchantUrl?: string;
  issueSummary: string;
  issueType: IssueType;
  desiredOutcome: DesiredOutcome;
  caseKind?: CaseKind;
  purchaseDate?: string;
  paymentMethod?: PaymentMethod;
  merchantContactEmail?: string;
}

export interface CreateCaseResponseData {
  case: Pick<CaseRecord, "id" | "status" | "merchantName">;
}

export interface GetCaseResponseData {
  caseDetail: CaseDetailPayload;
}

export interface UpdateCaseRequest {
  merchantName?: string;
  merchantUrl?: string;
  issueSummary?: string;
  issueType?: IssueType;
  desiredOutcome?: DesiredOutcome;
  purchaseDate?: string;
  paymentMethod?: PaymentMethod;
  merchantContactEmail?: string;
}

export interface CreateArtifactRequest {
  kind: ArtifactKind;
  fileName?: string;
  mimeType?: string;
  storagePath?: string;
  sourceText?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateArtifactResponseData {
  artifact: Pick<ArtifactRecord, "id" | "kind">;
}

export interface ListArtifactsResponseData {
  artifacts: ArtifactRecord[];
}

export interface StartResearchRequest {
  forceRefresh?: boolean;
}

export interface StartResearchResponseData {
  researchRun: Pick<ResearchRunRecord, "id" | "status">;
}

export interface GetResearchResponseData {
  researchRun: ResearchRunRecord | null;
  policySources: PolicySourceRecord[];
}

export interface StrategyResponseData {
  strategy: {
    id: RefundStrategyRecord["id"];
    eligibility: StrategyEligibility;
    recommendedPath: RecommendedPath;
    fallbackPath: RecommendedPath | null;
    deadlineAt: string | null;
    plainEnglishSummary: string;
  };
}

export interface CreateDraftRequest {
  tone?: DraftTone;
}

export interface CreateDraftResponseData {
  draft: Pick<DraftRecord, "id" | "subject" | "body" | "status">;
}

export interface UpdateDraftRequest {
  subject?: string;
  body?: string;
  tone?: DraftTone;
}

export interface UpdateDraftResponseData {
  draft: Pick<DraftRecord, "id" | "subject" | "body" | "tone" | "status">;
}

export interface ApproveDraftResponseData {
  draft: Pick<DraftRecord, "id" | "status" | "approvedAt">;
}

export interface SendDraftRequest {
  to: string[];
  ccUser?: boolean;
}

export interface SendDraftResponseData {
  action: Pick<ActionRecord, "id" | "actionType" | "status" | "createdAt">;
}

export interface GetTimelineResponseData {
  timeline: ActionRecord[];
}

export interface CreateAgentSessionRequest {
  caseId: string;
}

export interface CreateAgentSessionResponseData {
  agent: {
    agentId: string;
    caseId: string;
    mode: "configured" | "mock" | "misconfigured";
    preferredTransport?: "websocket" | "webrtc";
    conversationToken?: string;
    signedUrl?: string;
    configurationState?: "mock" | "live_ready" | "missing_tools" | "missing_credentials" | "inspect_failed";
    expectedToolNames?: string[];
    toolNames?: string[];
    missingToolNames?: string[];
    variables: {
      merchantName: string;
      caseStatus: string;
    };
  };
}

export interface ActionPlanResponseData {
  merchantProfile: MerchantProfileRecord | null;
  plan: ActionPlanRecord | null;
  actionRuns: ActionRunRecord[];
  approvals: ApprovalGrantRecord[];
  followUps: FollowUpTaskRecord[];
}

export interface CreateActionPlanResponseData {
  plan: Pick<
    ActionPlanRecord,
    | "id"
    | "status"
    | "summary"
    | "recommendedOutcome"
    | "primaryChannel"
    | "fallbackChannel"
    | "automationConfidence"
    | "requiresConsent"
    | "opsFallbackReason"
  >;
  merchantProfile: MerchantProfileRecord | null;
  actionRuns: ActionRunRecord[];
  followUps: FollowUpTaskRecord[];
}

export interface ListCaseActionsResponseData {
  actionRuns: ActionRunRecord[];
}

export interface RunActionResponseData {
  actionRun: ActionRunRecord;
  approval: ApprovalGrantRecord | null;
}

export interface ApproveActionResponseData {
  actionRun: ActionRunRecord;
  approval: ApprovalGrantRecord;
}

export interface CreateFollowUpRequest {
  title?: string;
  dueAt?: string;
}

export interface FollowUpResponseData {
  followUp: FollowUpTaskRecord;
}

export interface ParseIntakeRequest {
  rawText?: string;
  merchantUrlHint?: string;
}

export interface IntakeSuggestion {
  merchantName: string;
  merchantUrl?: string;
  issueSummary: string;
  issueType: IssueType;
  desiredOutcome: DesiredOutcome;
  caseKind?: CaseKind;
  purchaseDate?: string;
  paymentMethod: PaymentMethod;
  merchantContactEmail?: string | null;
  artifactKind: ArtifactKind;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface ParseIntakeResponseData {
  suggestion: IntakeSuggestion;
}

export interface ParseIntakeUploadResponseData {
  suggestion: IntakeSuggestion;
  extractedText: string;
}

export interface GmailConnectionStatusResponseData {
  gmail: {
    available: boolean;
    connected: boolean;
    email: string | null;
    requiresAuth: boolean;
  };
}

export interface GmailSearchRequest {
  query: string;
}

export interface GmailSearchResult {
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  rawText: string;
  suggestion: IntakeSuggestion;
}

export interface GmailSearchResponseData {
  messages: GmailSearchResult[];
}

export interface GmailDisconnectResponseData {
  gmail: Pick<GmailConnectionRecord, "email"> | null;
}

export interface ActionPlanSummary {
  recommendedOutcome: CaseResolution;
  primaryChannel: ExecutionChannel;
  automationConfidence: AutomationConfidence;
}

export interface CreateAutomationSessionRequest {
  caseId: string;
}

export interface BrowserExtensionHandshakeRequest {
  tabId?: string;
  pageUrl?: string;
  pageTitle?: string;
}

export interface BrowserSnapshotRequest {
  pageUrl: string;
  pageTitle?: string;
  visibleText?: string;
  domSummary?: string;
  screenshotDataUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueBrowserCommandRequest {
  actionType: BrowserActionType;
  description: string;
  selector?: string;
  textValue?: string;
  targetUrl?: string;
  waitForText?: string;
  metadata?: Record<string, unknown>;
}

export interface BrowserCommandCompletionRequest {
  status: "completed" | "failed";
  resultSummary?: string;
  metadata?: Record<string, unknown>;
}

export interface FirecrawlExtractRequest {
  urls: string[];
  prompt: string;
  schema?: Record<string, unknown>;
}

export interface FirecrawlStartCrawlRequest {
  url: string;
  prompt?: string;
  limit?: number;
}

export interface FirecrawlExtractResponseData {
  result: Record<string, unknown>;
}

export interface FirecrawlStartCrawlResponseData {
  crawlJob: {
    id: string;
    status: string;
  };
}

export interface FirecrawlCrawlStatusResponseData {
  crawlJob: Record<string, unknown>;
}

export interface AutomationSessionResponseData {
  automationSession: AutomationSessionRecord | null;
  browserSnapshots: BrowserSnapshotRecord[];
  browserCommands: BrowserCommandRecord[];
  automationEvents: AutomationEventRecord[];
}

export interface CreateAutomationSessionResponseData {
  automationSession: AutomationSessionRecord;
}

export interface BrowserHandshakeResponseData {
  automationSession: AutomationSessionRecord;
}

export interface BrowserSnapshotResponseData {
  snapshot: BrowserSnapshotRecord;
}

export interface QueueBrowserCommandResponseData {
  browserCommand: BrowserCommandRecord;
}

export interface ClaimBrowserCommandResponseData {
  browserCommand: BrowserCommandRecord | null;
}

export interface CompleteBrowserCommandResponseData {
  browserCommand: BrowserCommandRecord;
}
