import { env, getProviderRuntimeState, type ProviderRuntimeState } from "@/lib/config/env";

export interface FirecrawlSearchResult {
  title: string;
  description: string;
  url: string;
  markdown: string;
  sourceType: "refund_policy" | "warranty_policy" | "support_page" | "complaint_context" | "faq" | "other";
  confidenceScore: number;
  supportEmail?: string;
  providerMode?: ProviderRuntimeState["mode"];
}

export interface FirecrawlExtractJob {
  id: string;
  status: string;
  data?: Array<Record<string, unknown>>;
  providerMode?: ProviderRuntimeState["mode"];
}

export interface FirecrawlCrawlJob {
  id: string;
  status: string;
  data?: Array<Record<string, unknown>>;
  providerMode?: ProviderRuntimeState["mode"];
}

export interface FirecrawlProviderState extends ProviderRuntimeState {
  provider: "firecrawl";
}

const noisyPatterns = [
  /^none$/i,
  /^sponsored$/i,
  /^main content$/i,
  /^shop now$/i,
  /^back$/i,
  /^cancel$/i,
  /^switch profile$/i,
 /^location announcement\./i
];

function normalizeHost(rawUrl: string | null) {
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function detectSourceType(url: string, markdown: string): FirecrawlSearchResult["sourceType"] {
  const lowerUrl = url.toLowerCase();
  const lowerMarkdown = markdown.toLowerCase();

  if (lowerUrl.includes("warranty") || lowerMarkdown.includes("warranty")) {
    return "warranty_policy";
  }

  if (lowerUrl.includes("support") || lowerUrl.includes("contact")) {
    return "support_page";
  }

  if (lowerUrl.includes("faq")) {
    return "faq";
  }

  if (lowerMarkdown.includes("refund") || lowerMarkdown.includes("return")) {
    return "refund_policy";
  }

  return "other";
}

function extractSupportEmail(markdown: string) {
  const match = markdown.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return match?.[0];
}

function normalizeLine(line: string) {
  return line
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
    .replace(/[*#>`_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoisyLine(line: string) {
  if (!line) {
    return true;
  }

  return noisyPatterns.some((pattern) => pattern.test(line));
}

function scoreLine(line: string) {
  const lower = line.toLowerCase();
  let score = 0;

  if (/(refund|return|exchange)/.test(lower)) score += 3;
  if (/(damaged|defective|wrong item|missing item)/.test(lower)) score += 3;
  if (/(support|contact|email|call|chat)/.test(lower)) score += 2;
  if (/(day|days|business day|calendar day)/.test(lower)) score += 2;
  if (/(warranty|policy|eligible|proof)/.test(lower)) score += 1;

  return score;
}

function buildCleanSnippet(markdown: string) {
  const lines = markdown
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => !isNoisyLine(line));

  if (lines.length === 0) {
    return "";
  }

  const scored = lines
    .map((line) => ({
      line,
      score: scoreLine(line)
    }))
    .filter((item) => item.score > 0);

  const selected = (scored.length > 0 ? scored : lines.map((line) => ({ line, score: 0 })))
    .slice(0, 5)
    .map((item) => item.line)
    .filter((line, index, array) => array.indexOf(line) === index);

  return selected.join("\n").slice(0, 900);
}

export function getFirecrawlRuntimeState(): FirecrawlProviderState {
  return {
    ...getProviderRuntimeState("firecrawl", Boolean(env.firecrawlApiKey)),
    provider: "firecrawl"
  };
}

function createMockId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function runLiveFirecrawlSearch(merchantName: string, merchantUrl: string | null, issueSummary: string) {
  const host = normalizeHost(merchantUrl);
  const queries = [
    host ? `site:${host} refund policy returns damaged item` : `${merchantName} refund policy`,
    host ? `site:${host} support contact returns policy` : `${merchantName} support contact refund`,
    host ? `site:${host} warranty damaged defective support` : `${merchantName} warranty damaged item`
  ];

  const results: FirecrawlSearchResult[] = [];

  for (const query of queries) {
    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.firecrawlApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        limit: 3,
        sources: ["web"],
        ignoreInvalidURLs: true,
        scrapeOptions: {
          formats: ["markdown"]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl search failed with status ${response.status}`);
    }

    const body = (await response.json()) as {
      success: boolean;
      data?: {
        web?: Array<{
          title?: string;
          description?: string;
          url?: string;
          markdown?: string;
        }>;
      };
    };

    for (const item of body.data?.web ?? []) {
      if (!item.url || !item.title) {
        continue;
      }

      const markdown = item.markdown ?? item.description ?? "";
      const cleanedMarkdown = buildCleanSnippet(markdown) || markdown;
      results.push({
        title: item.title,
        description: item.description ?? "",
        url: item.url,
        markdown: cleanedMarkdown,
        sourceType: detectSourceType(item.url, cleanedMarkdown),
        confidenceScore: 0.8,
        supportEmail: extractSupportEmail(markdown),
        providerMode: "live"
      });
    }
  }

  if (results.length === 0) {
    throw new Error(`Firecrawl returned no usable results for ${merchantName}: ${issueSummary}`);
  }

  return results;
}

function buildMockRefundResults(merchantName: string, merchantUrl: string | null, issueSummary: string) {
  const host = normalizeHost(merchantUrl) ?? `${merchantName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const supportEmail = `support@${host}`;
  const returnWindow = issueSummary.toLowerCase().includes("subscription") ? "14 days" : "30 days";

  return [
    {
      title: `${merchantName} Returns Policy`,
      description: `Returns accepted within ${returnWindow} for damaged or defective items.`,
      url: `https://${host}/returns-policy`,
      markdown: `Returns accepted within ${returnWindow}. Damaged or defective items are eligible for a refund with proof of purchase. Contact ${supportEmail} for help.`,
      sourceType: "refund_policy" as const,
      confidenceScore: 0.92,
      supportEmail,
      providerMode: "mock"
    },
    {
      title: `${merchantName} Warranty and Support`,
      description: "Support instructions for damaged items and replacements.",
      url: `https://${host}/support/warranty`,
      markdown: `If your item arrived damaged, contact ${supportEmail} and include your order number, photos, and a short description of the damage.`,
      sourceType: "warranty_policy" as const,
      confidenceScore: 0.81,
      supportEmail,
      providerMode: "mock"
    },
    {
      title: `${merchantName} Contact Support`,
      description: `Customer support page with refund contact path for ${merchantName}.`,
      url: `https://${host}/support/contact`,
      markdown: `Customer support email: ${supportEmail}. Typical response time is 2 business days.`,
      sourceType: "support_page" as const,
      confidenceScore: 0.76,
      supportEmail,
      providerMode: "mock"
    }
  ];
}

export async function searchRefundEvidence(
  merchantName: string,
  merchantUrl: string | null,
  issueSummary: string
) {
  if (getFirecrawlRuntimeState().mode === "live") {
    try {
      return await runLiveFirecrawlSearch(merchantName, merchantUrl, issueSummary);
    } catch {
      return buildMockRefundResults(merchantName, merchantUrl, issueSummary);
    }
  }

  return buildMockRefundResults(merchantName, merchantUrl, issueSummary);
}

function buildMockExtractResult(urls: string[], prompt: string): FirecrawlExtractJob {
  return {
    id: createMockId("mock_extract"),
    status: "completed",
    data: urls.map((url) => ({
      url,
      result: {
        summary: `Mock Firecrawl extract for ${url}`,
        prompt
      }
    })),
    providerMode: "mock"
  };
}

function buildMockCrawlResult(url: string, prompt?: string): FirecrawlCrawlJob {
  return {
    id: createMockId("mock_crawl"),
    status: "completed",
    data: [
      {
        url,
        markdown: `Mock crawl result for ${url}`,
        metadata: {
          prompt: prompt ?? null
        }
      }
    ],
    providerMode: "mock"
  };
}

export async function extractFirecrawlData(urls: string[], prompt: string, schema?: Record<string, unknown>) {
  if (getFirecrawlRuntimeState().mode !== "live") {
    return buildMockExtractResult(urls, prompt);
  }

  const response = await fetch("https://api.firecrawl.dev/v2/extract", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.firecrawlApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      urls,
      prompt,
      ...(schema ? { schema } : {})
    })
  });

  if (!response.ok) {
    throw new Error(`Firecrawl extract failed with status ${response.status}`);
  }

  const body = (await response.json()) as FirecrawlExtractJob;
  return {
    ...body,
    providerMode: "live"
  };
}

export async function getFirecrawlExtractStatus(extractId: string) {
  if (getFirecrawlRuntimeState().mode !== "live") {
    return {
      ...buildMockExtractResult(["https://example.com"], "mock"),
      id: extractId,
      providerMode: "mock"
    };
  }

  const response = await fetch(`https://api.firecrawl.dev/v2/extract/${extractId}`, {
    headers: {
      Authorization: `Bearer ${env.firecrawlApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Firecrawl extract status failed with status ${response.status}`);
  }

  const body = (await response.json()) as FirecrawlExtractJob;
  return {
    ...body,
    providerMode: "live"
  };
}

export async function startFirecrawlCrawl(url: string, limit: number, prompt?: string) {
  if (getFirecrawlRuntimeState().mode !== "live") {
    return buildMockCrawlResult(url, prompt);
  }

  const response = await fetch("https://api.firecrawl.dev/v2/crawl", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.firecrawlApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url,
      limit,
      ...(prompt ? { prompt } : {}),
      scrapeOptions: {
        formats: ["markdown"]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Firecrawl crawl failed with status ${response.status}`);
  }

  const body = (await response.json()) as FirecrawlCrawlJob;
  return {
    ...body,
    providerMode: "live"
  };
}

export async function getFirecrawlCrawlStatus(crawlId: string) {
  if (getFirecrawlRuntimeState().mode !== "live") {
    return {
      ...buildMockCrawlResult("https://example.com"),
      id: crawlId,
      providerMode: "mock"
    };
  }

  const response = await fetch(`https://api.firecrawl.dev/v2/crawl/${crawlId}`, {
    headers: {
      Authorization: `Bearer ${env.firecrawlApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Firecrawl crawl status failed with status ${response.status}`);
  }

  const body = (await response.json()) as FirecrawlCrawlJob;
  return {
    ...body,
    providerMode: "live"
  };
}
