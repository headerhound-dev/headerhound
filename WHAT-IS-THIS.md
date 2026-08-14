# What is this, in plain English?

You've gotten the email. It uses your first name. It says something like *"just following up on my last note"* (there was no last note). It asks for "just 15 minutes." It signs off like a colleague. It reads like a person sat down and wrote to you — and it wasn't. It was assembled and sent by software, to you and a few thousand other people, with the names swapped in.

Companies pay real money for that software. There's a whole industry of tools built to send sales email at scale while making each copy look hand-typed. The people buying those tools aren't criminals — this is legal, ordinary business practice. But it costs you something real: your attention, spent deciding whether a "personal" note deserves a reply, over and over, every week.

HeaderHound exists to give you that time back.

## The trick, and the tell

Here's the part most people don't know: every email carries a hidden technical section — think of it as the envelope, separate from the letter inside. You never see it, but your mail app does. And the software that sends fake-personal email at scale leaves marks on that envelope.

It's like the difference between a postage meter and a hand-placed stamp. The letter inside can say "Dear Taylor" all it wants — the envelope still shows how it was actually mailed. A message sent by a cold-email platform carries traces of that platform, even when everything visible has been carefully dressed up to look one-to-one.

HeaderHound is a public, community-maintained list of those marks. When a new tool shows up in someone's inbox, someone identifies its mark and adds it to the list, and everyone's filter gets smarter — the same way ad blockers share one communal list of ad servers instead of everyone finding them alone. A neighborhood watch, for inboxes.

## What it actually does to your email

If you set up the included Gmail helper (there's a [step-by-step guide that assumes no technical background](./GETTING-STARTED.md)), here is the entire effect: some of your incoming mail gets a **label**.

Mail matching a known sending tool gets labeled, in effect, *"a machine sent this."* Mail that merely looks automated gets a softer *"this might be automated."* That's it. Think of it as caller ID. The phone still rings — you just see "Telemarketer" on the screen before deciding whether to pick up. The email still arrives, unread and untouched. You just know what it is before you give it your attention.

Three things people reasonably want to know:

**"Is it reading my email?"** It runs entirely inside your own Google account, like a mail filter you set up yourself — because that's literally what it is, you paste it in yourself and can read every line. Nothing about your mail is sent to this project or anyone else, ever. The only thing that's public is the list of marks, which contains no one's email.

**"What if it gets one wrong?"** Nothing is deleted, so a mistake costs you nothing but a stray label. And you keep a personal "always trust these senders" list — a simple spreadsheet — so if it ever labels something you wanted, you type that company's name in once and it never touches them again.

**"Isn't this what my spam filter does?"** No — and this is the point. Spam filters catch scams, fraud, and junk. This catches what spam filters *deliberately let through*: legal, professionally sent sales outreach from real companies, wearing a personal disguise. Different problem, different tool. (Actual spam and phishing remain your spam filter's job, and it's good at it.)

## Why this exists at all

Because the law is not going to help you. In the United States, unsolicited commercial email is legal by default — the sender just has to follow some light rules. And even when senders break those rules, you personally cannot do anything about it: the law gives enforcement power only to regulators, who understandably don't chase individual emails. There is no consequence, so the email keeps coming.

This project's answer is simple: if you can't have recourse, you can at least have **recognition**. If someone paid software to reach you at scale while pretending not to, you get to know — and then *you* decide what happens next.

## The honest fine print

HeaderHound catches mail sent by automated tools, because tools leave marks. A cold email genuinely typed by a human, from a normal mailbox, leaves no mark — and won't be caught. It also doesn't judge content, block anyone, or claim any sender did anything wrong; a label means "sent via this tool," nothing more. The [README](./README.md) has the full picture, including exactly what's in and out of scope.

Curious? [Set it up in about ten minutes](./GETTING-STARTED.md) — no coding, nothing to install on your computer, and you can undo all of it by deleting a label.
