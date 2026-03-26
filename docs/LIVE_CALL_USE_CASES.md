# Live Call Use Cases

These are the best startup-grade scenarios for a voice-first Refund Raider demo once Gmail and adjacent connectors exist.

## 1. Damaged Item, Order Email Already in Gmail

- User utterance:
  `Refund Raider, find the Brooklinen order where the sheets arrived torn and send the strongest refund request.`
- Needed connectors/data:
  Gmail inbox access, merchant order email, uploaded product photo or screenshot, merchant support email.
- Why it is strong:
  Clean evidence, obvious user pain, simple refund path, easy to explain live.

## 2. Merchant Ignored the First Support Reply

- User utterance:
  `Open the Rothy's thread where they stopped replying and escalate it for me.`
- Needed connectors/data:
  Gmail sent + received threads, original merchant reply, order confirmation, refund policy/support page.
- Why it is strong:
  Shows the product is not just a draft generator. It understands ongoing case state and picks up where the user left off.

## 3. Missing Package With Conflicting Carrier/Merchant Messaging

- User utterance:
  `Check the Chewy order that never arrived, tell me if I should email support or dispute the charge, and draft the message.`
- Needed connectors/data:
  Gmail order email, carrier update emails, merchant support page, optional screenshot of tracking.
- Why it is strong:
  Lets the agent compare evidence, explain fallback logic, and choose the next action.

## 4. Wrong Item Delivered, User Wants Replacement or Refund

- User utterance:
  `Use the order email and this photo to fix the Sephora order where they sent the wrong item.`
- Needed connectors/data:
  Gmail order email, uploaded product photo, merchant support email or support form page.
- Why it is strong:
  Good example of the agent inferring desired outcome and steering toward replacement vs refund.

## 5. Subscription Cancellation That Kept Billing

- User utterance:
  `Find the cancellation emails for Spotify, check whether they still owe me a refund, and handle the next step.`
- Needed connectors/data:
  Gmail billing emails, cancellation confirmation email, merchant account/support path.
- Why it is strong:
  Strong real-world use case, but usually weaker than ecommerce physical-goods demos because support paths are more account-bound.

## Safest Live Demos

- Best for a live demo:
  Damaged item with Gmail order email + one screenshot/photo + public support email.
- Second best:
  Merchant ignored the first support thread.
- Riskier live demos:
  Amazon-style account-gated flows, portal-only support, or scenarios that require outbound calling.

## Recommended Best Live Call

- Scenario:
  Brooklinen damaged-item refund.
- User says:
  `Refund Raider, find my Brooklinen order, look at the photo I uploaded, tell me if I qualify, and send the refund request if the draft looks good.`
- Why this is best:
  Gmail provides the order email, the uploaded photo provides proof, policy pages are usually clean enough for evidence, and the refund story is obvious in one call.

## Connector Priority

1. Gmail
2. File uploads / screenshots / PDFs
3. Merchant support email detection
4. Calendar or reminders for follow-up deadlines
5. Merchant portal automation only later

Do not make live outbound calling or browser portal automation part of the first winning demo. The clean story is: Gmail + uploaded proof + live voice advocate + email send.
