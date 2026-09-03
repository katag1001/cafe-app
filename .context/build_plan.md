# Build Plan

A staged, dependency-ordered implementation plan for everything in `PRD.md`, built to the constraints in `CLAUDE.md`. Every phase lists exact files to touch, so no phase requires re-exploring the codebase from scratch. Every task ends with a **manual QA** check (no automated tests — per `PRD.md` §1 / `CLAUDE.md` §8, this project is manual-QA-only) — stop and verify before moving on, as agreed.

Read `PRD.md` and `CLAUDE.md` in full before starting Phase 0. Each phase below references the specific PRD/CLAUDE sections it implements rather than repeating their content.

**Phase order and why**: auth (Phase 1) gates almost everything else (who's rating, who's admin). The category/tier config (Phase 2) is a prerequisite for the cafe schema and rating system, per `CLAUDE.md` §4.4 — building either before the registry exists would mean hardcoding categories and then having to undo it. Cafe verification (Phase 3) must exist before ratings (Phase 5) have anything to rate. Admin (Phase 4) is needed before Phase 3's pending-review path is actually usable end-to-end. Everything visual (Phases 6–10) comes last, once the data it displays actually exists.

---

## Phase 0 — Deployment & environment foundation ✅ (code done, awaiting your Vercel-deploy check)

*Why first*: nothing else can be verified against a real deployment until the Vercel serverless shape is correct (`CLAUDE.md` §3). Also unblocks every later phase's env-var needs.

| Task | Files | Notes |
|---|---|---|
| 0.1 Export the Express app instead of always calling `.listen()` | `api/index.js` | Guard `.listen()` behind `if (require.main === module)`; always `module.exports = app`. |
| 0.2 Add the Vercel rewrite | new: `vercel.json` (repo root) | `{ "rewrites": [{ "source": "/api/:path*", "destination": "/api/index" }] }` |
| 0.3 Cache the Mongo connection across invocations | `api/index.js` | Wrap `connectingToDB()` so it checks `mongoose.connection.readyState` before reconnecting (`CLAUDE.md` §3.3). |
| 0.4 Install new backend dependencies | `api/package.json` | `cookie-parser`, `express-rate-limit`, `opening_hours` (npm package name for the `opening_hours.js` parser), `nodemailer` (already present). |
| 0.5 Document/confirm env vars | `api/.env` (local, not committed), Vercel dashboard for prod | `MONGO`, `JWT_SECRET`, `ADMIN_EMAILS`, `EMAIL_FROM_ADDRESS`, `EMAIL_APP_PASSWORD`, `FRONTEND_URL`, `VITE_PROTOMAPS_KEY`. |

**Manual QA — end of Phase 0**: `npm run dev:api` still starts a local server exactly as before; hitting `GET /api/getTest` still returns `{ ok: true }`. Deploy to Vercel once (even with old features) and confirm `GET https://<deployment>/api/getTest` responds — proves the rewrite and export pattern actually work before anything else is built on top of it.

---

## Phase 1 — Auth & account security rework ✅ (code done, a few items need your local env values + real email to fully exercise)

*Reference*: `PRD.md` §5, `CLAUDE.md` §4.5, §5.3.

| Task | Files | Notes |
|---|---|---|
| 1.1 Fix the registration endpoint mismatch ✅ done | `src/components/login/Register.jsx` | Change `fetch('/api/auth/register', ...)` → `fetch('/api/register', ...)`. Standalone one-line fix, do first. |
| 1.2 Add `username`, `emailVerified`, `active`, `favorites`, `contributorStats` to the User schema | `api/models/models.js` (userSchema) | `username`: required, unique, lowercase for uniqueness check. `emailVerified`: Boolean default false. `active`: Boolean default true (soft-delete flag). `favorites`: array of Cafe ObjectIds, max length 10 (enforce in controller, not schema). `contributorStats.categories`/`contributorStats.cities`: empty arrays for now — populated in Phase 5. |
| 1.3 Email verification token fields + hashing | `api/models/models.js` | Add `emailVerificationTokenHash`, `emailVerificationExpires` to userSchema. Never store the raw token. |
| 1.4 `services/email.js` — shared send utility | new: `api/services/email.js`, new: `api/config/email.js` | `config/email.js` exports `{ fromAddress, fromName }` read from env vars. `services/email.js` exports `sendEmail(to, subject, html)` using Nodemailer + Gmail SMTP. All future email use-cases call this, never construct a transporter elsewhere. |
| 1.5 Registration: username + trigger verification email | `api/controllers/controllers.js` (`createUser`), `api/routes/routes.js` | Validate username uniqueness/format; generate + hash verification token; call `services/email.js` to send the verification link (best-effort, never blocks the response). |
| 1.6 Email verification endpoint | `api/controllers/controllers.js` (new `verifyEmail`), `api/routes/routes.js` | `GET /api/verify-email?token=...` — hash incoming token, compare, check expiry, set `emailVerified: true`, clear token fields. |
| 1.7 Resend verification endpoint | `api/controllers/controllers.js` (new `resendVerification`), `api/routes/routes.js` | Rate-limited (Task 1.11). Regenerates + invalidates the old token. |
| 1.8 Login: block unverified accounts, set httpOnly cookie | `api/controllers/controllers.js` (`loginUser`, `createToken`) | Return 403 if `!emailVerified`. On success, `res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none', maxAge: <6 months in ms> })` instead of returning the token in the JSON body. |
| 1.9 `requireAuth` reads the cookie, not the header | `api/controllers/controllers.js` (`requireAuth`) | Requires Task 0.4's `cookie-parser` wired into `api/index.js` (`app.use(cookieParser())`). Read `req.cookies.token` instead of `Authorization` header. |
| 1.10 Admin: env-var allowlist + live-checked middleware | `api/controllers/controllers.js` (new `requireAdmin`), reads `process.env.ADMIN_EMAILS` | Runs after `requireAuth`. Looks up the current user's email fresh from the DB (or from `req.user` if email is in the JWT payload) and checks membership in the comma-separated `ADMIN_EMAILS` list **on every request** — never cached (`CLAUDE.md` §4.5). Admin cookie gets a shorter `maxAge` than the regular 6-month one. |
| 1.11 CORS lock + rate limiting | `api/index.js` | `cors({ origin: process.env.FRONTEND_URL, credentials: true })`. Add `express-rate-limit` instances: ~10/15min on `/api/login`, ~5/hour on `/api/register` and the resend-verification route, applied in `api/routes/routes.js`. |
| 1.12 Remove logged secrets | `src/components/cafes/add_cafes/AddCafe.jsx`, `src/components/login/Login.jsx` | Delete the `console.log(token...)` / `console.log('LOGIN RESPONSE'...)` / `console.log('LOCAL STORAGE...')` lines. |
| 1.13 `JWT_SECRET` fail-fast | `api/controllers/controllers.js` (top of file, replacing `const JWT_SECRET = process.env.JWT_SECRET \|\| 'dev-secret-change-me'`) | `if (!process.env.JWT_SECRET) throw new Error(...)` at module load, no fallback string. |
| 1.14 Replace `authCache.js`'s token-reading pattern with a `/me` fetch | `src/components/login/authCache.js` → repurpose or replace, `src/App.jsx` | Per `CLAUDE.md` §5.3: no more reading a JWT from `localStorage`. `App.jsx` calls `GET /api/me` on mount (cookie sent automatically), stores `{ id, username, isAdmin }` (or `null`) in local state, passes it down as props. Update every component currently calling `getSessionToken()`/`setSessionToken()` (`AddCafe.jsx`, `Login.jsx`, `Register.jsx`) to stop doing so. |
| 1.15 `/me` endpoint returns username + isAdmin, never email/password | `api/controllers/controllers.js` (`getCurrentUser`) | `.select('-password')` already present — also exclude `email` from the response shape entirely except this one endpoint is allowed to include the *caller's own* email, per `PRD.md` §5. |
| 1.16 Header shows Admin link conditionally | `src/components/general/Header.jsx` | Accept the current-user prop from `App.jsx`; render an "Admin" link only if `isAdmin`. |
| 1.17 Password reset (forgot-password flow) | `api/controllers/controllers.js` (new `requestPasswordReset`, `resetPassword`), `api/models/models.js` (reuse or add separate reset-token fields), `api/routes/routes.js` | Same signed/hashed/expiring token pattern as 1.3/1.6. |
| 1.18 Change password while logged in | `api/controllers/controllers.js` (new `changePassword`), `api/routes/routes.js` | Requires current password to be re-verified via `comparePassword` before allowing the change. (Frontend UI for this lives in Phase 9 — My Area.) |
| 1.19 Soft-delete account endpoint | `api/controllers/controllers.js` (replace `deleteUser`), `api/routes/routes.js` | Sets `active: false`, scrubs `email`/`password`, keeps `username` and all authored content. |

**Manual QA — end of Phase 1**:
- Register a new account → confirm no login is possible until the verification link is clicked (try logging in immediately, expect a 403).
- Click the verification link → confirm login now succeeds and a cookie is set (check browser dev tools → Application → Cookies, `httpOnly` flag visible).
- Confirm no token/secret appears in the browser console anywhere in the registration/login flow.
- Attempt 11 rapid login attempts with a wrong password → confirm the 11th is rate-limited.
- Log in as a non-admin, confirm no "Admin" link in the header; add that email to `ADMIN_EMAILS` locally, restart the server, log in again, confirm the link now appears without re-registering.
- Confirm `GET /api/me` never returns a `password` field, and returns `email` only when called by the account owner.
- Request a password reset, follow the email link, confirm the new password logs in and the old one doesn't.
- Soft-delete a test account, confirm its username still appears wherever it authored something (there's nothing to author yet at this phase — just confirm the DB record is deactivated, not removed).

---

## Phase 2 — Config-driven category & tier architecture ✅ done

*Reference*: `PRD.md` §9 (question bank content), §11; `CLAUDE.md` §4.2, §4.4.

| Task | Files | Notes |
|---|---|---|
| 2.1 Category registry | new: `api/config/categories.js` | Array of `{ id, label, questions: [{ id, text, type: 'yesno'\|'select'\|'scale'\|'time', options?, exclusiveOption? }] }` for all 5 categories, transcribed exactly from `PRD.md` §9.2. `exclusiveOption` marks the milk question's "None" as deselecting the others. |
| 2.2 Tier weight table | new: `api/config/tiers.js` | Array of `{ tier: 1-5, name, minCount, maxCount (or null for 101+), weight }` transcribed from `PRD.md` §8.2. |
| 2.3 Serve the registry to the frontend | `api/controllers/controllers.js` (new `getCategories`), `api/routes/routes.js` (`GET /api/categories`) | Returns `config/categories.js` verbatim (no DB involved — it's static config, not a collection). |
| 2.4 Frontend fetches, never hardcodes, categories | new: `src/lib/categories.js` (or a small hook, e.g. `src/hooks/useCategories.js`) | A single fetch-and-cache-in-state helper other components import, rather than each component calling the endpoint independently. |

**Manual QA — end of Phase 2**: `GET /api/categories` returns all 5 categories with their full question banks matching `PRD.md` §9.2 exactly (spot-check a couple of questions per category). Confirm the frontend helper successfully fetches and logs the same data.

---

## Phase 3 — Cafe model rework + verification flow ✅ done

*Reference*: `PRD.md` §4.2, §7; `CLAUDE.md` §4.3, §4.4, §4.6.

| Task | Files | Notes |
|---|---|---|
| 3.1 Rework the Cafe schema | `api/models/models.js` (cafeSchema) | `location`: keep `{ latitude, longitude }` **and** add `geoLocation: { type: 'Point', coordinates: [lng, lat] }` with a `2dsphere` index (`cafeSchema.index({ geoLocation: '2dsphere' })`). Add `openingHours` (array of `{ day, open, close }`, one entry per day, optional). `ratingSummary` becomes an array: `[{ categoryId, average, count, answers: [{ questionId, tally }] }]`, plus a top-level `overall: { average, count }`. Keep `addressVerification` as-is (already matches the PRD). |
| 3.2 Overpass service | new: `api/services/overpass.js` | `findNearbyBusiness(lat, lng)` — queries the public Overpass API for any named POI with a commercial tag (`shop=*`, broad `amenity=*` list excluding infrastructure like `bench`/`waste_basket`, `office=*`, `craft=*`) within ~30–50m. Returns the matched tags (`opening_hours`, `phone`, `website`) or `null`. Must set a descriptive `User-Agent`, same as `nominatim.js`. |
| 3.3 Opening-hours parser wrapper | new: `api/services/openingHours.js` | Wraps the `opening_hours` npm package: takes an OSM `opening_hours` string, returns this app's structured per-day format (or `null` if unparseable). |
| 3.4 Rework `createCafe`: two-stage check, pending vs. verified | `api/controllers/controllers.js` (`createCafe`) | Stage A: `findAddress` (existing `nominatim.js`, unchanged). Stage B: `overpass.js`'s `findNearbyBusiness`, only called if Stage A succeeded. Both pass → save with `addressVerification.status: 'verified'`, `verifiedAt: now`. Either fails/times out → save with `status: 'pending'` (**never** the current `return res.status(400)` reject-on-not-found behavior — this is the core bug fix from `PRD.md` §15 item 3). Populate `openingHours`/`phone`/`website` from Overpass's tags via `openingHours.js` when available. |
| 3.5 Confirm-step: return matched data for the frontend to show before final save | `api/controllers/controllers.js` (`createCafe`), or split into two endpoints: `POST /api/cafes/check` (runs Stages A+B, returns proposed data without saving) + `POST /api/cafes` (actually saves what the user confirmed) | Two endpoints is cleaner given the "user can edit before saving" requirement — avoids a half-created DB record if they back out. |
| 3.6 Add a Cafe frontend: confirm-step UI | `src/components/cafes/add_cafes/AddCafe.jsx` | After the initial form submit, call the new `check` endpoint, render the matched/normalized address plus any auto-fetched opening hours/phone/website as editable fields, then a final "Add Cafe" submit calls the save endpoint. Standard form flow, not a modal (`PRD.md` §13.2). |
| 3.7 Admin reminder email on pending | `api/controllers/controllers.js` (`createCafe`), using `services/email.js` | Best-effort, never blocks the save (`PRD.md` §6.4). |
| 3.8 Creator notifications: verified (email+toast) / rejected (email only) | `api/controllers/controllers.js`, new toast-flag field or a lightweight `notifications` array on User, `src/pages/*` (wherever a logged-in user lands, to display a one-time toast) | The "toast" is a one-time in-app banner shown next time the user is active — simplest implementation: a `pendingNotifications` array on the User doc, cleared once shown/fetched. |
| 3.9 Editing is open to any logged-in user; remove creator-only restriction | `api/controllers/controllers.js` (`updateCafe`) | Delete the `cafe.createdBy.toString() !== req.user._id...` check entirely (also fixes the existing `req.user._id` vs `req.user.id` bug, since the check is being removed, not patched). Requires `requireAuth` only, not ownership. |
| 3.10 Remove the public delete-cafe endpoint | `api/controllers/controllers.js` (`deleteCafe`), `api/routes/routes.js` | Per `PRD.md` §7.3, regular users never directly delete a live cafe — removal only happens through the admin flag-review path (Phase 4). Delete this route/controller, or repurpose it as an admin-only action reused by Phase 4's closure handling. |
| 3.11 Rejection + resubmission | `api/controllers/controllers.js` (`updateCafe` or a dedicated `resubmitCafe`) | Editing a `rejected` cafe resets `addressVerification.status` to `pending` and reruns Stages A+B (Task 3.4's logic, extracted into a reusable function both `createCafe` and this call into). |
| 3.12 Public cafe queries return verified only | `api/controllers/controllers.js` (`getCafes`, `getCafeById`) | Add `{ 'addressVerification.status': 'verified' }` to the query filter. (Full aggregation/pagination rework happens in Phase 7 — this task is just the visibility filter, done now so pending cafes never leak publicly while Phases 4–6 are being built and tested.) |
| 3.13 "My cafes, all statuses" endpoint | `api/controllers/controllers.js` (new `getMyCafes`), `api/routes/routes.js` (`GET /api/cafes/mine`, `requireAuth`) | Returns the requesting user's own cafes regardless of status — backs My Area (Phase 9) and is needed now so Phase 3 is testable end-to-end (otherwise there's no way to see a pending cafe you just created). |

**Manual QA — end of Phase 3**:
- Add a cafe with a real, well-known address that Overpass will find a business at → confirm it saves as `verified` and is immediately visible via `GET /api/cafes`.
- Add a cafe with a nonsense/nonexistent address → confirm it saves as `pending` (not rejected — check the DB directly), does **not** appear in `GET /api/cafes`, and the admin notification email arrives.
- Confirm the pending cafe *does* appear via `GET /api/cafes/mine` for its creator.
- Edit a cafe you didn't create (as any other logged-in user) → confirm it succeeds (open editing).
- Confirm `POST /api/cafes` (the old direct-create path) can no longer produce a hard-rejected 400 purely because Nominatim found nothing.
- Confirm there is no working endpoint for a regular user to delete a live cafe.

---

## Phase 4 — Admin system ✅ done

*Reference*: `PRD.md` §6; `CLAUDE.md` §4.5.

| Task | Files | Notes |
|---|---|---|
| 4.1 Flag/Report model | `api/models/models.js` (new `flagSchema`/`Flag` model) | `{ cafeId, reportedBy, reason (enum, the 10-item list from PRD §6.3), otherText, status: 'open'\|'resolved'\|'dismissed', createdAt }`. |
| 4.2 Create-a-flag endpoint | `api/controllers/controllers.js` (new `createFlag`), `api/routes/routes.js` (`POST /api/cafes/:id/flags`, `requireAuth`) | Flagged cafes remain publicly visible (`PRD.md` §6.3) — this endpoint only ever creates a Flag document, never touches the Cafe's own status. |
| 4.3 "Report as permanently closed" shortcut | Reuses 4.2 with `reason` pre-set to the "permanently closed" value — a frontend-only shortcut (Phase 6), no separate backend endpoint needed. |
| 4.4 Admin: list pending cafes | `api/controllers/controllers.js` (new `getPendingCafes`), `api/routes/routes.js` (`GET /api/admin/cafes/pending`, `requireAuth` + `requireAdmin`) | |
| 4.5 Admin: approve/reject a pending cafe | `api/controllers/controllers.js` (new `approveCafe`, `rejectCafe`), `api/routes/routes.js` | Reject takes a `reason` (enum from the 6-item list in `PRD.md` §6.3) + optional `otherText`; triggers the rejection email (Phase 3's email plumbing, reused). |
| 4.6 Admin: list flagged cafes | `api/controllers/controllers.js` (new `getFlags`), `api/routes/routes.js` (`GET /api/admin/flags`) | |
| 4.7 Admin: resolve/dismiss a flag, hard-delete on confirmed closure | `api/controllers/controllers.js` (new `resolveFlag`), `api/routes/routes.js` | Resolving a "permanently closed" flag as confirmed deletes the Cafe document outright (hard close, no soft-closed state, per `PRD.md` §6.3). |
| 4.8 Admin area frontend | new: `src/pages/AdminPage.jsx`, new: `src/components/admin/AdminQueueList.jsx`, `src/components/admin/AdminRequestDetail.jsx` | Two-panel layout (`PRD.md` §13.5): right panel = toggle-able list (pending cafes / flagged cafes) from 4.4/4.6; left panel = full detail + action buttons for whatever's selected, calling 4.5/4.7. |
| 4.9 Route + gating | `src/App.jsx` (add `/admin` route), reuse the `isAdmin` prop from Phase 1 Task 1.14 to redirect non-admins away | Frontend gating is UX-only — the real protection is `requireAdmin` on every endpoint above (`CLAUDE.md` §4.5). |

**Manual QA — end of Phase 4**:
- As a non-admin, confirm calling any `/api/admin/*` endpoint directly (e.g. via curl with a valid non-admin cookie) returns 403, not just that the frontend hides the link.
- Approve a pending cafe from the admin area → confirm it now appears in public `GET /api/cafes` and the creator's email/toast fires.
- Reject a pending cafe with a reason → confirm the rejection email contains that reason, the cafe stays hidden, and the creator can edit + resubmit it (re-triggers Phase 3's verification).
- Flag a live, verified cafe → confirm it's still publicly visible while the flag sits open.
- Use the "permanently closed" shortcut, then confirm it as closed in admin → confirm the cafe is now actually gone (hard-deleted), not just hidden.

---

## Phase 5 — Rating system ✅ done

*Reference*: `PRD.md` §8, §9; `CLAUDE.md` §4.3, §4.4.

| Task | Files | Notes |
|---|---|---|
| 5.1 Rework the CafeRating schema | `api/models/models.js` (cafeRatingSchema) | `{ cafeId, userId, overallScore, categories: [{ categoryId, score, weight, answers: [{ questionId, value }], comment, commentRankSnapshot }] }`. Keep the existing unique compound index on `{ cafeId, userId }`. `weight` and `commentRankSnapshot` are both frozen at write time (`PRD.md` §8.2, §8.3) — never recalculated from a live lookup later. |
| 5.2 Tier + weight lookup helper | new: `api/services/tiers.js` | `getTier(count)` → looks up `config/tiers.js`, returns `{ tier, name, weight }` (or `null` for count 0). Pure function, no DB access — used by both the rating-submission path and anything displaying a badge. |
| 5.3 Submit/override the Quick Review | `api/controllers/controllers.js` (new `submitOverallRating`), `api/routes/routes.js` (`PUT /api/cafes/:id/rating/overall`, `requireAuth`, requires `emailVerified`) | Always weight 1. Upserts the `CafeRating` doc's `overallScore`, then recomputes `Cafe.ratingSummary.overall` (5.5). |
| 5.4 Submit/override a category rating | `api/controllers/controllers.js` (new `submitCategoryRating`), `api/routes/routes.js` (`PUT /api/cafes/:id/rating/:categoryId`) | Body: `{ score, answers: [...], comment }`, all except `score` optional per-field (`PRD.md` §9: unanswered questions write nothing). Look up the user's **current** count for this category → `getTier()` → freeze that weight onto this entry. Upserts into `CafeRating.categories`. Then recompute (5.5) and update `contributorStats` (5.6). |
| 5.5 Recompute `Cafe.ratingSummary` | new: `api/services/recompute.js` (`recomputeCafeRatingSummary(cafeId)`) | Pulls every `CafeRating` for the cafe, recalculates: `overall.average`/`count` (plain mean), and per category — the weighted average of `score` using each entry's frozen `weight`, plus the yes/no/scale/select/time tallies from `answers` (`PRD.md` §9.1's aggregation rules). Single reusable function, called after every rating write/delete (`CLAUDE.md` §4.3 — never hand-patch these fields inline). |
| 5.6 Recompute `User.contributorStats` | `api/services/recompute.js` (`recomputeUserContributorStats(userId)`) | Category counts: how many distinct cafes this user has a `CafeRating.categories` entry for, per category. City counts: join each rated cafe's `address.city`/`country`, tally per city (for the Local badge, Phase 8 — no weighting here). |
| 5.7 Comment ranking (frozen) | Part of Task 5.4 | At submission time, snapshot the user's *current* count in that category onto `commentRankSnapshot` on the `CafeRating.categories` entry — this is what Phase 6's top-10 comments query sorts by, and it does not change later even as the user rates more cafes. |
| 5.8 Delete own rating | `api/controllers/controllers.js` (new `deleteMyRating`), `api/routes/routes.js` (`DELETE /api/cafes/:id/rating/:categoryId`, `requireAuth`) | Removes just that category entry (or the whole `CafeRating` doc if it was the last category and there's no `overallScore`), then calls 5.5/5.6 to recompute. Ownership check: `userId` must match the requester — no exceptions, unlike cafe editing. |
| 5.9 Frontend: Rate a Cafe flow | new: `src/pages/RateCafePage.jsx` (or a section within Cafe Detail — see Phase 6), new: `src/components/cafes/rate/QuickReviewForm.jsx`, `src/components/cafes/rate/CategoryRatingForm.jsx`, `src/components/cafes/rate/AnswerYesNo.jsx`, `AnswerSelect.jsx`, `AnswerScale.jsx`, `AnswerTime.jsx` | Answer-type components render dynamically from the category registry (Phase 2's `useCategories`), not hardcoded per category. Arriving via a specific category tab shows only that category's form (own submit button); arriving via "Rate this cafe" on General shows Quick Review + all 5 category sections stacked, each independently submittable (`PRD.md` §8.1). Not a modal. |

**Manual QA — end of Phase 5**:
- Submit a Quick Review only → confirm `Cafe.ratingSummary.overall` updates and no category tier/count changes for that user.
- Submit a category rating with only the 1–5 score, no sub-questions answered → confirm no yes/no/scale tallies were written for that submission.
- Submit a category rating answering every question type at least once (yes/no, select with "None" then confirm other options became unselectable, scale, and — for Computer — the time range) → confirm each aggregates correctly on the cafe (spot-check the math by hand for a small number of ratings).
- Rate the same category on the same cafe 21 times from different tier-appropriate test accounts (or manually set counts in the DB) to cross a tier boundary → confirm the weight actually differs between a Coffee Curious and Café Regular submission, and that an *already-submitted* rating's weight does not change retroactively when the same user's tier later changes.
- Delete your own rating → confirm the cafe's `ratingSummary` and your own `contributorStats` both decrease correctly. Confirm you cannot delete someone else's rating via the same endpoint.
- Leave two comments from two different Coffee Curious accounts with different category rating counts → confirm the higher-count one ranks first once Phase 6's display exists (can verify via a direct query for now if the UI isn't built yet).

---

## Phase 6 — Cafe Detail page rebuild ✅ code done, needs your visual check (see note below)

*Reference*: `PRD.md` §13.1; `CLAUDE.md` §5.1, §5.4.

| Task | Files | Notes |
|---|---|---|
| 6.1 Tab layout | `src/components/cafes/view_cafes/ViewOneCafe.jsx` (rework), new: `src/components/cafes/detail/CafeTabs.jsx` | Tabs generated dynamically from the category registry (Phase 2) + a "General" tab, default-open. |
| 6.2 Mini-map | new: `src/components/cafes/detail/CafeMiniMap.jsx` | Reuses the MapLibre/Protomaps setup pattern from `src/components/cafes/view_cafes/ViewCafeMap.jsx`, but a single fixed marker, no interactivity required. |
| 6.3 General tab content | new: `src/components/cafes/detail/CafeGeneralTab.jsx` | Address, opening hours, phone, website, `ratingSummary.overall`, `createdBy.username`, the mini-map (6.2), and the action buttons (6.5–6.7). |
| 6.4 Category tab content — question/answer breakdown | new: `src/components/cafes/detail/CategoryBreakdown.jsx`, reusing the answer-type display logic (mirrors the input components from Phase 5.9 but read-only: progress bar + status label for yes/no, per-option bars for select, color-graded/size-proportional buckets for scale, median start/end for time) | Reads from `Cafe.ratingSummary[categoryId].answers`. |
| 6.5 Top 10 comments per category | new: `src/components/cafes/detail/TopComments.jsx`, `api/controllers/controllers.js` (new `getTopComments`), `api/routes/routes.js` (`GET /api/cafes/:id/categories/:categoryId/comments`) | Backend: pull that category's `CafeRating` entries with a non-empty comment, sort by `commentRankSnapshot` descending, take 10. Each shown with username + city "Local" badge if applicable (Phase 8) + category tier badge. |
| 6.6 Favorite toggle | `api/controllers/controllers.js` (new `toggleFavorite`), `api/routes/routes.js` (`POST /api/users/me/favorites/:cafeId`), new: `src/components/cafes/detail/FavoriteButton.jsx` | Enforce the 10-max server-side; visible only when logged in. |
| 6.7 Flag button + closure shortcut | new: `src/components/cafes/detail/FlagCafeButton.jsx` | The 10-reason picker (`PRD.md` §6.3) calling Phase 4's `createFlag`, plus the dedicated one-click "Report as permanently closed" shortcut. |
| 6.8 Rate buttons | Within 6.3 (General: "Rate this cafe" → the full flow from Phase 5.9) and within 6.4 (each category tab: "Rate [Category]" → just that category's form) | |

**Manual QA — end of Phase 6**:
- Load a verified cafe's detail page: General tab is the default view, mini-map shows the correct pin location.
- Switch to each of the 5 category tabs: confirm the correct question breakdown renders (spot-check a yes/no bar's percentage/status matches Phase 5's manual math, confirm the milk select shows one bar per option).
- Confirm top-10 comments are ordered correctly by rating count, not submission date.
- As a logged-out visitor: confirm Favorite/Flag/Rate buttons are absent or disabled with a sensible prompt.
- As a logged-in user: favorite a cafe, confirm it now appears via a direct check of `User.favorites`; try favoriting an 11th cafe, confirm it's rejected.
- Flag a cafe with a reason, confirm it lands in the admin flagged queue from Phase 4.

---

## Phase 7 — Search, filtering & map rework ✅ code done, needs your visual check

*Reference*: `PRD.md` §10; `CLAUDE.md` §3.4 (execution time), §4.4.

| Task | Files | Notes |
|---|---|---|
| 7.1 Confirm the `2dsphere` index is in place | `api/models/models.js` | Already added in Phase 3 Task 3.1 — this task is verification, not new code. |
| 7.2 Combined aggregation query | `api/controllers/controllers.js` (rework `getCafes` entirely) | Single pipeline: `$match` on `addressVerification.status: 'verified'` + `geoLocation` within the request's bounding box (`$geoWithin`/`$box`) + optional name search (`$regex`, case-insensitive) → `$addFields` computing `displayScore` (no category selected: `overall.average`; one selected: that category's average via `$filter`+`$arrayElemAt`; multiple: `$avg` over the `$filter`-ed matching entries) → `$sort` by `displayScore` descending → `$skip`/`$limit` (10 per page) → hard cap total matched at 1000 before pagination. |
| 7.3 Route/query params | `api/routes/routes.js`, `api/controllers/controllers.js` | `GET /api/cafes?bounds=swLng,swLat,neLng,neLat&categories=computer,accessible&search=blue+bottle&page=2&openNow=true`. |
| 7.4 "Open now" filter | `api/controllers/controllers.js` (`getCafes`) | Additional `$match` stage comparing `openingHours` against the current server-time day/hour when `openNow=true`. |
| 7.5 Frontend: category filter buttons | `src/components/cafes/view_cafes/CafeSidebar.jsx` (rework), new: `src/components/cafes/filters/CategoryFilterBar.jsx` | Buttons generated from the category registry (Phase 2); multi-select toggles; re-fires the Phase 7.3 query on change. |
| 7.6 Frontend: free-text search | new: `src/components/cafes/filters/CafeSearchBox.jsx` | Scoped to current bounds only, per `PRD.md` §10.1 — no global search, no auto-pan. |
| 7.7 Frontend: pagination | `src/components/cafes/view_cafes/CafeSidebar.jsx` | Numbered next/previous controls, 10 per page (not infinite scroll, per `PRD.md` §10.3). |
| 7.8 Frontend: map viewport wiring | `src/components/cafes/view_cafes/ViewCafeMap.jsx` | Debounce `moveend`/`zoomend` (~300–400ms) before refetching; enforce a minimum zoom level below which cafes aren't fetched/shown (a "zoom in to see cafes" message instead); default center to browser geolocation if permitted. |
| 7.9 "Open now" UI toggle | Part of 7.5's filter bar | |

**Manual QA — end of Phase 7**:
- Pan the map across two very different areas → confirm the sidebar list updates to match only what's in view, without a full-page reload feel (debounced, not firing on every pixel).
- Select no category → cafes sort by overall score. Select one → sort/filter changes to that category. Select two → confirm the blended average is correct by hand for a couple of test cafes, and a cafe missing one of the two selected categories still appears, scored on the one it has.
- Search a cafe name that exists outside the current viewport → confirm it does **not** appear (scoped search, no auto-pan).
- Zoom out past the configured floor → confirm individual cafes stop loading and the "zoom in" prompt appears instead of a flood of markers.
- Toggle "Open now" at a time of day when a known test cafe should read as closed → confirm it's excluded.
- Confirm pagination shows exactly 10 per page and next/previous works.

---

## Phase 8 — Reputation display & public profile ✅ code done, needs your visual check

*Reference*: `PRD.md` §8.2–§8.4, §12, §13.4.

| Task | Files | Notes |
|---|---|---|
| 8.1 Tier badge component | new: `src/components/profile/TierBadge.jsx` | Renders a pill-shaped badge from a `{ tier, name }` value; used on comments (Phase 6.5) and the profile page. |
| 8.2 City "Local" badge logic | `api/services/recompute.js` (already computing city counts in 5.6) | No new backend logic beyond checking `count > 20` when serving profile/comment data — this is a display threshold, not a stored flag, so it's computed at read time from `contributorStats.cities`. |
| 8.3 Public profile endpoint | `api/controllers/controllers.js` (new `getPublicProfile`), `api/routes/routes.js` (`GET /api/users/:username/profile`) | Returns: username, per-category tiers (via `services/tiers.js` on `contributorStats.categories`), city Local badges (8.2), favorites (populated), cafes created (verified only!), cafes rated (with actual scores, per `PRD.md` §13.4). |
| 8.4 Public profile frontend | new: `src/pages/ProfilePage.jsx`, new: `src/components/profile/BadgeRow.jsx`, `src/components/profile/FavoritesColumn.jsx` | Layout per `PRD.md` §13.4: badges across the top, "`username` loves…" favorites column at ~25vw on the left, cafes-added and cafes-rated sections. |
| 8.5 "Add to Top 10" picker (owner-only) | `api/controllers/controllers.js` (reuse `getMyCafes`-style query but for *rated* cafes sorted by own score), new: `src/components/profile/AddToTop10Modal.jsx` (this one *can* be a lightweight picker/popup — only the rating flow itself was required to avoid modals) | Empty favorites + viewing own profile → "Add to Top 10" button → picker of rated cafes sorted by the user's own given score, highest first; if none rated, show "Browse cafes" → homepage instead (`PRD.md` §12). |

**Manual QA — end of Phase 8**:
- View a profile with zero ratings in every category → confirm no tier badges render at all (not even "Coffee Curious" at zero).
- Push a test account past 20 ratings in one city → confirm the "[City] Local" badge appears on their profile and on their comments in that city, and nowhere else.
- As the profile owner with an empty favorites list, click "Add to Top 10" → confirm the picker shows your rated cafes sorted by your own score, and selecting one adds it; as a brand-new account with no ratings, confirm the "Browse cafes" button appears instead and correctly returns to the homepage.
- Confirm a stranger viewing your profile sees only your verified cafes, never a pending/rejected one.

---

## Phase 9 — My Area (private account dashboard) ✅ code done, needs your visual check

*Reference*: `PRD.md` §13.3; `CLAUDE.md` §5.2 (props-based state, no Context).

| Task | Files | Notes |
|---|---|---|
| 9.1 My Area page shell | new: `src/pages/MyAreaPage.jsx` | Single page, all sections, layout deprioritized per `PRD.md` §13.3 — just get it all present and usable. |
| 9.2 My submissions section | new: `src/components/myarea/MySubmissions.jsx`, backed by Phase 3.13's `GET /api/cafes/mine` | Shows status per cafe; a "Resubmit" action on rejected ones routing into the Add-a-Cafe edit flow (Phase 3.11). |
| 9.3 My ratings section | new: `src/components/myarea/MyRatings.jsx`, backed by a new `GET /api/users/me/ratings` (`api/controllers/controllers.js`, `api/routes/routes.js`) | Delete action wired to Phase 5.8's `deleteMyRating`. |
| 9.4 Favorites management | new: `src/components/myarea/MyFavorites.jsx`, reuses Phase 6.6's toggle endpoint | Remove-from-favorites here, in addition to the toggle on each cafe's own detail page. |
| 9.5 Account settings | new: `src/components/myarea/AccountSettings.jsx` | Username change (new endpoint, `api/controllers/controllers.js`/`api/routes/routes.js`, re-check uniqueness), change-password form wired to Phase 1.18, delete-account button wired to Phase 1.19, resend-verification wired to Phase 1.7 (edge case: shouldn't normally be reachable since unverified accounts can't log in, but keep for completeness/support cases). |

**Manual QA — end of Phase 9**:
- Confirm a pending and a rejected cafe both show correctly in My Submissions with the right status and that "Resubmit" actually re-enters the verification flow.
- Delete a rating from My Ratings and confirm it disappears from the cafe's public display too.
- Remove a favorite from My Area and confirm the cafe detail page's favorite button reflects the change.
- Change your password from Account Settings using the current-password-required flow; log out and confirm the old password no longer works.
- Soft-delete your account from here and confirm you're logged out and can no longer log back in with the old credentials.

---

## Phase 10 — Remaining pages & final polish pass ✅ done

*Reference*: `PRD.md` §3, §13.

| Task | Files | Notes |
|---|---|---|
| 10.1 404 page | new: `src/pages/NotFoundPage.jsx`, `src/App.jsx` (catch-all route) | |
| 10.2 Email verification landing page | new: `src/pages/VerifyEmailPage.jsx` | Calls Phase 1.6's endpoint, shows success/failure + a link to log in. |
| 10.3 Resend verification page | new: `src/pages/ResendVerificationPage.jsx` | Shown when Phase 1.8's login attempt returns "unverified." |
| 10.4 Forgot/reset password pages | new: `src/pages/ForgotPasswordPage.jsx`, `src/pages/ResetPasswordPage.jsx` | Wired to Phase 1.17. |
| 10.5 Move remaining hardcoded colors into the root theme | `src/App.css` (the `#166534`/`#b91c1c` literals and similar), any component CSS touched during Phases 1–9 | Add the missing tokens to `src/index.css`'s existing `:root` block (it already has a good set — extend it, don't replace it) and reference them everywhere instead (`CLAUDE.md` §5.4). |
| 10.6 Full manual regression pass | — | Walk every page in `PRD.md` §3 end-to-end as a logged-out visitor, a regular logged-in user, and an admin, using the phase-by-phase QA checklists above as the script. |

**Manual QA — end of Phase 10**: the full regression pass in 10.6 *is* the final QA gate — every checklist item from every prior phase should still pass, plus the new pages themselves (verification link flow, forgot-password flow, and confirming a genuinely unmatched URL shows the 404 page rather than a blank screen or crash).
