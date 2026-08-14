# Contributing to HeaderHound

The list is only as good as it is *current*. Cold-outreach vendors rotate domains and strip headers constantly, so the single most valuable thing you can do is report mail that slipped through — or tighten a rule that fired on something legitimate.

## What belongs on the deny list (listing policy)

HeaderHound names specific products. That specificity is the whole value over the generic heuristic tier — and it's also where the risk lives. So every deny-list entry must meet **all four** criteria:

1. **Dedicated outreach function.** The tool's purpose is cold, automated, or sequenced outreach (Instantly, Smartlead, Salesloft, Juicebox sequences, and the like). If its header is present, the message really was sent by such a tool. **General-purpose email infrastructure is out** — Nylas, SendGrid, Mailgun, Amazon SES, Postmark and similar carry legitimate app mail (receipts, notifications, scheduling) far more often than cold outreach, so listing them is both inaccurate and unfair. Fingerprint the outreach *product*, never the *plumbing* underneath it.
2. **Verifiable header.** Key the entry on a real, machine-checkable header pattern taken from an actual sample — not a guess about a vendor. Cite it in `references`.
3. **Neutral framing.** A match means only "sent via X" — a factual observation. Never describe a listed tool as spam, illegal, or bad in `notes`. Many listed tools are used entirely lawfully; what the *recipient* does with the label is their choice.
4. **Honest confidence.** `high` only when the header essentially can't come from anything else. Dual-use or best-effort signals go `medium`/`low`, or stay out of the deny list and rely on the heuristic tier instead.

If a tool fails #1 (it's infrastructure) or you can't satisfy #2, don't deny-list it — the heuristic tier exists for "looks automated but I can't pin the vendor."

## Report a missed sender (no code)

Open an issue titled `Missed: <platform>` and include:

1. **The platform**, if you know it (e.g. "Instantly", or "not sure").
2. **The giveaway header(s)** — the lines that identify the tool. Common tells: `X-Mailer`, `X-Mail-Abuse-Inquiries`, `List-Unsubscribe`, `Feedback-ID`, vendor-specific `X-` headers, or a tracking/unsubscribe domain.
3. **Redact your personal info.** Remove your own email address, names, and anything private. We only need the machine tells.

In Gmail: open the message → ⋮ → **Show original** → copy the header block.

## Add a fingerprint (PR)

1. Confirm the tool meets the listing policy above, then add an object to the `fingerprints` array in `fingerprints.json`.
2. Make it satisfy `schema/fingerprint.schema.json` (run the validator below).
3. Set an honest `confidence`:
   - `high` — a distinctive header/domain that essentially only this platform emits.
   - `medium` — identifying, but incidental matches are plausible.
   - `low` — weak or heuristic; use `body` scope only here, if at all.
4. Prefer a specific `field` over a broad `headers` scope when you can — it cuts false positives.
5. Set `lastVerified` to today (YYYY-MM-DD) and cite a `references` link.

### Entry template

```json
{
  "id": "example-tool",
  "name": "Example Tool",
  "category": "cold-email-platform",
  "confidence": "high",
  "field": "X-Mailer",
  "pattern": "exampletool",
  "scope": "headers",
  "notes": "What the tell is and why it's reliable.",
  "references": ["https://example.com"],
  "lastVerified": "2026-08-07",
  "source": "your-handle"
}
```

## Avoid false positives

HeaderHound's credibility depends on *not* flagging legitimate mail. Before adding a rule, sanity-check that it won't match transactional notifications, receipts, or genuine opt-in newsletters. When in doubt, lower the confidence and narrow the scope.

## Propose an allowlist domain (PR)

The public allowlist (`allowlist.json`) spares legitimate senders. The bar is high: an entry suppresses *all* detection for that domain and its subdomains, so it must be a domain whose mail is unambiguously wanted by essentially everyone (major SaaS notifications, transactional providers). Add an object to the `allow` array:

```json
{
  "domain": "example.com",
  "category": "saas-notifications",
  "notes": "Why this domain's mail is universally legitimate.",
  "lastVerified": "2026-08-07",
  "source": "your-handle"
}
```

Rules: use a bare registrable domain (`example.com`, not `mail.example.com` or a URL). Do **not** add your own company, clients, or vendors here — those belong in your *private* allowlist (the Google Sheet in `loader.gs`), not the shared list. If a domain is only sometimes legitimate, leave it out and let the transactional/`List-Id` heuristics handle it.

## Disputes

If you believe an entry is inaccurate — you're the vendor, or you've found the pattern matching mail it shouldn't — open an issue titled `Dispute: <platform>` with what you believe is wrong. We re-verify disputed entries against fresh real-world samples; entries that can't be verified are corrected or removed. Listing is a factual claim about headers, and factual claims get fixed when the facts say so.

## Validate before you push

```
node tools/validate.mjs
```

It checks every entry against the schema and compiles every `pattern` to confirm it's a valid regex. Green means you're good to open the PR.
