# Release gate — currently NO-GO

This checklist is not a claim that the application or its providers have passed these checks. Do not enable real payments, import user CVs, or publish this as the requested complete product until the applicable gates are independently verified. `README.md` contains configuration and limitations.

## 1. Decide the launch scope

- [ ] Decide whether the first release is a restricted manual-workflow beta or the full requested product. Assisted/Agent/Delegated automation, supported application submission, workspace login and live provider verification are not complete. Do not describe the manual handoff as an automated submission.
- [ ] Identify the account owner, support contact, public URL, responsible operators, and approved staging and production environments. The connected Vercel account currently has no project; no deployment was created.
- [ ] Review privacy notices, terms, AI/provider data processing, retention, deletion requests, backups, incident response, and employer-board permissions with qualified reviewers. Gmail restricted-scope verification may take longer than a short configuration session.

## 2. Isolated staging and credentials

- [ ] Use a separate staging Supabase project and staging Stripe/provider accounts. Apply the migrations in order and check migration history, grants, RLS, private storage, backups and restore procedures. The connected Meridian database already has the migrations; do not replay them there.
- [ ] Provision the chosen Vercel project, HTTPS application origin, Supabase Auth site and redirect allowlist, and SMTP. Register the exact callback URLs. Supply keys through the deployment or provider secret manager, never in the repository or chat. Set Node 22 and keep account deletion and paid entitlement enforcement disabled until their tests pass.
- [ ] Configure at least one AI model and approved employer board. For the optional GitHub scheduler, follow the opt-in setup in `README.md`; verify that the default-branch workflow runs, alerting is configured, and failures are visible. Schedule the worker only once per intended environment.
- [ ] Configure optional Google/Microsoft OAuth only after confirming consent, scopes, provider reviews and the key backup/rotation plan. Configure Stripe **test-mode** prices, webhook endpoint and portal before testing any paid flow.

## 3. Verify with disposable accounts and data

- [ ] Run `npm ci`, lint, typecheck, tests, build and the full dependency audit in CI. Confirm the committed workflow runs in GitHub; local checks do not prove the hosted runner works.
- [ ] Exercise signup, email confirmation, recovery, login and logout in a real browser over HTTPS. Test two isolated disposable users against live RLS and private storage, including direct API access, expired sessions, stale forms and concurrency.
- [ ] Use synthetic CVs to test upload, download, text extraction, review, profile conflict handling, deletion and account export; test unsupported and oversized files. Review parser isolation/malware scanning before accepting untrusted public uploads. For PDFs, inspect content and pagination; unsupported scripts require DOCX or browser print.
- [ ] Import a small explicitly approved test board. Verify all four connector formats where relevant, pagination, failures, retries, lease fencing, concurrency, stale listings and source terms. No automatic expiry is currently implemented.
- [ ] Test real AI responses for drafting, extraction and matching; inspect errors, rate limits, cost limits, disclosure and data retention. Usage observations are not a trusted billing meter.
- [ ] Test manual interview timezones, daylight-saving transitions, conflict handling and export. Calendar connections are read-only and do not send invitations or reminders.
- [ ] In test mode verify Stripe checkout, duplicate attempts, webhook signature failures and replay, out-of-order events, cancellation, portal, reconciliation and recovery. Verify OAuth connection, refresh, expired/replayed state, disconnect and separate provider revocation. No provider integrations have been live-tested here.
- [ ] Test staged deletion and partial failures **only with disposable users** after a support and billing reconciliation procedure is established. Leave `ACCOUNT_DELETION_ENABLED=false` until the security/privacy review is complete. Confirm behavior for active sessions, storage cleanup, recovery jobs, provider access, billing, backups and retention.

## 4. Production readiness decision

- [ ] Conduct independent security and privacy review, load and abuse testing, accessibility review, monitoring/alerts, backup restore rehearsal and incident-response exercise. Confirm all required fixes are complete.
- [ ] Configure production separately from staging, deploy only the approved branch and secrets, run controlled production smoke tests, and document rollback and owner support procedures. Set domain and redirects deliberately; no custom domain has been selected here.
- [ ] Obtain an explicit release approval from the accountable owner. Current status is **NO-GO**, with substantial engineering, external configuration and provider/legal review outstanding. Their duration cannot honestly be promised to fit within one hour.
