# HeaderHound

**An open, community-maintained filter list of cold-outreach sending-platform fingerprints — detectable from email headers.**

Think *EasyList, but for cold email.* HeaderHound is not an app. It's a versioned data file (`fingerprints.json`) of patterns that identify the platform an email was blasted from — Instantly, Smartlead, Apollo, Salesloft, and the rest — so that any mail filter, add-on, or script can consume it and let *you* decide what happens to mail from people who paid a machine to reach you.

> **Not technical?** Start with [What is this, in plain English?](./WHAT-IS-THIS.md) — no jargon, and a ten-minute setup guide from there.

---

## Why we exist

Cold outreach isn't illegal in the United States — and that's the whole problem.

The US anti-spam law, **CAN-SPAM, is opt-out, not opt-in.** It doesn't ban unsolicited commercial email; it *permits* it, as long as the sender clears a low bar (don't forge headers, include a physical address, offer an unsubscribe, honor it within 10 days). Unsolicited mail to your inbox is legal by default.

And here's the part that leaves you with no recourse: **CAN-SPAM has no private right of action.** You — the person whose attention is being taken — cannot sue a sender, no matter how many rules they break. Only the FTC and state attorneys general can enforce it. The headline penalty is real (about **$53,088 per email**, adjusted yearly for inflation), but it's a weapon aimed at large, egregious operators. For the individual pitch sitting in your inbox with a fake `RE:` subject line and a city instead of a real postal address — technically non-compliant, and completely safe from consequence — nothing happens. No regulator chases one email, and you're not allowed to.

That gap is why cold-outreach platforms run the way they do: burner lookalike domains, rotated to protect the real brand's reputation; automated sending from cloud infrastructure; disposable subdomains that get discarded the moment they're flagged. The law was written to allow exactly this, and to give recipients no lever to pull.

**HeaderHound is that lever.** The law won't give you recourse, so we give you *recognition*: an open, always-current catalog of the tells these platforms leave behind, so your own inbox can act on your behalf. If someone spent money on a sending platform to reach you unsolicited, you get to know — and decide — before you ever read the pitch.

> HeaderHound is not an accusation. Being fingerprinted means only that a message was *sent via* a given platform — a neutral, factual observation from the headers. Many listed tools are used entirely lawfully. What you do with that knowledge is yours to decide.

---

## What this is

- `fingerprints.json` — the detection list. Each entry maps a header pattern to a known sending platform, with a confidence level and a last-verified date.
- `allowlist.json` — the public allowlist. Domains that should *never* be flagged (legitimate transactional/notification senders like Slack, GitHub, DocuSign).
- `schema/` — the JSON Schemas both lists must satisfy.
- `loader.gs` — a reference consumer: a Google Apps Script that reads both lists and labels matching mail in Gmail.
- `GETTING-STARTED.md` — a no-coding-required setup guide for non-developers.
- `CONTRIBUTING.md` — how to add a platform, report one that slipped through, or propose an allowlist domain.

## Two-layer allowlist

Detection is only trustworthy if legitimate mail is reliably spared. HeaderHound uses two allowlists, and a sender on *either* is never flagged:

- **Public allowlist** (`allowlist.json`, in this repo) — community-maintained, covering well-known legitimate senders. Conservative by design: an entry suppresses *all* detection for that domain and its subdomains, so only unambiguously-wanted senders belong here.
- **Private allowlist** (per user, never in this repo) — your own domains, clients, and vendors. The reference `loader.gs` keeps this in a Google Sheet the user edits directly, so non-developers manage it without touching code.

Keep your own domains out of the public list — that's what the private layer is for.

## How it works

Cold-outreach and sales-engagement tools leave fingerprints in the message headers — a distinctive `X-Mailer`, an abuse-report link, a tracking or unsubscribe domain, a vendor-specific `X-` header. HeaderHound catalogs those as case-insensitive regular expressions, each scoped to where it should match (the full header block, only the `Received:` chain, or — sparingly — the body).

A consumer reads `fingerprints.json`, compiles each `pattern`, and tests incoming mail. A match tells you which platform sent it and how confident that match is. What the consumer *does* with a match — label, archive, auto-decline, nothing — is entirely up to the consumer and the user.

```json
{
  "id": "instantly",
  "name": "Instantly",
  "category": "cold-email-platform",
  "confidence": "high",
  "field": "X-Mail-Abuse-Inquiries",
  "pattern": "instantly\\.ai",
  "scope": "headers",
  "lastVerified": "2026-08-07"
}
```

## Scope — what we do and don't fingerprint

We fingerprint the **sending platform**, not the sender's opinions, industry, or worthiness. In:

- Cold-email platforms (bulk outreach): Instantly, Smartlead, Woodpecker, lemlist, Saleshandy, QuickMail, Mailshake, Snov.io, Overloop.
- Sales-engagement / SDR & recruiting sequencers: Salesloft, Outreach, Apollo, Reply.io, Klenty, Mixmax, Yesware, Juicebox (PeopleGPT).
- Mass-send-from-Gmail tools: GMass.
- Deliverability / inbox-warming services: lemwarm.

**Out** (by design, to keep false positives near zero): legitimate transactional and notification mail (password resets, receipts, app notifications), genuine opt-in newsletters and mailing lists, and anything from a domain the user has allowlisted. A good consumer excludes machine-generated mail (`Auto-Submitted`) and real mailing lists (`List-Id`) before applying the heuristic layer — see `loader.gs`. **General-purpose email infrastructure is also out** — Nylas, SendGrid, Mailgun, Amazon SES, Postmark and the like carry legitimate app mail far more often than cold outreach, so HeaderHound fingerprints the outreach *product*, never the plumbing beneath it (see the listing policy in `CONTRIBUTING.md`).

## What HeaderHound can't catch

HeaderHound reads **headers**. That means it reliably catches two things: mail sent by automated outreach *tools* (which stamp identifying headers) and *bulk* senders (which carry bulk-mail headers like `List-Unsubscribe` or `Feedback-ID`). It is deliberately good at those and quiet on everything else.

What it will **not** catch is a well-crafted human cold email sent from a legitimate, authenticated mailbox with no automation fingerprint — an expert-network recruiter, a headhunter, or a founder typing a lightly-templated pitch in Outlook or Gmail. When such a message passes SPF/DKIM/DMARC, has aligned From/Return-Path, and carries no `List-Unsubscribe`, `Feedback-ID`, campaign header, or vendor tell, it is **indistinguishable at the header level from a real one-to-one email**. The only signals left are in the *content* ("following up on my previous email", "register as an advisor", a lead-funnel link) — and reading content is the job of a classifier/LLM tier, not a header list.

This is a boundary, not a bug. HeaderHound is the fast, deterministic, zero-cost first layer that names the tool behind automated and bulk outreach. Catching hand-sent cold mail from real mailboxes is a complementary content-analysis problem that a consumer can layer on top — it is out of scope for the list itself.

## Using the list

Point any consumer at the raw file:

```
https://raw.githubusercontent.com/headerhound-dev/headerhound/main/fingerprints.json
```

The included `loader.gs` is already pointed at this repo (`headerhound-dev/headerhound`) — it fetches and caches the list, then labels matching Gmail threads.

## Relationship to EasyList

HeaderHound borrows EasyList's *model* — a maintained, openly-licensed list that many tools subscribe to — and its arms-race discipline: senders rotate domains and strip headers, so the list only stays useful if it stays fresh. But HeaderHound is a **sibling, not a fork**. EasyList operates on web requests in a browser and is written in Adblock filter syntax, which can't express an email-header match, and its consumers are ad blockers, not mail filters. Cold-outreach detection is a different data model with a different consumer base — so, like EasyPrivacy sitting alongside EasyList, HeaderHound stands next to that family rather than inside it. (The one place we align directly is email *tracking pixels*, which are web-request-shaped; those belong upstream in EasyPrivacy / open tracker lists, not here.)

## Contributing

Found a cold pitch that HeaderHound missed? That's the most valuable contribution there is. See `CONTRIBUTING.md` — the short version is: open an issue with the platform name and the giveaway header (redact your personal address), or send a PR adding an entry to `fingerprints.json`. By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

- **Data** (`fingerprints.json`, schema): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — same share-alike spirit as EasyList's data.
- **Code** (`loader.gs`, tooling): [MIT](./LICENSE).

## Disclaimer

HeaderHound is provided for informational and personal mail-filtering purposes. It is not legal advice. Inclusion of a platform is not a claim that any sender using it has violated any law. Detection is probabilistic and may produce false positives or negatives.

All product and company names are trademarks of their respective owners; they are used here only to identify the products themselves (nominative use), and no affiliation with or endorsement by any listed company is implied.

Believe an entry is wrong? Open an issue titled `Dispute: <platform>` — see `CONTRIBUTING.md`. Disputed entries are re-verified against fresh samples and corrected or removed if they don't hold up.
