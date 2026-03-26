# Engineering Hardening Checklist

This is the practical end-to-end test plan for Refund Raider after Gmail + OCR setup.

## Required Production Env

- `MISTRAL_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`
- existing runtime envs:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_DB_URL`
  - `FIRECRAWL_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_AGENT_ID`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`

## External Setup

### Supabase

- Enable Google auth provider.
- Use the same Google OAuth client ID and secret as Gmail.
- Verify app sign-in works on `/cases/new`.

### Google Cloud

- Enable Gmail API.
- OAuth app type: Web application.
- Authorized origin:
  - `https://refund-raider.vercel.app`
- Redirect URI:
  - `https://refund-raider.vercel.app/api/v1/integrations/gmail/callback`

## Runtime Checks

Run:

```bash
curl https://refund-raider.vercel.app/api/v1/runtime/providers
```

Expected:

- `database`: `ready`
- `firecrawl`: `ready`
- `email`: `ready`
- `elevenLabs`: `ready`
- `ocr`: `ready`
- `gmail`: `ready`

## Local Verification

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected:

- all commands pass

## Hosted OCR Verification

### Text upload

Run:

```bash
curl -sS \
  -F merchantUrlHint=https://www.bestbuy.com \
  -F file=@/path/to/order-email.txt \
  https://refund-raider.vercel.app/api/v1/intake/parse-upload
```

Expected:

- returns `suggestion`
- returns `extractedText`
- merchant and support email are inferred correctly

### Screenshot or PDF upload

Run:

```bash
curl -sS \
  -F merchantUrlHint=https://www.bestbuy.com \
  -F file=@/path/to/order-screenshot.png \
  https://refund-raider.vercel.app/api/v1/intake/parse-upload
```

Expected:

- OCR succeeds
- extracted text is non-empty
- issue summary and merchant are inferred

## Gmail Verification

### Sign-in

Steps:

1. Open `https://refund-raider.vercel.app/cases/new`
2. Sign in with Google
3. Confirm the page shows your signed-in identity

### Gmail connect

Steps:

1. Click `Connect Gmail`
2. Complete OAuth consent
3. Confirm redirect back to `/cases/new?gmail=connected`
4. Confirm Gmail connection status is visible

### Gmail search

Search examples:

- `Brooklinen torn sheets`
- `Best Buy damaged headphones`
- `from:support@merchant.com refund`

Expected:

- search returns candidate emails
- choosing one fills the intake
- case creation succeeds from the selected Gmail message

## Full Product Rehearsal

### Upload-first path

1. Upload order email / screenshot / PDF
2. Autofill
3. Create case
4. Verify evidence, verdict, and draft appear
5. Start voice session
6. Ask:
   - `Do I qualify?`
   - `What evidence matters most?`
   - `What should I send?`
7. Approve draft
8. Send draft to a safe inbox

### Gmail-first path

1. Sign in
2. Connect Gmail
3. Search inbox
4. Select the right message
5. Create case
6. Run the same voice + send flow

## Failure Drills

- Remove `MISTRAL_API_KEY` and confirm OCR falls back to honest missing-config behavior.
- Remove Gmail envs and confirm Gmail UI degrades gracefully.
- Try a screenshot with poor OCR quality and confirm the UI shows an actionable error instead of a 500.
- Try draft send without merchant email and confirm the app blocks it clearly.

## Best Demo Path

- Preferred live demo:
  - Google sign-in
  - Gmail search for the order email
  - one uploaded product photo
  - voice explanation on the case page
  - approved send through Refund Raider
