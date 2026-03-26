import type {
  AutomationConfidence,
  CaseResolution,
  DesiredOutcome,
  DraftTone,
  ExecutionChannel,
  IssueType,
  PaymentMethod,
  RecommendedPath,
  StrategyEligibility
} from "@/lib/contracts/domain";

export interface CreateCaseToolInput {
  merchantName: string;
  merchantUrl?: string;
  issueSummary: string;
  issueType: IssueType;
  desiredOutcome: DesiredOutcome;
  purchaseDate?: string;
  paymentMethod?: PaymentMethod;
}

export interface CreateCaseToolOutput {
  caseId: string;
  status: string;
}

export interface GetIntakeStateToolOutput {
  snapshot: string;
}

export interface UpdateIntakeFieldsToolInput extends Partial<CreateCaseToolInput> {
  merchantContactEmail?: string;
}

export interface CaptureUserProblemToolInput {
  rawText: string;
}

export interface SearchGmailMessagesToolInput {
  query: string;
}

export interface SelectGmailMessageToolInput {
  messageId: string;
}

export interface LookupPolicyEvidenceToolInput {
  caseId: string;
  forceRefresh?: boolean;
}

export interface LookupPolicyEvidenceToolOutput {
  researchRunId: string;
  status: string;
  sourceCount?: number;
}

export interface SummarizeEligibilityToolInput {
  caseId: string;
}

export interface SummarizeEligibilityToolOutput {
  eligibility: StrategyEligibility;
  recommendedPath: RecommendedPath;
  fallbackPath?: RecommendedPath;
  deadlineText?: string;
  plainEnglishSummary: string;
}

export interface CreateRefundDraftToolInput {
  caseId: string;
  tone?: DraftTone;
}

export interface CreateRefundDraftToolOutput {
  draftId: string;
  subject: string;
  body: string;
}

export interface SendRefundEmailToolInput {
  caseId: string;
  draftId: string;
  to: string[];
  ccUser?: boolean;
}

export interface SendRefundEmailToolOutput {
  actionId: string;
  deliveryStatus: string;
}

export interface BrowserSnapshotToolInput {
  selector?: string;
}

export interface BrowserSnapshotToolOutput {
  title: string;
  url: string;
  visibleText: string;
}

export interface StartBrowserSessionToolInput {
  caseId: string;
}

export interface StartBrowserSessionToolOutput {
  sessionId: string;
  status: string;
}

export interface BrowserNavigateToolInput {
  targetUrl: string;
}

export interface BrowserClickToolInput {
  selector: string;
}

export interface BrowserTypeToolInput {
  selector: string;
  textValue: string;
  clear?: boolean;
}

export interface BrowserScrollToolInput {
  selector?: string;
  scrollAmount?: number;
  direction?: "up" | "down";
}

export interface BrowserWaitForTextToolInput {
  waitForText: string;
  timeoutMs?: number;
}

export interface BrowserExtractToolInput {
  selector?: string;
}

export interface BrowserPressKeyToolInput {
  selector?: string;
  key: string;
}

export interface GetCaseStatusToolInput {
  caseId: string;
}

export interface GetCaseStatusToolOutput {
  caseStatus: string;
  latestStep: string;
  nextRecommendedAction?: string;
}

export interface BuildActionPlanToolInput {
  caseId: string;
}

export interface BuildActionPlanToolOutput {
  planId: string;
  primaryChannel: ExecutionChannel;
  recommendedOutcome: CaseResolution;
  automationConfidence: AutomationConfidence;
}

export interface RequestUserConsentToolInput {
  actionId: string;
}

export interface RequestUserConsentToolOutput {
  actionId: string;
  status: "waiting_for_consent" | "approved";
}

export interface ExecuteCaseActionToolInput {
  actionId: string;
}

export interface ExecuteCaseActionToolOutput {
  actionId: string;
  status: string;
}

export interface ScheduleFollowUpToolInput {
  caseId: string;
  title?: string;
}

export interface ScheduleFollowUpToolOutput {
  followUpId: string;
  dueAt: string;
}

export interface FirecrawlExtractToolInput {
  urls: string[];
  prompt: string;
}

export interface FirecrawlExtractStatusToolInput {
  extractId: string;
}

export interface FirecrawlStartCrawlToolInput {
  url: string;
  prompt?: string;
  limit?: number;
}

export interface FirecrawlCrawlStatusToolInput {
  crawlId: string;
}

export const elevenAgentToolDefinitions = [
  {
    name: "get_intake_state",
    description: "Return the current intake snapshot for conversational continuity.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "update_intake_fields",
    description: "Update structured intake fields when the user gives explicit details.",
    inputSchema: {
      type: "object",
      properties: {
        merchantName: { type: "string" },
        merchantUrl: { type: "string" },
        issueSummary: { type: "string" },
        issueType: {
          type: "string",
          enum: [
            "damaged_item",
            "missing_item",
            "wrong_item",
            "late_delivery",
            "service_not_rendered",
            "subscription_cancellation",
            "other"
          ]
        },
        desiredOutcome: {
          type: "string",
          enum: ["full_refund", "partial_refund", "replacement", "refund_or_replacement"]
        },
        purchaseDate: { type: "string" },
        paymentMethod: {
          type: "string",
          enum: [
            "credit_card",
            "debit_card",
            "paypal",
            "apple_pay",
            "shop_pay",
            "other",
            "unknown"
          ]
        },
        merchantContactEmail: { type: "string" }
      },
      required: []
    }
  },
  {
    name: "capture_user_problem",
    description: "Parse a messy user description or pasted context into structured intake.",
    inputSchema: {
      type: "object",
      properties: {
        rawText: { type: "string" }
      },
      required: ["rawText"]
    }
  },
  {
    name: "connect_gmail",
    description: "Start the Gmail connect flow when the user agrees.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_gmail_messages",
    description: "Search the connected Gmail inbox for receipts or support threads.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  },
  {
    name: "select_gmail_message",
    description: "Use one Gmail search result to populate the intake.",
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "string" }
      },
      required: ["messageId"]
    }
  },
  {
    name: "create_case",
    description: "Create a refund case from structured user intake.",
    inputSchema: {
      type: "object",
      properties: {
        merchantName: { type: "string" },
        merchantUrl: { type: "string" },
        issueSummary: { type: "string" },
        issueType: {
          type: "string",
          enum: [
            "damaged_item",
            "missing_item",
            "wrong_item",
            "late_delivery",
            "service_not_rendered",
            "subscription_cancellation",
            "other"
          ]
        },
        desiredOutcome: {
          type: "string",
          enum: ["full_refund", "partial_refund", "replacement", "refund_or_replacement"]
        },
        purchaseDate: { type: "string" },
        paymentMethod: {
          type: "string",
          enum: [
            "credit_card",
            "debit_card",
            "paypal",
            "apple_pay",
            "shop_pay",
            "other",
            "unknown"
          ]
        }
      },
      required: ["merchantName", "issueSummary", "issueType", "desiredOutcome"]
    }
  },
  {
    name: "lookup_policy_evidence",
    description: "Trigger or refresh refund-policy research for a case.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" },
        forceRefresh: { type: "boolean" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "summarize_eligibility",
    description: "Return the current eligibility verdict and recommended path for a case.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "create_refund_draft",
    description: "Generate a refund email draft from the active strategy.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" },
        tone: { type: "string", enum: ["firm_polite", "neutral", "escalation_ready"] }
      },
      required: ["caseId"]
    }
  },
  {
    name: "send_refund_email",
    description: "Send the approved refund draft to the merchant support address.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" },
        draftId: { type: "string" },
        to: {
          type: "array",
          items: { type: "string" }
        },
        ccUser: { type: "boolean" }
      },
      required: ["caseId", "draftId", "to"]
    }
  },
  {
    name: "get_case_status",
    description: "Return the current case state for conversational continuity.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "build_action_plan",
    description: "Translate the evidence-backed verdict into executable case actions.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "request_user_consent",
    description: "Request user approval before a sensitive action runs.",
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string" }
      },
      required: ["actionId"]
    }
  },
  {
    name: "execute_case_action",
    description: "Run the next planned action for the case or ops fallback lane.",
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string" }
      },
      required: ["actionId"]
    }
  },
  {
    name: "schedule_follow_up",
    description: "Create a follow-up task when the merchant has not replied yet.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" },
        title: { type: "string" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "firecrawl_extract",
    description: "Ask Firecrawl to extract structured support or policy details from one or more URLs.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" }
        },
        prompt: { type: "string" }
      },
      required: ["urls", "prompt"]
    }
  },
  {
    name: "firecrawl_get_extract_status",
    description: "Check the status of a Firecrawl extract job.",
    inputSchema: {
      type: "object",
      properties: {
        extractId: { type: "string" }
      },
      required: ["extractId"]
    }
  },
  {
    name: "firecrawl_start_crawl",
    description: "Start a Firecrawl crawl for deeper support-path discovery.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        prompt: { type: "string" },
        limit: { type: "number" }
      },
      required: ["url"]
    }
  },
  {
    name: "firecrawl_get_crawl_status",
    description: "Check the status of a Firecrawl crawl job.",
    inputSchema: {
      type: "object",
      properties: {
        crawlId: { type: "string" }
      },
      required: ["crawlId"]
    }
  }
] as const;

export const browserAutomationToolDefinitions = [
  {
    name: "start_browser_session",
    description: "Create or reuse a browser automation session for the current case.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" }
      },
      required: ["caseId"]
    }
  },
  {
    name: "browser_snapshot",
    description: "Capture the current page title, URL, and visible text for browser context.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" }
      }
    }
  },
  {
    name: "browser_navigate",
    description: "Open a supported URL in the browser.",
    inputSchema: {
      type: "object",
      properties: {
        targetUrl: { type: "string" }
      },
      required: ["targetUrl"]
    }
  },
  {
    name: "browser_click",
    description: "Click a page element identified by a CSS selector.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" }
      },
      required: ["selector"]
    }
  },
  {
    name: "browser_type",
    description: "Type text into an input, textarea, or contenteditable element.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        textValue: { type: "string" },
        clear: { type: "boolean" }
      },
      required: ["selector", "textValue"]
    }
  },
  {
    name: "browser_scroll",
    description: "Scroll the page or a matched element into view.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        scrollAmount: { type: "number" },
        direction: { type: "string", enum: ["up", "down"] }
      }
    }
  },
  {
    name: "browser_wait_for_text",
    description: "Wait until text appears in the browser content.",
    inputSchema: {
      type: "object",
      properties: {
        waitForText: { type: "string" },
        timeoutMs: { type: "number" }
      },
      required: ["waitForText"]
    }
  },
  {
    name: "browser_extract",
    description: "Read the visible text from the page or a selected element.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" }
      }
    }
  },
  {
    name: "browser_press_key",
    description: "Send a keyboard key to the active element or a matched selector.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        key: { type: "string" }
      },
      required: ["key"]
    }
  }
] as const;

export const refundRaiderAgentToolDefinitions = [
  ...elevenAgentToolDefinitions,
  ...browserAutomationToolDefinitions
] as const;
