# Getting started (no coding required)

This sets up HeaderHound to quietly label cold-outreach mail in your Gmail. You'll paste one file, click a few buttons once, and after that you manage everything from a normal Google Sheet — no code, ever again.

Set aside about 10 minutes for the one-time setup.

## What you'll end up with

- Two labels in Gmail: **Cold Outreach/SPAM** (definite — sent by a known cold-email tool) and **Cold Outreach/Possible SPAM** (suspicious, but less certain).
- A **Google Sheet** you own, with two tabs:
  - **Allowlist** — type any domain here and its mail will *never* be flagged (your company, your clients, your vendors).
  - **Flagged log** — a running list of everything that got labeled, so you can see what it's catching and spot anything it shouldn't have.
- Nothing gets deleted. It only *labels*, so you're always in control.

## One-time setup

**Step 1 — Open the script editor.**
Go to [script.google.com](https://script.google.com) and click **New project**. You'll see a code box with a couple of lines in it. Select all of it and delete it.

**Step 2 — Paste HeaderHound in.**
Open `loader.gs` from this project, copy everything, and paste it into that empty box.

**Step 3 — Save.**
Near the top you'll see this line, already pointing at the published list:

```
LIST_BASE_URL: 'https://raw.githubusercontent.com/headerhound-dev/headerhound/main',
```

You don't need to change it. Just click the **💾 Save** icon.

**Step 4 — Create your settings Sheet.**
At the top of the editor there's a dropdown of function names next to a **▶ Run** button. Choose **setupAllowlistSheet**, then click **▶ Run**.

- The first time, Google asks you to approve permissions. Click through **Review permissions → your account → Advanced → Go to (project) → Allow**. This is Google confirming *you* wrote this script; it only touches your own mail and your own sheet. (That warning exists for good reason — only ever click through it for code you pasted yourself from a source you trust, like this repo, where you can read every line first.)
- After it runs, click **Execution log** (or **View → Logs**). It prints a link to your new "HeaderHound — Settings" spreadsheet. **Open that link and bookmark it** — that Sheet is your control panel from now on.

**Step 5 — Add your domains.**
In the Sheet's **Allowlist** tab, replace the two example rows with your own — one domain per row (e.g. `yourcompany.com`, a client's domain, a vendor you always want to hear from). You can come back and add more anytime.

**Step 6 — Do a first scan.**
Back in the script editor, choose **scanInbox** from the dropdown and click **▶ Run**. It labels anything cold from the last couple of days. Check your Gmail labels and the **Flagged log** tab to see what it found.

**Step 7 — Put it on autopilot.**
Choose **installTrigger** and click **▶ Run** once. Now it scans automatically every 10 minutes. You're done.

## Living with it (the only things you'll ever do again)

- **Something legit got flagged?** Open your Sheet → **Allowlist** tab → add that sender's domain on a new row. Within about 10 minutes it stops flagging them. (To remove the wrong label from the message itself, just do it in Gmail like any other label.)
- **Want to see what it's catching?** Open the **Flagged log** tab. Each row shows when, which tier, who from, the subject, and why.
- **Cold mail slipping through?** That means the sending tool isn't in the list yet — see `CONTRIBUTING.md` to report it, and everyone's filter improves.

## Two layers of allowlist (why you almost never get false positives)

There are two allowlists working together:

- The **public allowlist** ships with HeaderHound and already covers common legitimate senders (Slack, GitHub, DocuSign, Stripe, and so on). You don't manage this — it's maintained by the community.
- Your **private allowlist** is the Sheet — just your own domains and vendors, kept entirely on your side and never shared.

A sender on *either* list is never flagged. That combination is why day-to-day false positives should be rare.

## When you're ready to be more aggressive

By default nothing leaves your inbox — it only labels. Once you trust it (give it a week), you can have confirmed cold mail auto-archived. In `loader.gs`, change `ARCHIVE_DETERMINISTIC: false` to `true` and re-run **installTrigger**. Leave the "Possible" tier on label-only unless you're very confident. If you'd rather not touch the code at all, ask whoever set this up to flip it for you.

## If something looks wrong

- **Nothing gets flagged / errors about fetching the list:** double-check the `LIST_BASE_URL` in Step 3 is exactly right.
- **Your edits to the Sheet aren't taking effect:** it re-reads the Sheet every 10 minutes; to force it now, run **refreshLists** then **scanInbox**.
- **You want to start over:** run **removeTriggers** to stop the automatic scanning.
