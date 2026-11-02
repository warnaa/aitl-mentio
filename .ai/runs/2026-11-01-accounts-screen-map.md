# Accounts screen map — 2026-11-01

## Request

Prepare a Polish screen map for the accounts/roles prototype in `lekcja-07/mapa-ekranow.md`, trace states to stories and criteria, list specification and design-system gaps, and stop before building anything pending map approval.

## Checklist

- [x] Read repository instructions and lessons, brief, backlog, account specification, D18/D19/D22/D23 and research/personas.
- [x] Inspect design-system reference, auth components, PanelShell, Storybook accounts/E01 compositions and missing-pattern inventory.
- [x] Map actual #24 task under #14, with #18 as authentication consumer; explain the missing requested September specification and different numbering.
- [x] Write stable screen/state IDs, access rules, manually selectable outcomes and fictional demo fixtures.
- [x] Keep GitHub OAuth/email verification and unspecified mentee start as unresolved reservations; do not override product decisions.
- [x] Verify state/gap counts, local links, source references and whitespace; no product code changed.
- [x] Stop for the user's approval of the map.

## Files and outcome

Created `lekcja-07/mapa-ekranow.md` and this run log. Source specs, backlog, DS and application code remain unchanged. Used `om-ux-shape` as a read-only handoff aid, with the user's requested document structure. No prototype, tracker activity, build or application tests. Documentation analysis complete: 11 screen IDs, 60 state entries (45 source-grounded, 5 open questions, 10 scope reservations), 12 specification gaps and 6 DS gaps. Checked Markdown links against the local filesystem and state counts by script. Shell sandbox failed with a bwrap network-namespace error; authorized escalated file reads/writes were used. Python executable was unavailable; Python 3 completed the write and checks.

## Needs from you

Approve the map; resolve the product scope questions, especially GitHub/email verification versus active D19/D23 and role landing destinations, before the relevant prototype branches are designed. No implementation started.
