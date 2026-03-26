import { describe, expect, it } from "vitest";
import { parseIntakeRequest } from "../../src/server/services/intakeAutomationService";

describe("parseIntakeRequest", () => {
  it("extracts a damaged-item refund case from pasted order context", () => {
    const suggestion = parseIntakeRequest({
      rawText: `
From: Best Buy Support <support@bestbuy.com>
Subject: Your Best Buy order
Order placed on March 18, 2026
https://www.bestbuy.com
My headphones arrived cracked and the left ear cup is broken. I want a refund.
      `
    });

    expect(suggestion.merchantName).toBe("Best Buy");
    expect(suggestion.merchantUrl).toBe("https://www.bestbuy.com");
    expect(suggestion.issueType).toBe("damaged_item");
    expect(suggestion.desiredOutcome).toBe("full_refund");
    expect(suggestion.purchaseDate).toBe("2026-03-18");
    expect(suggestion.merchantContactEmail).toBe("support@bestbuy.com");
    expect(suggestion.artifactKind).toBe("order_email");
    expect(suggestion.confidence).toBe("high");
  });

  it("extracts a support-thread style return case with payment details", () => {
    const suggestion = parseIntakeRequest({
      rawText: `
Re: Chewy support ticket 8291
From: help@chewy.com
I never received the dog food order that was supposed to arrive yesterday.
Please either refund me or replace it.
Paid with PayPal on 03/15/2026.
      `
    });

    expect(suggestion.merchantName).toBe("Chewy");
    expect(suggestion.issueType).toBe("missing_item");
    expect(suggestion.desiredOutcome).toBe("refund_or_replacement");
    expect(suggestion.paymentMethod).toBe("paypal");
    expect(suggestion.purchaseDate).toBe("2026-03-15");
    expect(suggestion.merchantContactEmail).toBe("help@chewy.com");
    expect(suggestion.artifactKind).toBe("support_thread");
  });
});
