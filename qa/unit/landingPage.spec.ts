import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import HomePage from "../../app/page";

function collectText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join(" ");
  }

  if (typeof node === "object" && "props" in node) {
    return collectText((node as { props?: { children?: ReactNode } }).props?.children);
  }

  return "";
}

describe("HomePage", () => {
  it("keeps the hero focused on the voice-first action-agent story", () => {
    const text = collectText(HomePage());

    expect(text).toContain("Refund Raider");
    expect(text).toContain(
      "Talk to an agent that can fix refunds, cancellations, replacements, and billing fights."
    );
    expect(text).toContain(
      "Start with voice or chat. Refund Raider turns messy merchant problems into a live action case with evidence, approvals, execution, and follow-up instead of another support script the user has to finish alone."
    );
    expect(text).toContain("Talk to Refund Raider");
    expect(text).toContain("Built to grow from a sharp demo into a real startup product.");
  });
});
