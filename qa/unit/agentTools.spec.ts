import { describe, expect, it } from "vitest";
import { elevenAgentToolDefinitions } from "../../src/lib/contracts/agentTools";

describe("elevenAgentToolDefinitions", () => {
  it("includes the expanded action-engine tool set", () => {
    expect(elevenAgentToolDefinitions.map((tool) => tool.name)).toEqual([
      "get_intake_state",
      "update_intake_fields",
      "capture_user_problem",
      "connect_gmail",
      "search_gmail_messages",
      "select_gmail_message",
      "create_case",
      "lookup_policy_evidence",
      "summarize_eligibility",
      "create_refund_draft",
      "send_refund_email",
      "get_case_status",
      "build_action_plan",
      "request_user_consent",
      "execute_case_action",
      "schedule_follow_up",
      "firecrawl_extract",
      "firecrawl_get_extract_status",
      "firecrawl_start_crawl",
      "firecrawl_get_crawl_status"
    ]);
  });

  it("keeps the send tool explicit about recipient and approval inputs", () => {
    const sendTool = elevenAgentToolDefinitions.find((tool) => tool.name === "send_refund_email");

    expect(sendTool?.inputSchema.required).toEqual(["caseId", "draftId", "to"]);
    expect(sendTool?.inputSchema.properties).toMatchObject({
      caseId: { type: "string" },
      draftId: { type: "string" },
      to: { type: "array" },
      ccUser: { type: "boolean" }
    });
  });

  it("keeps the action-engine tools explicit about ids and case ownership", () => {
    const executeTool = elevenAgentToolDefinitions.find((tool) => tool.name === "execute_case_action");
    const followUpTool = elevenAgentToolDefinitions.find((tool) => tool.name === "schedule_follow_up");

    expect(executeTool?.inputSchema.required).toEqual(["actionId"]);
    expect(followUpTool?.inputSchema.required).toEqual(["caseId"]);
  });
});
