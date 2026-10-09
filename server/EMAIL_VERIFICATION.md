# Email verification backend (Phase 2B)

## Setup and migration

Configure `EMAIL_VERIFICATION_SECRET` with an independent cryptographically random secret of at least 32 characters. It must differ from `JWT_SECRET` and `PASSWORD_RESET_SECRET`; placeholders are rejected. Existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are reused. Secrets remain backend-only. Backend startup checks configuration before initializing SQLite/listening.

`createTables()` adds `users.email_verified INTEGER NOT NULL DEFAULT 0`, nullable `users.email_verified_at INTEGER`, `email_verification_codes`, a user/creation index, and separate `email_verification_rate_limits`. Verification timestamps are epoch milliseconds. Codes store ID, user foreign key, nonce-bound HMAC hash, expiration, attempts, consumption timestamp, and creation/update timestamps.

Migration takes a write lock, rechecks columns, and marks existing rows verified ONLY when it first adds `email_verified`. Legacy `email_verified_at` stays NULL: acceptance is grandfathering, not proof of inbox verification. Column creation, backfill, and verification table creation commit together. Subsequent startups do not backfill new accounts. Existing IDs, passwords, roles, session versions, stats, and matches remain unchanged. New inserts default to unverified, regardless of role.

No working-database reset or rebuild is needed. Stop older backend instances before activating this version: old authentication code would not enforce the new gate, and the previous registration response is incompatible with pending registration.

## Public endpoints

All are under `/api/auth` and accept JSON.

* `POST /register`: existing `{ username, email, password, displayName }`. Fields are validated at runtime; email is trimmed/lowercased; password requires at least six characters and at most 72 UTF-8 bytes. Username/display-name values are preserved after checking they are nonblank strings. Checks username and case/whitespace-equivalent legacy email collisions without changing existing rows. User, initial stats, and first OTP commit atomically. HTTP 201 returns `{ "message": "Account created. Verify your email before logging in.", "verificationRequired": true }` with no token or user session. Invalid fields return 400, duplicates retain generic username-or-email 409, throttling returns 429, and operational failures return generic 503. Duplicate registration never replaces credentials or sends another code.
* `POST /resend-verification-code`: `{ email }`. Always HTTP 200 `{ "message": "If an eligible account exists, a verification code will be sent." }`, including unknown, verified, banned, malformed, ambiguous, or throttled addresses. Delivery/account work runs after the response in a bounded queue of 20; overflow silently receives the same response. Only unverified, unbanned, unambiguous accounts are eligible.
* `POST /verify-email`: `{ email, code }`, where code is a six-character string (leading zeroes preserved). HTTP 200 `{ "message": "Email verified successfully. Please log in." }`. Invalid/expired/used/exhausted codes return 400 `{ "error": "Invalid or expired verification code." }`. Operational failures return 503 `{ "error": "Email verification is temporarily unavailable." }`. Success sets `email_verified=1`, stamps `email_verified_at`, and consumes every pending verification issuance atomically. No token is issued, and password, role, stats, and session version are unchanged.

Registration waits for its delivery attempt. Provider failure still returns pending-registration success because the account was already committed. The failed issuance is consumed, the account remains pending, and resend is possible after cooldown. Errors are sanitized; logs contain fixed generic messages only. Resend latency is excluded from its generic response, but registration latency is not identical between outcomes. Resend provider acceptance never verifies an address or guarantees delivery.

## Security and limits

Codes use `crypto.randomInt(0, 1_000_000)` and six-digit padding. Storage is random nonce plus HMAC-SHA256 bound to the `email-verification` purpose, user ID, and issuance. OTP comparison uses `timingSafeEqual`. Separate secret, tables, and rate-key purposes isolate verification from Forgot Password. Codes and sensitive provider payloads are never logged or returned.

* Expiry: ten minutes.
* Resend cooldown: 60 seconds per normalized email/account.
* Send limits (initial registration and resend combined): ten/IP/15 minutes and three/email/hour.
* Registration attempts: separate ten/IP/15-minute limit before bcrypt hashing; duplicate attempts count.
* Verification attempts: 30/IP and ten/email per 15 minutes.
* Five wrong guesses per issuance consume it; malformed/numeric codes count as incorrect guesses for a pending issuance.
* A new issuance invalidates previous pending codes, including after expiry or lockout. Quotas persist across restarts; stale rate rows are pruned after 24 hours during resend processing. Code records currently have no scheduled retention cleanup.

Express's existing proxy policy is unchanged. Forwarded headers do not grant trusted client IPs; NAT users share quotas. Fixed-window quotas can permit boundary bursts and temporary lockouts. Duplicate registration retains the existing 409 contract and therefore still reveals that either a username or email is taken. Unverified account squatting/reclaim and abandoned-account cleanup require a future product policy; never overwrite an account through duplicate signup. Email normalization does not remove plus tags or dots, and excludes unsupported formats rather than rewriting legacy addresses.

## Authentication and existing features

Correct credentials for an unverified account return HTTP 403 `{ "error": "Verify your email before logging in.", "code": "EMAIL_VERIFICATION_REQUIRED" }`. Wrong credentials for ordinary pending users remain generic 401; the existing banned-account 403 behavior is preserved. Verified login retains the existing token/user response and session-version claims.

HTTP middleware and LAN `authenticatePlayer()` require `email_verified=1` for every role. Existing message revalidation and the five-second socket sweep remain in use. Admin promotion cannot bypass verification; existing grandfathered Student, Teacher, Admin, and legacy player accounts continue to work. No gameplay, scoring, room lifecycle, or Admin-management behavior was changed.

Forgot Password retains separate OTPs/quotas and can reset a pending account's password, but does not verify its email; login remains blocked until verification. Password reset continues to increment session version and invalidate HTTP/LAN sessions. Verification itself neither changes the password nor increments session version.

## Tests and Phase 2C

Run from the workspace root:

```powershell
npm.cmd --prefix server run test:auth
npm.cmd --prefix server run build
```

Automated tests use temporary databases, independent generated test secrets, fake clocks, and mocked delivery. They do not load backend `.env`, migrate the working database, or call Resend. Coverage includes grandfathering, repeated initialization, atomic registration rollback, input validation, token-free registration, legacy/pending login, OTP format/leading zeroes/expiry/consumption/attempts, quotas/cooldown, delivery failure, concurrent verification, Teacher/HTTP/LAN gates, password-reset isolation, and existing recovery regressions.

No live email or browser verification is claimed. For a later manual walkthrough with `onboarding@resend.dev`, use the real inbox authorized by the Resend account; arbitrary recipients require a verified sender domain. Do not redirect all accounts' OTPs to a shared test inbox in application code.

Phase 2C must change `registerPlayer()` to expect token-free pending registration, stop `PlayerAuthProvider.register()` from storing `player_token`/setting a user, navigate signup to a public verification page, preserve the machine-readable login error code, and add verify/resend helpers using the existing API base URL. The verification page should keep OTPs in memory only, show generic resend messages and a 60-second countdown, and return to login after success without automatically authenticating. Until then, the current frontend cannot complete new-account registration correctly.
