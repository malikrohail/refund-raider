import { z } from "zod";

export const createCaseSchema = z.object({
  merchantName: z.string().min(1),
  merchantUrl: z.string().url().optional().or(z.literal("")),
  issueSummary: z.string().min(1),
  issueType: z.enum([
    "damaged_item",
    "missing_item",
    "wrong_item",
    "late_delivery",
    "service_not_rendered",
    "subscription_cancellation",
    "other"
  ]),
  desiredOutcome: z.enum(["full_refund", "partial_refund", "replacement", "refund_or_replacement"]),
  caseKind: z
    .enum(["refund", "replacement", "cancellation", "billing_fix", "warranty", "other"])
    .optional(),
  purchaseDate: z.string().optional(),
  paymentMethod: z
    .enum(["credit_card", "debit_card", "paypal", "apple_pay", "shop_pay", "other", "unknown"])
    .optional(),
  merchantContactEmail: z.string().email().optional().or(z.literal(""))
});

export const updateCaseSchema = createCaseSchema.partial();
export const updateCaseWithContactSchema = updateCaseSchema.extend({
  merchantContactEmail: z.string().email().optional().or(z.literal(""))
});

export const createArtifactJsonSchema = z.object({
  kind: z.enum(["receipt", "order_email", "screenshot", "product_photo", "support_thread", "other"]),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  storagePath: z.string().optional(),
  sourceText: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const startResearchSchema = z.object({
  forceRefresh: z.boolean().optional()
});

export const createDraftSchema = z.object({
  tone: z.enum(["firm_polite", "neutral", "escalation_ready"]).optional()
});

export const updateDraftSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  tone: z.enum(["firm_polite", "neutral", "escalation_ready"]).optional()
});

export const sendDraftSchema = z.object({
  to: z.array(z.string().email()).min(1),
  ccUser: z.boolean().optional()
});

export const createAgentSessionSchema = z.object({
  caseId: z.string().min(1)
});

export const createAutomationSessionSchema = z.object({
  caseId: z.string().min(1)
});

export const browserExtensionHandshakeSchema = z.object({
  tabId: z.string().optional(),
  pageUrl: z.string().url().optional(),
  pageTitle: z.string().optional()
});

export const browserSnapshotSchema = z.object({
  pageUrl: z.string().url(),
  pageTitle: z.string().optional(),
  visibleText: z.string().optional(),
  domSummary: z.string().optional(),
  screenshotDataUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const queueBrowserCommandSchema = z.object({
  actionType: z.enum(["click", "type", "navigate", "scroll", "wait_for_text", "extract", "press_key"]),
  description: z.string().min(1),
  selector: z.string().optional(),
  textValue: z.string().optional(),
  targetUrl: z.string().url().optional(),
  waitForText: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const completeBrowserCommandSchema = z.object({
  status: z.enum(["completed", "failed"]),
  resultSummary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const firecrawlExtractSchema = z.object({
  urls: z.array(z.string().url()).min(1),
  prompt: z.string().min(1),
  schema: z.record(z.string(), z.unknown()).optional()
});

export const firecrawlStartCrawlSchema = z.object({
  url: z.string().url(),
  prompt: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional()
});

export const createFollowUpSchema = z.object({
  title: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional()
});

export const parseIntakeSchema = z
  .object({
    rawText: z.string().optional(),
    merchantUrlHint: z.string().optional()
  })
  .refine((value) => Boolean(value.rawText?.trim() || value.merchantUrlHint?.trim()), {
    message: "Paste an order/support message or provide a merchant URL."
  });
