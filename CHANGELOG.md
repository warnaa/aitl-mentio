# 0.1.0 (2026-11-17)

## Highlights
<!-- TODO: Highlights — auto-update-changelog leaves this blank for the human author to fill in. -->

## ✨ Features
- ✨ Set up the Mentio monorepo foundation: Next.js app, shared core and database packages, and UI kit. (#1)
- ✨ Add engineering standards: layered HTTP and UI layers, dependency injection, validated environment settings and logging. (#2)
- ✨ Add an idempotent `npm run setup` installer for a fresh clone (fixes #5). (#6)
- ✨ Add accounts and roles: GitHub and email sign-in with mentee, mentor and operator access. (#56)
- ✨ Invite mentors by email and grant the mentor role when they accept (fixes #34). (#60) *(@warnaa)*
- ✨ Publish a mentor page with a stable share link (fixes #35). (#61) *(@warnaa)*
- ✨ Let mentors publish availability and configure approved PLN prices (fixes #36, #37). (#63) *(@warnaa)*
- ✨ Align the remaining app screens with the approved prototype. (#65) *(@warnaa)*
- ✨ Add a reusable local QA environment and mentor publication coverage. (#67) *(@warnaa)*
- ✨ Reserve mentor slots at server-side prices (fixes #40). (#69) *(@warnaa)*
- ✨ Pay for bookings through Stripe Checkout and give operators dual-week payment reports (fixes #41, #53). (#72) *(@warnaa)*
- ✨ Tell both parties about a confirmed booking and sort sessions (fixes #42). (#73) *(@warnaa)*
- ✨ Open a text session for confirmed bookings (fixes #45). (#75) *(@warnaa)*
- ✨ Show the mentor's written answer on the session screen (fixes #46). (#77) *(@warnaa)*
- ✨ Let a mentor draft a private session note and send it for approval (fixes #47). (#79) *(@warnaa)*
- ✨ Let a mentee approve or decline the private session note (fixes #48). (#80) *(@warnaa)*

## 🔒 Security
- 🔒 Extend the threat model to the whole system and add secret-scan, dependency-audit and CodeQL jobs to CI. (#81) *(@warnaa)*
- 🔒 Upgrade Next.js to 16.4.5 and patch audited dependencies, clearing 1 critical and 3 high audit findings. (#82) *(@warnaa)*

## 🐛 Fixes
- 🐛 Read the repo-root `.env` in the Next app, so sign-in secrets apply, and make `npm run setup` work on Windows. (#59) *(@warnaa)*

## 🛠️ Improvements
- 🛠️ Update the vendored `om` agent skills. (#94) *(@warnaa)*

## 📝 Specs & Documentation
- 📝 Add the `om` agent skill collection and configure the PR pipeline. (#4)
- 📝 Assign PRs opened by `om-open-pr` to the person who opened them. (#7)
- 📝 Move the accounts-and-roles spec to implemented. (#57)
- 📝 Record the lesson that a PR delivering an issue says `Closes #N` (fixes #26, #31, #32, #33). (#58)
- 📝 Define the pending mentor booking flow. (#68) *(@warnaa)*
- 📝 Keep sanitized AI records committed and skip application checks for docs-only PRs. (#70) *(@warnaa)*
- 📝 Define the booking payment lifecycle. (#71) *(@warnaa)*
- 📝 Define the text session for confirmed bookings. (#74) *(@warnaa)*
- 📝 Define the written answer for text sessions. (#76) *(@warnaa)*
- 📝 Define the private session note lifecycle. (#78) *(@warnaa)*

## 🚀 CI/CD & Infrastructure
- 🚀 Add the PR pipeline: lint, typecheck, build, audit, a 100% unit coverage gate and browser integration tests. (#3)
- 🚀 Skip CI checks on draft PRs and agent-notes-only changes. (#64) *(@warnaa)*

## 👥 Contributors

- @warnaa
