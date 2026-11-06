# MENTOR-PAGE-003: Refuse profile publication when no technology is selected

- **Area:** MENTOR-PAGE
- **Priority:** High
- **Type:** UI integration with authenticated API verification
- **Requirement:** The user's requested publication restriction and the [E02 profile publication contract](../../specs/2026-09-08-mentors-become-bookable.md), owner/publish API and Slice 2. A draft can be saved incrementally; publication requires a public-work link, biography and at least one stack tag.
- **Implementation:** [TypeScript integration test](../../../tests/integration/mentor-profile-technology.integration.test.ts)
- **Executable case:** `TC-MENTOR-PAGE-003 refuses profile publication when no technology is selected`
- **Prerequisites:** Fresh mock GitHub account, mentor role granted by an owned invitation through the real API, a refreshed mentor browser session and an isolated PostgreSQL/app from the native integration harness. No shared/demo persona is used.
- **Determinism:** Fixed business input; process ID only namespaces owned identities. No random input, clock-dependent assertion or fixed sleep. Real internal services and database; controlled mock GitHub adapter and logged mail.

## Given-When-Then

```gherkin
Given a signed-in mentor opens Edit profile from the mentor workspace
And their saved draft has a valid public-work link and biography
And no technologies are selected
When they choose Publish profile
Then publication is refused with a technology validation error
And the saved profile remains an unpublished draft without a share slug
And repeating the publish request directly cannot bypass the restriction
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create an owned mock account and accept a mentor invitation through the API; sign in again. | The browser reaches the mentor workspace with a current mentor session. |
| 2 | Follow Edit profile in Workspace navigation. | `/mentor/profile` shows Show mentees how you can help and the Technologies and topics group. |
| 3 | Fill About your mentoring and Public work link, leave every technology unchecked and save. | Saving the draft succeeds; owner API returns the supplied fields, `stackTags: []`, `publishedAt: null`, `slug: null`. Only the technology readiness item is unmet. |
| 4 | Choose Publish profile. | The UI shows Complete the required profile fields before publishing and the stack-tag error both in the checklist and beside the technology field. No share-link field or unpublish action appears. |
| 5 | Send the same authenticated publication request directly. | HTTP 422 with only `fieldErrors.stackTags`, containing Choose at least one stack tag. The saved profile remains unpublished and its other fields are preserved. |
| 6 | Reload the profile screen. | The technology requirement remains unmet; Publish profile remains available and no share link appears. |

## Related negative and boundary cases

Zero selected technologies is the minimum-size boundary covered here. Repeating
the rejected request checks that it has no publication side effects. The existing
[`TC-MENTOR-PAGE-001`](../../../tests/integration/mentor-page.integration.test.ts)
covers successful publication with a selected technology; the same existing file
covers missing fields, mentor authorization and publication lifecycle separately.
Those cases are references, not selected for this focused run. Missing resources,
conflicting slugs and external timeout/error handling are outside this one gate;
no external provider is contacted. Maximum tag count is a separate schema case.

## Cleanup

The test closes its isolated browser in `finally`, deletes its invitation before
its user (the profile cascades), then closes its own ORM connection. The native
runner also tears down its app process tree and disposable database on completion
or failure. Failure context and screenshots stay in ignored `test-results/`.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** Browser exploration confirmed the actual flow. The passing native run verified all steps above and captured [the refused publication screenshot](../../../test-results/integration/mentor-profile-technology-refused.png), visually inspected by the agent. Typecheck and focused ESLint also passed. The first attempt failed on an unsupported compound browser selector; a fresh snapshot reference fixed navigation, and the rerun passed.
- **Human review:** Pending.
