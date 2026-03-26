import type { ArtifactKind, DesiredOutcome, IssueType, PaymentMethod } from "@/lib/contracts/domain";
import type { IntakeSuggestion, ParseIntakeRequest } from "@/lib/contracts/api";

const merchantPatternMatchers = [
  /from:\s*([A-Za-z0-9&'.,\- ]{2,80})\s*</i,
  /thank(?:s| you)? for (?:shopping|ordering) (?:with|from)\s+([A-Za-z0-9&'.,\- ]{2,80})/i,
  /order (?:from|with)\s+([A-Za-z0-9&'.,\- ]{2,80})/i,
  /merchant(?: name)?:\s*([A-Za-z0-9&'.,\- ]{2,80})/i
];

const monthNamePattern =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/gi;

function compactWhitespace(value: string) {
  return value.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function stripMerchantNoise(value: string) {
  return value
    .replace(/\b(customer support|support|team|returns?|help|customer service|order confirmation)\b/gi, "")
    .replace(/[|:]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getRegistrableLabel(hostname: string) {
  const parts = hostname.replace(/^www\./i, "").split(".").filter(Boolean);
  if (parts.length === 0) {
    return "";
  }

  if (parts.length >= 3 && parts.at(-1)?.length === 2 && (parts.at(-2)?.length ?? 0) <= 3) {
    return parts.at(-3) ?? parts[0];
  }

  return parts.length >= 2 ? parts.at(-2) ?? parts[0] : parts[0];
}

function normalizeMerchantUrl(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withProtocol);
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `https://${url.hostname}${pathname}`;
  } catch {
    return null;
  }
}

function extractUrls(text: string) {
  return Array.from(
    new Set(
      (text.match(/\b(?:https?:\/\/|www\.)[^\s<>()]+/gi) ?? [])
        .map((value) => normalizeMerchantUrl(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

function extractEmails(text: string) {
  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []));
}

function inferMerchantNameFromUrl(merchantUrl: string | null) {
  if (!merchantUrl) {
    return null;
  }

  try {
    const host = new URL(merchantUrl).hostname;
    const label = getRegistrableLabel(host).replace(/[-_]+/g, " ");
    return stripMerchantNoise(titleCase(label)) || null;
  } catch {
    return null;
  }
}

function inferMerchantNameFromEmailDomain(email: string) {
  const domain = email.split("@")[1];
  if (!domain) {
    return null;
  }

  return inferMerchantNameFromUrl(`https://${domain}`);
}

function detectMerchantName(rawText: string, merchantUrl: string | null, emails: string[], signals: string[]) {
  for (const pattern of merchantPatternMatchers) {
    const match = rawText.match(pattern);
    const candidate = stripMerchantNoise(match?.[1] ?? "");
    if (candidate.length >= 2) {
      signals.push("Detected merchant name from pasted message.");
      return candidate;
    }
  }

  const merchantEmail = emails.find((email) => !/(gmail|yahoo|hotmail|outlook|icloud)\./i.test(email));
  if (merchantEmail) {
    const candidate = inferMerchantNameFromEmailDomain(merchantEmail);
    if (candidate) {
      signals.push("Detected merchant name from email domain.");
      return candidate;
    }
  }

  const fromUrl = inferMerchantNameFromUrl(merchantUrl);
  if (fromUrl) {
    signals.push("Detected merchant name from merchant URL.");
    return fromUrl;
  }

  signals.push("Merchant name needs manual review.");
  return "";
}

function scoreIssueType(rawText: string, type: IssueType) {
  const lower = rawText.toLowerCase();
  const checks: Record<IssueType, RegExp[]> = {
    damaged_item: [
      /\bdamaged\b/,
      /\bbroken\b/,
      /\bcracked\b/,
      /\bdefective\b/,
      /\bfaulty\b/,
      /\bdoes(?:n't| not) work\b/,
      /\barrived damaged\b/
    ],
    missing_item: [
      /\bmissing\b/,
      /\bnever arrived\b/,
      /\bnever received\b/,
      /\bnot delivered\b/,
      /\bempty box\b/,
      /\blost package\b/
    ],
    wrong_item: [/\bwrong item\b/, /\bincorrect item\b/, /\bnot what i ordered\b/, /\bwrong size\b/, /\bwrong color\b/],
    late_delivery: [/\blate\b/, /\bdelayed\b/, /\bdelivery window\b/, /\bstill not arrived\b/, /\bmissed delivery\b/],
    service_not_rendered: [
      /\bservice not rendered\b/,
      /\bnever received the service\b/,
      /\bappointment .* cancelled\b/,
      /\bservice was not provided\b/
    ],
    subscription_cancellation: [
      /\bsubscription\b/,
      /\bcancel(?:led|ed)?\b/,
      /\brenewal\b/,
      /\bbilled again\b/,
      /\bauto-?renew/i
    ],
    other: []
  };

  return checks[type].reduce((score, pattern) => score + (pattern.test(lower) ? 1 : 0), 0);
}

function detectIssueType(rawText: string, signals: string[]): IssueType {
  const candidates: IssueType[] = [
    "damaged_item",
    "missing_item",
    "wrong_item",
    "late_delivery",
    "service_not_rendered",
    "subscription_cancellation"
  ];

  const best = candidates
    .map((type) => ({ type, score: scoreIssueType(rawText, type) }))
    .sort((left, right) => right.score - left.score)[0];

  if (!best || best.score === 0) {
    signals.push("Issue type needs manual review.");
    return "other";
  }

  signals.push(`Detected issue type: ${best.type.replaceAll("_", " ")}.`);
  return best.type;
}

function detectDesiredOutcome(rawText: string, issueType: IssueType, signals: string[]): DesiredOutcome {
  const lower = rawText.toLowerCase();
  if (/\bpartial refund\b/.test(lower)) {
    signals.push("Detected partial refund request.");
    return "partial_refund";
  }

  if (/\b(refund or replacement|refund or replace|replace or refund)\b/.test(lower)) {
    signals.push("Detected refund-or-replacement request.");
    return "refund_or_replacement";
  }

  const wantsReplacement = /\b(replacement|replace|exchange)\b/.test(lower);
  const wantsRefund = /\brefund\b/.test(lower);

  if (wantsReplacement && wantsRefund) {
    signals.push("Detected refund-or-replacement request.");
    return "refund_or_replacement";
  }

  if (wantsReplacement) {
    signals.push("Detected replacement request.");
    return "replacement";
  }

  if (wantsRefund) {
    signals.push("Detected refund request.");
    return "full_refund";
  }

  if (issueType === "damaged_item" || issueType === "wrong_item") {
    signals.push("Defaulted desired outcome to refund or replacement based on the issue.");
    return "refund_or_replacement";
  }

  signals.push("Defaulted desired outcome to full refund.");
  return "full_refund";
}

function detectPaymentMethod(rawText: string, signals: string[]): PaymentMethod {
  const lower = rawText.toLowerCase();

  if (/\bpaypal\b/.test(lower)) {
    signals.push("Detected PayPal as the payment method.");
    return "paypal";
  }

  if (/\bapple pay\b/.test(lower)) {
    signals.push("Detected Apple Pay as the payment method.");
    return "apple_pay";
  }

  if (/\bshop pay\b/.test(lower)) {
    signals.push("Detected Shop Pay as the payment method.");
    return "shop_pay";
  }

  if (/\bdebit\b/.test(lower)) {
    signals.push("Detected debit card as the payment method.");
    return "debit_card";
  }

  if (/\bvisa\b|\bmastercard\b|\bamex\b|\bcredit card\b/.test(lower)) {
    signals.push("Detected credit card as the payment method.");
    return "credit_card";
  }

  return "unknown";
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function detectPurchaseDate(rawText: string, signals: string[]) {
  const lines = rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const purchaseLine =
    lines.find((line) => /(order placed|purchased|bought|ordered on|purchase date|charged on)/i.test(line)) ?? "";

  const dateCandidates = [
    ...(purchaseLine.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []),
    ...(purchaseLine.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? []),
    ...(purchaseLine.match(monthNamePattern) ?? []),
    ...(rawText.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []),
    ...(rawText.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? []),
    ...(rawText.match(monthNamePattern) ?? [])
  ];

  for (const candidate of dateCandidates) {
    const normalized = normalizeDate(candidate);
    if (normalized) {
      signals.push(`Detected purchase date: ${normalized}.`);
      return normalized;
    }
  }

  return undefined;
}

function detectSupportEmail(emails: string[], merchantUrl: string | null, signals: string[]) {
  const merchantHost = merchantUrl ? new URL(merchantUrl).hostname.replace(/^www\./i, "") : null;
  const ranked = emails
    .map((email) => {
      const [localPart, domain] = email.toLowerCase().split("@");
      let score = 0;

      if (/(support|help|returns?|care|service)/.test(localPart)) score += 5;
      if (merchantHost && domain === merchantHost) score += 3;
      if (merchantHost && domain.endsWith(`.${merchantHost}`)) score += 2;
      if (/(no-?reply|do-?not-?reply)/.test(localPart)) score -= 5;

      return { email, score };
    })
    .sort((left, right) => right.score - left.score);

  if (ranked[0] && ranked[0].score > 0) {
    signals.push("Detected a likely merchant support email.");
    return ranked[0].email;
  }

  return null;
}

function detectArtifactKind(rawText: string): ArtifactKind {
  const lower = rawText.toLowerCase();
  if (/(order #|order confirmation|thanks for your order|tracking number|shipment|order placed|subject:.*order)/.test(lower)) {
    return "order_email";
  }

  if (/(re:|support ticket|case #|customer support|agent replied|chat transcript)/.test(lower)) {
    return "support_thread";
  }

  return "other";
}

function buildIssueSummary(rawText: string, merchantName: string, issueType: IssueType, desiredOutcome: DesiredOutcome) {
  const relevantLines = rawText
    .split(/\n+/)
    .map((line) => compactWhitespace(line))
    .filter(
      (line) =>
        line.length > 0 &&
        !/^(from|to|subject|sent|date):/i.test(line) &&
        /(damaged|broken|cracked|defective|wrong item|incorrect|missing|never arrived|refund|return|replacement|support|replied|charged|cancel)/i.test(
          line
        )
    );

  if (relevantLines.length > 0) {
    return relevantLines.slice(0, 2).join(" ").slice(0, 220);
  }

  const merchantLabel = merchantName || "the merchant";
  const outcomeLabel = desiredOutcome.replaceAll("_", " ");

  switch (issueType) {
    case "damaged_item":
      return `My order from ${merchantLabel} arrived damaged and I want a ${outcomeLabel}.`;
    case "wrong_item":
      return `I received the wrong item from ${merchantLabel} and I want a ${outcomeLabel}.`;
    case "missing_item":
      return `My ${merchantLabel} order is missing and I want a ${outcomeLabel}.`;
    case "late_delivery":
      return `My ${merchantLabel} order is late and I need help resolving it.`;
    case "subscription_cancellation":
      return `I canceled ${merchantLabel} but I still need the billing fixed.`;
    case "service_not_rendered":
      return `${merchantLabel} never delivered the promised service and I want a ${outcomeLabel}.`;
    default:
      return compactWhitespace(rawText).slice(0, 220);
  }
}

function calculateConfidence(merchantName: string, issueSummary: string, purchaseDate?: string, supportEmail?: string | null) {
  let score = 0;
  if (merchantName) score += 1;
  if (issueSummary.length >= 25) score += 1;
  if (purchaseDate) score += 1;
  if (supportEmail) score += 1;

  if (score >= 4) {
    return "high" as const;
  }

  if (score >= 2) {
    return "medium" as const;
  }

  return "low" as const;
}

export function parseIntakeRequest(input: ParseIntakeRequest): IntakeSuggestion {
  const rawText = compactWhitespace(input.rawText ?? "");
  const signals: string[] = [];
  const merchantUrl =
    normalizeMerchantUrl(input.merchantUrlHint) ?? extractUrls(rawText)[0] ?? null;
  const emails = extractEmails(rawText);
  const merchantName = detectMerchantName(rawText, merchantUrl, emails, signals);
  const issueType = detectIssueType(rawText, signals);
  const desiredOutcome = detectDesiredOutcome(rawText, issueType, signals);
  const paymentMethod = detectPaymentMethod(rawText, signals);
  const purchaseDate = detectPurchaseDate(rawText, signals);
  const merchantContactEmail = detectSupportEmail(emails, merchantUrl, signals);
  const issueSummary = buildIssueSummary(rawText, merchantName, issueType, desiredOutcome);
  const artifactKind = detectArtifactKind(rawText);
  const confidence = calculateConfidence(merchantName, issueSummary, purchaseDate, merchantContactEmail);

  return {
    merchantName,
    ...(merchantUrl ? { merchantUrl } : {}),
    issueSummary,
    issueType,
    desiredOutcome,
    ...(purchaseDate ? { purchaseDate } : {}),
    paymentMethod,
    merchantContactEmail,
    artifactKind,
    confidence,
    signals
  };
}
