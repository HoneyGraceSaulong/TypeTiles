# Password recovery backend

## Configuration

Set `PASSWORD_RESET_SECRET` to an independent cryptographically random secret of at least 32 characters in `server/.env`. It must differ from `JWT_SECRET`. Generate each secret separately with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit generated secrets or paste them into logs. Existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are reused. `RESEND_TEST_TO_EMAIL` is only for the Phase 1A development email test; recovery sends to the account's stored email.

Production startup requires a strong configured `JWT_SECRET`; placeholders are rejected. In development, a missing, short, or placeholder JWT secret uses a random process-local secret: all existing sessions expire on restart. Configure a strong persistent JWT secret for stable development sessions. Recovery always requires its own configured secret, including development. Changing either secret invalidates its corresponding sessions or pending codes; changing the recovery secret also changes rate-limit keys.

## Public API

All endpoints are POST under `/api/auth`, accept JSON, require no JWT, and use `Cache-Control: no-store`.

* `/forgot-password`: `{ "email": "user@example.com" }`. Always HTTP 200 with `{ "message": "If an eligible account exists, a password reset code will be sent." }`, including invalid, missing, banned, ambiguous, cooldown-limited, rate-limited, and unavailable-delivery cases. Delivery/database work runs after the response in a bounded queue (20 pending jobs); excess work is silently discarded with the same response.
* `/verify-reset-code`: `{ "email": "user@example.com", "code": "012345" }`. HTTP 200 `{ "valid": true }` if valid, otherwise HTTP 400 `{ "error": "Invalid or expired reset code." }`. Does not consume a valid code or extend expiry.
* `/reset-password`: `{ "email": "user@example.com", "code": "012345", "newPassword": "new-password" }`. HTTP 200 `{ "message": "Password reset successfully. Please log in again." }`. Bad code gives the same HTTP 400 code error. Password must have at least six characters and at most 72 UTF-8 bytes (bcrypt input limit); bad password gives HTTP 400 with a policy error. Operational failure on verify/reset returns HTTP 503 `{ "error": "Password recovery is temporarily unavailable." }`.

No response contains a code, password, or auth token. Submit codes as strings to preserve leading zeroes. Verification is informational; reset independently validates the code again, including after bcrypt hashing.

## Storage and limits

`createTables()` only adds `users.session_version INTEGER NOT NULL DEFAULT 0`, `password_reset_codes`, `password_reset_rate_limits`, and an index. Existing users, roles, stats, matches, and all other tables remain intact. No database reset/rebuild is needed.

Reset code columns: `id`, `user_id` (foreign key), `code_hash` (random issuance nonce plus HMAC-SHA256), `expires_at`, `attempts`, `consumed_at` (null means pending), `created_at`, `updated_at`. Recovery timestamps are epoch milliseconds. Codes use `crypto.randomInt`, are six digits, and expire after ten minutes. Hash input binds code to user and issuance nonce; plaintext is never persisted or logged.

* Forgot requests: ten per IP per 15-minute fixed window; three per normalized email per hour; 60-second email/account resend cooldown. Quotas apply to nonexistent emails too. Successful issuance invalidates all earlier pending codes.
* Verify/reset requests share quotas: 30 per IP and ten per email per 15-minute fixed window. A reset counts as one request despite its second atomic validation.
* Five wrong guesses per issuance, including malformed codes, consume/lock the code. Successful verification does not reset failures. A resend resets the per-code failures but remains subject to account quotas.
* Quotas are persisted, keyed with HMAC (no plaintext IP/email in rate storage), and survive process restarts. Stale rate rows are pruned during forgot processing after 24 hours. Fixed windows may permit bursts around boundaries.

Emails are trimmed and lowercased for lookup/rate limits without rewriting stored addresses or collapsing plus tags/dots. More than one case/whitespace-equivalent stored address disables recovery for that ambiguous address. Banned accounts do not receive recovery email. Existing registration's separate duplicate-email responses are unchanged.

## Atomic reset and sessions

Transactions use a separate SQLite connection and `BEGIN IMMEDIATE`, with a five-second busy timeout. Password update, session-version increment, and consumption of all pending codes commit together. Concurrent resets can succeed only once. Other user fields and related records are not changed.

All registration/login JWT issuance includes `sessionVersion`, including admin login through the shared endpoint. HTTP middleware and LAN authentication compare JWT version with current SQLite version. Legacy JWTs without a version are treated as version zero, so they work for untouched users but are rejected after reset. Legacy `player` roles still normalize to `student`.

After commit, a same-process event closes every matching authenticated LAN socket with code 4001 and removes it through existing leave-room behavior. Every subsequent LAN message revalidates its stored JWT. A five-second sweep also evicts idle revoked sockets, including resets by another process; in-flight work already authorized before a cross-process reset is not retroactively rolled back. No classroom cancellation, ownership transfer, scoring, or matchmaking rules were added. A disconnected host may log in again and use existing reconnect behavior.

## Delivery failures and limitations

Provider errors are sanitized by the Phase 1A service. Recovery logs only fixed generic messages, never email addresses, codes, provider payloads, secrets, or keys. A failed send consumes only that issuance, retains cooldown/quotas, and never changes the password. Provider acceptance is not proof of inbox delivery; no bounce/delivery webhook is implemented.

Forgot jobs are memory-resident, not a durable queue: shutdown or saturation can drop a request, and a slow provider occupies a queue slot. Forgotten-code response timing excludes account lookup and provider latency, but other endpoints are not guaranteed to have identical timing. Rate limits mitigate guessing; they are not a complete distributed denial-of-service defense and can cause temporary account recovery lockout. Express retains its existing untrusted-proxy setting: spoofed forwarded headers do not bypass IP limits, but users behind NAT share quotas. Proxy configuration needs review before future deployment.

Expired/consumed code records remain for now; retention cleanup is not scheduled. A stolen OTP can reset the account until expired/used; protect email accounts. Existing six-character password minimum and unverified registration emails remain limitations. No frontend recovery UI exists yet.

## Automated tests

From the workspace root:

```powershell
npm.cmd --prefix server run test:auth
```

Tests generate independent secrets, use a temporary SQLite file, and inject a mock delivery function. They never load backend `.env`, touch the working database, or call Resend. They cover valid/malformed/incorrect/expired/used codes, guess limits, persistent quotas and cooldown, missing/ambiguous/banned email, delivery failure, concurrent consumption, password change, legacy/current JWT rejection, all roles, record preservation, public API contracts, and existing LAN socket eviction.

## Manual backend procedure

1. Configure the secrets and Resend variables above. Start from `server` with `npm.cmd run dev`. Startup runs additive initialization; no reset command is needed. This implementation does not initialize your working database until you start it.
2. Use a disposable test account with an inbox you control. Log in using existing `/api/auth/login`, save the JWT locally, and optionally join a LAN room. Do not print passwords/tokens/codes in shared logs.
3. POST its email to `/api/auth/forgot-password`. Confirm the generic response also occurs for an unknown email and for an immediate resend. Read the code from the inbox; it is never returned by the API.
4. POST email and code to `/api/auth/verify-reset-code`; expect `{ "valid": true }`. POST email, code, and a compliant new password to `/api/auth/reset-password`; expect the success message.
5. Confirm the old JWT now gets HTTP 401 from `/api/auth/me`, existing LAN sockets close with 4001, old password login fails, and new password login succeeds with the same role and records.
6. Reuse the consumed code; expect HTTP 400. With a new issuance, make five wrong guesses; the correct code must then fail. With another issuance, wait ten minutes to confirm expiry. Observe hourly quotas when planning these manual checks; automated tests advance a fake clock instead.

Real recovery emails are sent only during an explicitly performed manual procedure, not automated tests.
