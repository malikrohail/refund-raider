export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "paypal"
  | "apple_pay"
  | "shop_pay"
  | "other"
  | "unknown";

export type CaseKind =
  | "refund"
  | "replacement"
  | "cancellation"
  | "billing_fix"
  | "warranty"
  | "other";

export type CasePriority = "normal" | "high" | "urgent";

export type AutomationConfidence = "high" | "medium" | "low";

export type ConsentState = "not_required" | "required" | "requested" | "granted";

export type CaseStatus =
  | "intake"
  | "researching"
  | "planning"
  | "verdict_ready"
  | "action_ready"
  | "draft_ready"
  | "needs_consent"
  | "executing"
  | "sent"
  | "waiting"
  | "needs_ops"
  | "follow_up_needed"
  | "closed";

export type IssueType =
  | "damaged_item"
  | "missing_item"
  | "wrong_item"
  | "late_delivery"
  | "service_not_rendered"
  | "subscription_cancellation"
  | "other";

export type DesiredOutcome =
  | "full_refund"
  | "partial_refund"
  | "replacement"
  | "refund_or_replacement";

export type ArtifactKind =
  | "receipt"
  | "order_email"
  | "screenshot"
  | "product_photo"
  | "support_thread"
  | "other";

export type ResearchRunStatus = "queued" | "running" | "completed" | "failed";

export type PolicySourceType =
  | "refund_policy"
  | "warranty_policy"
  | "support_page"
  | "complaint_context"
  | "faq"
  | "other";

export type StrategyEligibility =
  | "eligible"
  | "likely_eligible"
  | "unclear"
  | "likely_ineligible";

export type RecommendedPath =
  | "support_email_first"
  | "support_form_first"
  | "replacement_first"
  | "card_dispute"
  | "manual_review";

export type ExecutionChannel =
  | "email"
  | "support_form"
  | "portal"
  | "browser_runtime"
  | "in_app"
  | "phone_prep"
  | "ops_queue"
  | "manual";

export type CaseResolution =
  | "refund"
  | "replacement"
  | "cancellation"
  | "billing_fix"
  | "manual_review";

export type ActionPlanStatus = "draft" | "ready" | "in_progress" | "completed" | "blocked";

export type ActionRunKind =
  | "request_refund"
  | "request_replacement"
  | "request_cancellation"
  | "prepare_chargeback"
  | "ops_handoff"
  | "follow_up";

export type ActionRunStatus =
  | "planned"
  | "waiting_for_consent"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type FollowUpStatus = "scheduled" | "due" | "completed" | "canceled";

export type AutomationSessionStatus =
  | "pending"
  | "connected"
  | "observing"
  | "ready"
  | "executing"
  | "completed"
  | "failed";

export type BrowserActionType =
  | "click"
  | "type"
  | "navigate"
  | "scroll"
  | "wait_for_text"
  | "extract"
  | "press_key";

export type BrowserCommandStatus = "pending" | "claimed" | "completed" | "failed";

export type AutomationEventType =
  | "session_created"
  | "extension_connected"
  | "snapshot_updated"
  | "command_queued"
  | "command_completed"
  | "command_failed"
  | "note";

export type DraftStatus = "draft" | "approved" | "sent" | "failed";

export type DraftTone = "firm_polite" | "neutral" | "escalation_ready";

export type ActionType =
  | "research_started"
  | "research_completed"
  | "strategy_created"
  | "action_plan_created"
  | "draft_created"
  | "draft_approved"
  | "consent_requested"
  | "action_run_completed"
  | "email_sent"
  | "email_failed"
  | "ops_handoff"
  | "follow_up_scheduled"
  | "follow_up_recommended";

export type ActionStatus = "pending" | "completed" | "failed";

export interface ProfileRecord {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRecord {
  id: string;
  userId: string;
  merchantName: string;
  merchantUrl: string | null;
  issueSummary: string;
  issueType: IssueType;
  desiredOutcome: DesiredOutcome;
  caseKind: CaseKind;
  purchaseDate: string | null;
  paymentMethod: PaymentMethod;
  status: CaseStatus;
  automationConfidence: AutomationConfidence;
  consentState: ConsentState;
  priority: CasePriority;
  currency: string;
  orderTotalAmount: number | null;
  merchantContactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  caseId: string;
  kind: ArtifactKind;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  sourceText: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ResearchRunRecord {
  id: string;
  caseId: string;
  status: ResearchRunStatus;
  queryBundle: Record<string, unknown>;
  resultSummary: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PolicySourceRecord {
  id: string;
  caseId: string;
  researchRunId: string;
  sourceType: PolicySourceType;
  url: string;
  title: string | null;
  quoteText: string | null;
  normalizedFacts: Record<string, unknown>;
  confidenceScore: number | null;
  createdAt: string;
}

export interface RefundStrategyRecord {
  id: string;
  caseId: string;
  eligibility: StrategyEligibility;
  recommendedPath: RecommendedPath;
  fallbackPath: RecommendedPath | null;
  deadlineAt: string | null;
  plainEnglishSummary: string;
  reasoningNotes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantProfileRecord {
  id: string;
  caseId: string;
  merchantHost: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  policyUrl: string | null;
  portalPath: string | null;
  executionChannelPreference: ExecutionChannel | null;
  confidenceScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionPlanRecord {
  id: string;
  caseId: string;
  status: ActionPlanStatus;
  summary: string;
  recommendedOutcome: CaseResolution;
  primaryChannel: ExecutionChannel;
  fallbackChannel: ExecutionChannel | null;
  automationConfidence: AutomationConfidence;
  requiresConsent: boolean;
  opsFallbackReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionRunRecord {
  id: string;
  caseId: string;
  planId: string;
  actionKind: ActionRunKind;
  executionChannel: ExecutionChannel;
  status: ActionRunStatus;
  title: string;
  description: string;
  requiresConsent: boolean;
  consentState: ConsentState;
  details: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ApprovalGrantRecord {
  id: string;
  caseId: string;
  actionRunId: string;
  scope: "execute_action" | "send_message";
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTaskRecord {
  id: string;
  caseId: string;
  actionRunId: string | null;
  title: string;
  status: FollowUpStatus;
  dueAt: string;
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AutomationSessionRecord {
  id: string;
  caseId: string;
  status: AutomationSessionStatus;
  runtime: "browser_extension";
  tabId: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserSnapshotRecord {
  id: string;
  automationSessionId: string;
  caseId: string;
  pageUrl: string;
  pageTitle: string | null;
  visibleText: string | null;
  domSummary: string | null;
  screenshotDataUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BrowserCommandRecord {
  id: string;
  automationSessionId: string;
  caseId: string;
  actionType: BrowserActionType;
  status: BrowserCommandStatus;
  selector: string | null;
  textValue: string | null;
  targetUrl: string | null;
  waitForText: string | null;
  description: string;
  resultSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AutomationEventRecord {
  id: string;
  automationSessionId: string;
  caseId: string;
  eventType: AutomationEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface DraftRecord {
  id: string;
  caseId: string;
  strategyId: string;
  status: DraftStatus;
  subject: string;
  body: string;
  tone: DraftTone;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionRecord {
  id: string;
  caseId: string;
  draftId: string | null;
  actionType: ActionType;
  status: ActionStatus;
  externalId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  caseId: string;
  role: "user" | "assistant" | "tool";
  messageText: string;
  toolName: string | null;
  toolPayload: Record<string, unknown> | null;
  createdAt: string;
}

export interface GmailConnectionRecord {
  userId: string;
  email: string;
  encryptedRefreshToken: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetailPayload {
  case: CaseRecord;
  artifacts: ArtifactRecord[];
  latestResearchRun: ResearchRunRecord | null;
  policySources: PolicySourceRecord[];
  activeStrategy: RefundStrategyRecord | null;
  merchantProfile: MerchantProfileRecord | null;
  activeActionPlan: ActionPlanRecord | null;
  actionRuns: ActionRunRecord[];
  approvals: ApprovalGrantRecord[];
  followUps: FollowUpTaskRecord[];
  currentAutomationSession: AutomationSessionRecord | null;
  browserSnapshots: BrowserSnapshotRecord[];
  browserCommands: BrowserCommandRecord[];
  automationEvents: AutomationEventRecord[];
  activeDraft: DraftRecord | null;
  timeline: ActionRecord[];
}
