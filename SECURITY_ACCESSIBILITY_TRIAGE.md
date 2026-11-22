# Security and accessibility triage — not an independent audit

Date: 2026-11-21. This is a limited internal source review, not a penetration test, WCAG conformance statement, independent security assessment, or substitute for browser/assistive-technology testing.

## High-priority security findings

1. **CV upload gate can be bypassed through direct Storage API access.** The owner-scoped `career_document_insert` policy allows authenticated clients to write directly to their own storage prefix, bypassing the application scanner. Existing downloads are not scanned. See `CV_SECURITY.md` for required architectural work. Do not accept untrusted CVs as safe.
2. **Scanner and sandbox not operationally verified.** The ClamAV client and parser service are fail-closed integration points only. No real daemon, fresh signature database, container isolation, watchdog, hostile files, or production deployment was verified. Socket permissions, monitoring, worker recovery, resource limits and dependency/base-image pinning require review.
3. **Sensitive integrations remain unverified live.** Real two-user Auth/Storage API access, signed URLs and expiry, OAuth consent/refresh/revocation, Stripe test-mode events, account deletion and external provider data retention need disposable staging accounts and review. SQL RLS checks do not test the full HTTP/storage stack.
4. **Response hardening is incomplete.** `next.config.ts` has selected no-store and referrer headers for sensitive routes but no site-wide content-security policy or documented clickjacking policy. Design and test those headers against Next.js, OAuth callbacks and any legitimate preview embedding before enforcing; avoid an untested policy that breaks functionality.
5. **Operations and abuse controls are not production-ready.** Approved source/legal terms, distributed provider rate limits, alerting, backup restore, deletion reconciliation and incident response remain open. AI activity observations are not billing-grade and direct RPCs can create observations.

## Accessibility triage

- Source review found a document language, many native form labels, and existing focus-visible styles. The workspace shell now offers a keyboard skip link and marks the current navigation item in both desktop and mobile navigation. A server-rendered test checks their markup; this does not test keyboard behavior or assistive technology.
- Using the WCAG relative-luminance formula for CSS colors on a white background, the old default paragraph color `#75837f` measured approximately 3.96:1 and old workspace navigation `#81918b` approximately 3.30:1. These were changed to `#52645f` (approximately 6.27:1 on white) and `#536961` (approximately 5.90:1 on white). The focus outline was darkened, but its contrast against every adjacent background has not been evaluated.
- Many other small/muted text colors and component/background combinations remain unchecked. Existing error messages are not consistently live regions or associated with form fields, and the complete keyboard order, zoom/reflow, mobile behavior, headings, screen-reader announcements and motion preferences have not been validated.
- No browser or screen-reader audit was run here, and no independent reviewer was involved. Perform automated axe checks on authenticated and public states, manual keyboard/zoom tests, screen-reader tests and a qualified independent WCAG review; correct findings before launch.
