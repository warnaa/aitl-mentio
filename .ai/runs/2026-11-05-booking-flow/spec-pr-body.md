Refs #40
Source doc: .ai/specs/2026-11-05-booking-flow.md
Status: complete

## 🎯 Goal
Specify a pending, unpaid reservation for a mentee choosing a mentor slot and a 25/50-minute session at the server price.

## What Changed
The design covers transaction lock ordering, same-slot and cross-slot occupancy, history-preserving expiry, retry recovery, role/CSRF enforcement, truthful public duration selection and integration evidence. Payment and cancellation stay in their own stories. A fresh-context staff review found the cross-slot invariant; the spec now explicitly covers it.

Mockups: skipped — the shared test environment descriptor is not yet provisioned in this prepared worktree. Text-only spec; live screenshots belong to implementation QA.

## 💥 Breaking Changes
None — design only. Implementation will add a booking table and an occupied-slot removal restriction, with migration rollback and tests.