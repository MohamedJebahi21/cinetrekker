# CineTrekker Moderation and Support Procedures

**Status:** Launch-stage operating procedure. This document establishes internal handling standards; it does not replace legal advice or designate a legal agent.

## 1. Scope and ownership

CineTrekker currently permits user-authored comments and replies on title pages. The **CineTrekker product owner** is accountable for the first review, removal decision, user communications, evidence preservation, and escalation. The launch contact is **cinetrekker.contact@gmail.com**.

The published [Feedback page](https://cinetrekker.vercel.app/feedback) accepts a name, email address, and message, then submits to the application feedback endpoint. It is the currently available user-facing route for support, moderation concerns, and reports. It is not yet a structured, per-comment reporting workflow.

> **Important product boundary:** CineTrekker does not yet expose a “Report” action next to every comment or reply. A direct-report feature should be approved and built before social activity scales materially.

## 2. Intake and acknowledgement

A user who wants to report content should open **Feedback**, select the message subject `Moderation report`, and include the title page URL, the comment or reply text, the author name if visible, and a concise description of the concern. The reporter should avoid including passwords, payment details, government identifiers, or unrelated personal information.

For copyright or legal correspondence, the sender should use **cinetrekker.contact@gmail.com** with the subject `Copyright / legal notice`. That inbox is a practical launch contact only; it must not be described publicly as a registered DMCA designated agent unless and until the owner completes the appropriate legal review and registration.

| Case category | Acknowledge target | First review target | Operational priority |
|---|---:|---:|---|
| Imminent credible threat, doxxing, sexual exploitation material, phishing, or account compromise | 4 hours | 1 hour | P0 |
| Hate, harassment, targeted abuse, impersonation, fraud, or explicit spam | 1 business day | 1 business day | P1 |
| Copyright or legal notice | 1 business day | 2 business days | P1; escalate before final legal conclusion |
| Ordinary content dispute, bug report, or feature feedback | 2 business days | 3 business days | P2 |

These are operational targets rather than a guarantee. If the owner cannot meet them, the user should receive a short status update rather than silence.

## 3. Review and removal standards

The reviewer should record the report timestamp, reported URL, content identifier if available, reporter contact, relevant screenshots or copied text, decision, rationale, and action time in a restricted internal incident log. Preserve only the minimum information needed to review the case. Do not forward reports containing personal information into public channels.

| Content pattern | Default response | Notes |
|---|---|---|
| Credible violence threat, doxxing, non-consensual intimate material, child sexual exploitation material, phishing, malware, or account theft | Immediately restrict or remove access; preserve minimal evidence; escalate. | Treat as P0. Follow applicable law and obtain professional or emergency help when needed. |
| Targeted harassment, hateful or dehumanising abuse, discriminatory slurs, stalking, or credible intimidation | Remove when context supports the report; warn or restrict repeat offenders. | Protect targets from further exposure during review. |
| Spam, scam links, commercial solicitation, manipulated engagement, or misleading impersonation | Remove; restrict repetitive abuse. | Capture domains or patterns for future abuse controls. |
| Sexual or graphic content not appropriate for a general media-discussion setting | Remove or restrict based on severity and context. | Comments should not become a venue for explicit user-generated content. |
| Copyright claim | Temporarily restrict the identified material only when a review supports that action or qualified guidance requires it; escalate legal ambiguity. | Do not decide ownership or fair use without appropriate review. |
| Mere disagreement, negative review, criticism, or lawful discussion of a title | Normally keep. | Remove only if another policy category applies. |

Moderation must be viewpoint-neutral where possible and should not be used to suppress ordinary criticism. When content is removed, retain a concise internal reason such as `harassment`, `doxxing`, `spam`, `copyright review`, or `security risk`.

## 4. Decision and communication workflow

The reviewer should confirm the content and context, classify the report, then make the least intrusive protective action that reliably addresses the risk. Available launch-stage actions are deletion of user-authored content, a direct support response, and account-level restrictions only where those controls are technically available and approved. Do not promise account suspension capabilities that have not been implemented.

A reporter should receive an acknowledgement containing the ticket reference or timestamp, the category under review, and the expected next update. If action is taken against a user, a short neutral explanation should state the affected content and policy category, unless disclosure would endanger a user, compromise a security investigation, or conflict with legal guidance. Appeals should be sent to **cinetrekker.contact@gmail.com** with the subject `Moderation appeal` within 14 calendar days of a decision.

## 5. Copyright and legal-notice route

The U.S. Copyright Office explains that a service provider seeking the relevant Section 512 safe-harbor protections must make designated-agent contact information public and file that information with the Office’s directory; qualifying notices need identifying and contact information, a signature, good-faith and accuracy statements, and enough location detail to identify the material. [1] [2]

CineTrekker has **not** verified a designated-agent registration through this procedure. Therefore, the owner must not represent the general support email as a registered DMCA agent. On receipt of any copyright or legal notice, the owner should:

1. Record the receipt time and preserve the original message securely.
2. Acknowledge receipt without admitting liability or promising a legal outcome.
3. Check whether the notice identifies the work, the exact CineTrekker URL or comment, contact information, authority, signature, and the good-faith and accuracy statements described by the Copyright Office. [1]
4. Restrict access to clearly identified user-authored material when appropriate, and preserve the decision record.
5. Obtain qualified legal advice for disputes, counter-notices, repeat-infringer actions, jurisdictional issues, or any request beyond routine removal.
6. Before publishing a DMCA policy or claim of safe-harbor coverage, complete a legal review and, if applicable, register and maintain the designated-agent information.

## 6. Incident record and quarterly review

The owner should maintain a restricted moderation log with no more than the data needed for audit and appeal handling. At least quarterly, review report volume, response-target attainment, repeat abuse patterns, removals by category, and any evidence that the Feedback-only route is inadequate. This review should determine whether to prioritise an in-context report action, rate limits for social writes, block/mute controls, moderator roles, or a dedicated case-management workflow.

## References

[1]: https://www.copyright.gov/dmca-directory/ "U.S. Copyright Office: DMCA Designated Agent Directory"
[2]: https://www.copyright.gov/512/ "U.S. Copyright Office: Section 512 Resources and Notice-and-Takedown System"
