# Accounts and sign-in — design review

Date: 2026-10-30
Outcome: review complete; revise before implementation.

Resolution: the user accepted all recommendations and simplifications on 2026-10-30.
They are applied in `.ai/runs/2026-10-30-accounts-and-sign-in-spec-corrections.md`.
Findings and line references below describe the pre-correction spec; application
implementation remains future work.

## Request and scope

Review `.ai/specs/2026-10-30-accounts-and-sign-in.md` for inconsistent or mutually
exclusive designs, antipatterns, and unnecessary complexity. The source spec and
application code are unchanged. References below use its current line numbers.

## Checklist

- [x] Read the complete spec, project instructions, lessons, relevant product
  decisions, platform and consumer contracts, and compatibility rules.
- [x] Inspect current session, entity, error, form, logging, and admin implementations.
- [x] Obtain the fresh-context scope review required by `om-spec-writing`.
- [x] Check installed Next.js auth guidance and current primary OWASP guidance.
- [x] Record actionable findings and distinguish accepted choices from defects.

## Verdict

Revise. The account scope is coherent, but session renewal, limiter concurrency,
legacy email identity, and concurrent role updates need explicit safety contracts.
Two validation/UI contracts also cannot be implemented consistently as written.
D23 remains the spec's stated prerequisite for Phase 1; D22 gates Phase 3.

## Findings

### High — mentor enrollment becomes an unrestricted session refresh endpoint

Lines 30–32 promise 24-hour sessions without a refresh flow, while lines 103 and
276 require the mentor endpoint to issue a new cookie even for an existing mentor.
The current `signSessionToken` always sets expiry to 24 hours from signing. Every
account can become a mentor, so periodically calling this authenticated endpoint
can keep a session alive indefinitely without presenting credentials. That defeats
the expiry-based limit on a stolen session. Whether revoked admin permissions also
survive renewal depends on whether roles come from the database or the old token;
the spec must require the database as their source.

Correction: preserve the original authentication deadline when replacing a token
after enrollment; a no-op should not extend it either. Bound the replacement
cookie lifetime accordingly and require password login after that deadline. Test
first enrollment and repeated calls near expiry. This does not require DB sessions.

### High — failure-only login counters do not define concurrent admission

Lines 112–119 require checking limits before hashing but incrementing login counters
only for failures. Checking a counter and awaiting bcrypt before recording failure
allows many simultaneous attempts against one address to pass the same check. The
specified sequential window/reset tests (241) would not detect this bypass. In
addition, evicting the oldest live key at capacity (124) can discard an address's
active lockout while client limits are disabled by default (122).

Correction: reserve capacity synchronously before asynchronous verification and
define completion accounting, or simplify to counting every admitted attempt.
Do not erase active protection to admit attacker-selected keys: specify a bounded
overflow bucket, conservative admission refusal, or a process-wide admission cap.
Add concurrent same-address and live-map-saturation tests. The already accepted
per-process limitation is separate from these within-process bypasses.

### High — normalizing future writes does not protect legacy email identities

Lines 83–84 say application normalization makes the existing case-sensitive unique
constraint effectively case-insensitive and legacy rows cannot be claimed. The
migration only adds columns (89, 235–238). Existing rows were never constrained to
canonical email format: `User.email` is an ordinary unique string.

Counterexample: a legacy `Ada@Example.com` row is not found by a normalized lookup
for `ada@example.com`; registration can insert the latter without violating the
existing unique constraint. Login and operator lookups can also miss the old row.
This breaks the promises at 148–149 even with exactly one future writer.

Correction: canonicalize existing rows in the migration and define what happens
when multiple rows collapse to one identity; fail explicitly for operator resolution
rather than silently merge accounts. Enforce the chosen canonical identity in the
database, through a suitable uniqueness/check strategy. Test uppercase/padded legacy
rows and canonical collisions before permitting registration.

### High — concurrent role writers can undo revocation

Lines 58, 81, 244 and 276 introduce multiple operations writing the same JSON role
array, but specify no transaction/locking or atomic-update contract. A single writer
class is not serialization: operator commands and HTTP requests use separate scopes.
An implementation that reads roles, adds/removes one value, and writes the array
can lose another update. In particular, mentor enrollment can read `admin`, race
with its revocation, and persist `admin` again as part of its updated array.

Correction: serialize role changes on the user row in a transaction, or use another
atomic mutation strategy through MikroORM. Build the response and replacement
claims from the committed authoritative roles. Add a concurrent revoke/enrollment
test proving revoked roles cannot be restored by a stale read. This is a design
gap, not a claim that the unimplemented service already contains this bug.

### Medium — password policy contradicts both the copy and login failure contract

Line 109 sets a minimum of 10 UTF-8 bytes, while line 132 promises at least 10
characters. Five `ą` characters satisfy the former and violate the latter. Separately,
line 111 caps the login schema at 72 bytes, which produces validation `400` before
verification, whereas line 151 says an overlong login password is simply not a match
(the generic `401` path).

Correction: define a character-count minimum and a separate bcrypt byte maximum,
then make the copy and boundary tests agree. Choose explicitly between `400` and
generic `401` for overlong login input, and align the shared form schema, route,
password helper, and edge-case text with that choice. Do not truncate passwords.
OWASP confirms the bcrypt input limit:
[Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Medium — the taken-email field error has no defined transport path

Lines 132 and 282 require the conflict to appear under the email field. Step 2
(227) only extends `ConflictError` with an optional code. The current constructor
cannot set `fieldErrors`, and `CrudForm` renders server field errors only from
`result.error.fieldErrors`; it does not interpret `email_taken`.

Correction: specify `fieldErrors: { email: [...] }` on this conflict and extend the
error constructor accordingly, or explicitly map the code in the colocated auth
form. Test the complete service-error/envelope/form path, not an invented fixture
that the service cannot emit.

## Complexity assessment

The admin guards and operator bootstrap are necessary consequences of public
registration and the selected no-email model. Multi-role accounts already have a
booking consumer. No evidence justifies replacing these with a role framework,
permission tables, or a generic auth workflow engine.

- Prefer one deployable core-auth PR, with backend and UI as internal steps, if its
  review size permits. The current two-PR release unit (178, 208–209) is an explicit
  reviewability choice, but creates coordination and rollback obligations. If kept,
  record the deployment hold concretely.
- Keep Phase 3's separate gate. Its inclusion was explicitly accepted in Q7 (185),
  so splitting it into another spec is optional, not a blocker.
- Keep hashing behind a small boundary, but correct the claim that argon2id adoption
  touches one file (29): `varchar(60)` (80), validation, format compatibility and
  rehashing policy would also need review. Avoid a pluggable algorithm framework now.
- A `defaultLandingPath(roles)` helper returning `/` for everyone is minor speculative
  structure, not a reason to block implementation.

## Review limits

Static design review only: no application behavior was changed and no validation
gate, browser session, migration, exploit, or load test was run. Concurrency examples
identify contracts missing from the design, not reproduced implementation defects.
The unverified-email, enumeration, operator-reset, per-process limiter, and stale-role
risks are explicitly recorded choices; their existence alone is not a new finding.
The scope reviewer found no additional merge-blocking scope problem.

OWASP's current [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
was also consulted for throttling and authentication error guidance. It does not
validate the spec's exact limiter numbers or unmeasured bcrypt timing estimates.

## Needs from you

None to complete this review. Implementation retains the spec's existing D23/D22
approval prerequisites; this review does not decide those product choices.
