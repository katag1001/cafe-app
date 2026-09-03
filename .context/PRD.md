# Product Requirements Document — Cafe Discovery App

*Working name only — "CafeFinder" appears as a placeholder in the current header and is not a final brand decision. Visual design across the whole app is intentionally disregarded for now and will be overhauled once the product is functionally complete.*

Status: pre-build planning document, derived from a full design conversation covering architecture through interface. Treat this as the living spec for v1.

---

## 1. Product overview

A crowd-sourced cafe discovery app, similar in spirit to HappyCow: users find cafes filtered by practical criteria rather than a single generic star rating. The founding example: someone looking for a laptop-friendly cafe filters by the "Computer" category to see the best-rated options nearby; if they're also disabled, they cross-reference against the "Accessible" category to find a cafe that satisfies both. Discovery is the product — ratings exist to power good filtering, not just to display a number.

**Scope for v1:**
- Geographic scope: **global from day one** (not limited to launch cities).
- Platform: **mobile-first responsive web**, with desktop/other-browser support as secondary. No native app.
- Language: **English only**.
- Testing: **manual QA only** — no automated test suite required for v1.
- Infrastructure: **free tiers only** across the board (Vercel, MongoDB Atlas, OSM services, Gmail SMTP) — this is currently a portfolio project, not a launched public product, but is being built with real production discipline (security, data handling) because a real public launch is the intended eventual outcome.
- Design system: no hardcoded colors or styles anywhere — all design tokens live in one root theme file so the whole visual design can be swapped later without touching component code. The same "externalize it" principle applies to configuration values generally (see §11).

**Explicitly out of scope for v1** (deliberately deferred, not forgotten):
- User-uploaded cafe photos (moderation risk not worth solving yet — see §6.4)
- Admin-invites-admin flow (admins are managed via a simple env var allowlist)
- A distinct "verified contributor" status (superseded by the tier system in §8)
- Verified-user carve-outs in comment ranking
- Public leaderboards
- A tiered/weighted rating system for cities (replaced by a single threshold badge)
- Legal pages (Privacy Policy / Terms of Service)
- GDPR data export / "right to access" tooling
- Map marker clustering
- Non-English localization
- Automated testing
- Split/multi-window opening hours per day (single window per day only)
- Recomputing a cafe's rating history or any user's contributor stats when a cafe's address/city is corrected after the fact — deliberately not done; too complex relative to the value

---

## 2. Users & roles

- **Anonymous visitor** — can browse the map, view cafe details (verified cafes only), search/filter, read ratings and comments. Cannot rate, add, favorite, or flag.
- **Registered user** — everything above, plus adding cafes, rating, commenting, flagging, favoriting, and a public profile. Must have a **verified email** to log in at all (unverified accounts cannot log in, full stop).
- **Admin** — a registered user whose email appears in the `ADMIN_EMAILS` environment variable. Reviews pending cafe submissions and flagged-cafe reports. There is no third "moderator" tier and no in-app flow for an admin to create another admin — admin membership is entirely env-var-driven, checked fresh on every admin request (see §6.2) rather than cached in a token or database field, so revoking access is just an env var edit + redeploy.

---

## 3. Information architecture — full page list

| Page | Access | Purpose |
|---|---|---|
| Homepage | Public | Map + filterable/sortable cafe list, the core discovery surface |
| Cafe Detail | Public (verified cafes only) | Full cafe info, ratings breakdown, comments, rate/favorite/flag actions |
| Rate a Cafe | Logged in | Quick Review + category-specific rating flow (not a modal) |
| Public Profile | Public | Username, badges, favorites/"Top 10", cafes added (verified only), cafes rated |
| Login | Public | |
| Register | Public | Includes username; triggers email verification |
| Email verification landing | Public | Target of the emailed verification link |
| Resend verification email | Public | Shown when an unverified account tries to log in |
| Forgot / reset password | Public | Same signed-token mechanism as email verification |
| Add a Cafe | Logged in | Standard single-column form flow, ends in the geocoding/business-check confirm step |
| Edit / Resubmit a Cafe | Logged in (any user, not just creator) | Reuses the Add a Cafe form |
| My Area | Logged in (private, owner only) | My submissions (all statuses), my ratings (deletable), favorites management, account settings |
| Admin area | Admin only | Two-panel review queue: Pending Cafes and Flagged Cafes |
| 404 | Public | Standard not-found page |

---

## 4. Core data model (conceptual)

This section describes the *shape* of the data, not literal schema code — schema code gets written during the build phase.

### 4.1 User
- `username` — required, unique (case-insensitive), public-facing identity. Never null.
- `email` — required, unique, **never exposed to the frontend or other users**, visible only to the user themselves via their own account settings.
- `password` — bcrypt-hashed, never returned in any response.
- `emailVerified` (bool) + verification token metadata (hash + expiry, never the raw token stored).
- `active` (bool) — soft-delete flag. Deleting an account deactivates it and scrubs `email`/`password`, but keeps `username` and all their content (cafes, ratings, comments) attributed to it, since "the information they've put up should stay."
- `favorites` — array of up to 10 Cafe references (see §9).
- `contributorStats.categories` — **array** of `{ categoryId, count }` entries (not fixed named fields — see §11 for why).
- `contributorStats.cities` — array of `{ city, country, count }` entries, used only for the "Local" badge threshold (§8.3), not for any weighting.

### 4.2 Cafe
- `name`, `createdBy` (the adding user — tracked independently of anyone who later rates it; creating a cafe never contributes to a user's rating reputation).
- `address` (structured: street, houseNumber [string, not number], city, postcode, country).
- `location` — stored **twice**, deliberately: plain `{ latitude, longitude }` for the frontend/MapLibre to consume directly, *and* a GeoJSON `Point` with a `2dsphere` index for efficient server-side bounding-box queries. Both are written together from the same geocoding result at creation time and never diverge.
- `openingHours` — structured, one optional open/close window per day of the week (no split-hours support in v1).
- `phone`, `website` — optional, sourced from OSM enrichment or manual entry.
- `addressVerification` — `{ status: pending | verified | rejected, provider, verifiedAt, osm: { type, id } }` (see §6.4).
- `ratingSummary` — **array** of `{ categoryId, average, count, answers: [...] }` entries (not fixed named fields), plus a separate top-level `overall: { average, count }` for the Quick Review score (see §11).

### 4.3 CafeRating
One document per **(user, cafe)** pair — enforced via a unique compound index — containing:
- `overallScore` (1–5, the Quick Review; always unweighted)
- `categories` — array of `{ categoryId, score, weight, answers: [{questionId, value}], comment }` entries, one per category the user has rated on this cafe
- `weight` is **frozen at submission/edit time** — it reflects the rater's tier in that category *at that moment*, and never silently changes later even if their tier changes (see §8.2 for why)
- Comment ranking (§7.3) is likewise frozen at submission time

Editing an existing rating updates the relevant entry in place; it never creates a second document. A user can delete their own individual category ratings/comments at any time from My Area (never someone else's), which decrements the relevant counts and recomputes the affected cafe's `ratingSummary` and the user's own `contributorStats` — consistent with the principle that `ratingSummary`/`contributorStats` are always derived data, rebuildable from the `CafeRating` collection, never a fragile standalone counter.

### 4.4 Flag / Report
`{ cafeId, reportedBy, reason, otherText?, status: open | resolved | dismissed, createdAt }` — see §6.5 for the reason list.

### 4.5 Config files (not database collections)
- **Category registry** — the single source of truth for every category: id, label, and its full question bank (§7). Adding a category means adding one entry here.
- **Tier weight table** — the five tier names/thresholds and their weight multipliers (§8.1). Universal across all categories.
- **Email sender config** — the from-address/name, read by one shared `sendEmail()` utility (§6.3).

---

## 5. Authentication & account security

- **Registration** collects username, email, password. Password rule (already implemented, unchanged): 8+ characters, at least one letter, one number, one special character, bcrypt-hashed.
- **Email verification**: signed, single-use, expiring (~24h) token — only its *hash* is stored, never the raw token (same principle as password hashing: a DB leak shouldn't hand out usable tokens). The email contains a link to the verification landing page. **Unverified accounts cannot log in at all.** A resend option exists, rate-limited.
- **Password reset** reuses the exact same token mechanism, for logged-out users via email. Additionally, a **logged-in user can change their password directly from My Area** (current password required), without going through the email flow.
- **Session**: JWT stored in an **httpOnly cookie**, not `localStorage` — this is a deliberate hardening step so that an XSS bug elsewhere in the app can't read the session token via JavaScript. Regular user sessions last **6 months**. Admin sessions use a noticeably shorter expiry as defense-in-depth (exact duration to be set sensibly during build — the important protection is the live env-var re-check below, not the token lifetime alone).
- **CORS** is locked to the exact deployed frontend origin, with `credentials: true` — required for the cookie to be sent cross-origin, and incompatible with a wildcard origin by design (the browser forbids combining the two).
- **Rate limiting**: login capped around 10 attempts/15 minutes per IP; registration and resend-verification capped around 5/hour per IP (both are sensible defaults, easy to retune).
- **No secrets ever logged to the console** (existing `console.log(token)` calls must be removed).
- **`JWT_SECRET` must be a required environment variable with no fallback value** — the app should refuse to start if it's unset, rather than silently signing tokens with a publicly-known default string.
- **Account deletion is a soft delete**: deactivate, scrub `email`/`password`, keep `username` and all authored content intact. Users can independently delete their own individual ratings/comments at any time, separately from full account deletion.
- **Data exposure rule, applied everywhere**: a user's password is never returned by any endpoint; a user's email is never returned by any endpoint *except their own* `/me`-style request. Every other surface — populated `createdBy` fields, public profiles, comment authorship — exposes `username` only.
- GDPR data export and formal legal pages are explicitly **not** in v1 scope, but OSM attribution ("© OpenStreetMap contributors") is a required, low-effort footer credit given the ODbL license on the geocoding/business-check data used.

---

## 6. Admin & moderation

### 6.1 Roles
Exactly two: `user` and `admin`. No middle tier.

### 6.2 Admin membership
Determined by an `ADMIN_EMAILS` environment variable. Critically, admin authorization is **re-checked live against this env var on every admin-gated request** — never trusted from a role field baked into a JWT or cached in the database. This is what actually solves the "stale token" problem: revoking someone's admin access is just an env var edit and redeploy, with immediate effect, regardless of how long their existing session cookie has left to live.

### 6.3 Admin area
A protected page/route inside the same app (not a separate deployment). The header shows an "Admin" link only to users whose email is currently in the allowlist. Layout: a two-panel review console —
- **Right panel**: a list of open items, toggleable between two request types — **Pending Cafes** and **Flagged Cafes**.
- **Left panel**: full detail of whichever item is currently selected, with the relevant actions.

**Pending Cafes** action: approve (→ verified, creator notified by email) or reject, choosing from a fixed reason list plus a free-text "Other" field that gets included in the rejection email:
1. Could not verify this is a real business
2. Duplicate of an existing cafe already listed
3. Incomplete or inaccurate address
4. Inappropriate or vulgar content
5. Spam or promotional submission
6. Other (free text)

On rejection, the creator can edit and resubmit the same cafe (not create a new one), which resets it to pending and reruns the automatic verification.

**Flagged Cafes** action: resolve or dismiss a report. Flagged cafes **remain publicly visible while under review** — a deliberate anti-abuse decision, since auto-hiding an already-live cafe on a single unverified flag would be an easy way to take down a real business. The full flag reason list, available from any cafe detail page:
1. Cafe doesn't exist / never existed here
2. Cafe has permanently closed down
3. Duplicate of another listing already on the site
4. Incorrect address or location
5. Inappropriate or vulgar name/content
6. Spam or promotional listing
7. Not actually a cafe (wrong type of business)
8. Owner/manager requesting removal
9. Incorrect information (hours, contact details, etc.)
10. Other (free text)

Reason #2 (permanently closed) additionally gets a **dedicated one-click shortcut button** directly on the cafe detail page, since it's expected to be the most common report type — it's a fast-path into the same flagging system, not a separate mechanism. Cafes are only ever **hard-closed** (deleted outright once an admin confirms closure) — there is no soft-closed/archived state.

### 6.4 Email & notifications
Sent via **Nodemailer + Gmail SMTP** (an existing dependency, using `granthamkatarina@gmail.com` as the sending account for now) — deliberately *not* a dedicated third-party transactional email provider, since at this project's current volume a Gmail relay needs no new account signup, no billing relationship, and costs nothing. The sender address/name is a config value read by one shared `sendEmail()` utility, never hardcoded per call site, so swapping providers later (e.g. to Resend, before any real public launch) is a one-file change. All email sending is **best-effort and non-blocking** — a failed send never blocks or rolls back the underlying action; the source of truth is always the database.

Use cases: admin reminder when a cafe needs review; signup email verification; resend-verification; password reset; cafe-approved notification (email **and** a one-time in-app toast, since it might happen instantly); cafe-rejected notification (**email only**, including the reason).

---

## 7. Cafe submission & verification

### 7.1 The flow
1. **Frontend** enforces required-field validation (empty checks live client-side for UX); the **backend** still keeps a thin safety net rejecting obviously malformed input (empty/oversized/wrong-typed fields), since the API is a public URL a form can be bypassed for.
2. **Stage A — Nominatim** (free, keyless, public OSM geocoder): does the submitted address resolve to a real place at all?
3. **Stage B — Overpass API** (free, keyless, public OSM query API): is there any **named commercial POI** within roughly 30–50m of that point — deliberately *not* restricted to specifically `amenity=cafe`, just "a business is here," since OSM's tagging of small independent cafes is inconsistent.
4. If Overpass finds a matching POI, its `opening_hours`, `phone`, and `website` tags (when present) are extracted — `opening_hours` gets run through the open-source **`opening_hours.js`** parser to prefill the app's own structured per-day format.
5. **Confirm step** (part of the same Add a Cafe form flow, not a separate page): the matched/normalized address and any auto-fetched fields are shown back to the user to accept or edit before final save. This doubles as informal typo-correction, since Nominatim's fuzzy matching quietly normalizes minor spelling differences in what it returns — there is no live-as-you-type autocomplete, since Nominatim's usage policy explicitly forbids that.
6. **Outcome**:
   - **Both stages pass** → saved immediately as `verified`, fully public right away, creator notified instantly (email + toast).
   - **Either stage fails or is inconclusive** (including the OSM services timing out — never treated as a rejection) → saved as `pending`, **fully hidden from every public surface** (map, list, search, other users' view of the creator's profile). An admin reminder email fires (best-effort) and the item appears in the admin queue. The creator still sees their own pending submission, with its status, in their private My Area — but not on their public profile.
7. Admin approves or rejects per §6.3.

### 7.2 Why not Google Places
Deliberately rejected: it requires a billing-enabled account (not "free" in the no-signup sense the OSM tools are), and its terms restrict long-term caching of results — directly incompatible with this app's "geocode once, store forever" architecture. OSM data (ODbL) has no such restriction.

### 7.3 Editing & duplicates
Any logged-in user can edit any cafe (open, collaborative editing — not restricted to the original creator). Direct deletion of a live cafe by a regular user is **not** provided; removal only happens via the flag → admin-review → admin-deletes path (§6.3). Duplicate detection is accepted as in-scope for v1, but the exact detection method (name similarity, proximity radius, or both) was not designed in this conversation and needs its own follow-up pass before implementation.

---

## 8. Rating system

### 8.1 The two rating entry points
- **Quick Review** — a single 1–5 star, not tied to any category, feeding the cafe's `overall` average. **Always weighted at ×1 for every user, regardless of tier.** Giving Quick Reviews never earns a user any tier or badge.
- **Category rating** — pick a category, give a 1–5 quick score (this one *is* weighted, per §8.2), then optionally answer that category's question bank (§9), and optionally leave a comment (§8.3).

**Navigation**: arriving via a specific category tab on the Cafe Detail page shows only that category's rating form, with its own submit button. Arriving via the General tab's "Rate this cafe" action shows the Quick Review section *plus all five category sections stacked*, each with its own independent submit button — a user can fill in and submit as many or as few sections as they like, one at a time. This is a standard form flow, not a modal.

A user can update/override any of their existing ratings on a cafe at any time (the UI shows "you've already rated this" and offers to override); they cannot submit a second separate rating for the same cafe.

### 8.2 The tier & weighting system
A user earns a tier **per category only** — there is no "overall" tier. Someone who has only ever given Quick Reviews has no tier or badge anywhere, since tiers are earned purely by category-specific rating counts.

| Tier | Name | Ratings in category | Weight multiplier |
|---|---|---|---|
| 1 | Coffee Curious | 1–5 | ×1 |
| 2 | Café Regular | 6–20 | ×1.2 |
| 3 | Bean Scout | 21–50 | ×1.4 |
| 4 | Coffee Connoisseur | 51–100 | ×1.7 |
| 5 | Café Oracle | 101+ | ×2 |

0 ratings in a category = no tier, no badge shown for it. Weight depends only on the tier bucket, not the exact count within it (a 6-rating Café Regular and an 18-rating Café Regular weight identically). This weight applies **only** to a rater's 1–5 category quick-score when computing that category's average on a cafe — it never applies to Quick Review, and never to any of the granular question answers or comments (§9), which are always simple unweighted tallies.

**The weight is frozen onto the `CafeRating` entry at the moment it's submitted or edited** — it does not silently increase later if the rater levels up without touching that specific rating again. This mirrors the decision not to recompute stats when a cafe's address is corrected: both choices trade a small amount of "live" accuracy for avoiding a cascading recompute across every cafe a user has ever rated, and for keeping `CafeRating` a clean, self-contained, honestly rebuildable source of truth.

### 8.3 Comments
Each category's "any other comments" question is free text, optional, and is **not** stored on the cafe object as structured aggregate data — it's collected per `CafeRating` category entry and surfaced as a **top 10 comments** list on that category's tab. Ranking is by **how many ratings that specific user has made in that specific category** (raw count, not tier bucket — e.g. a 4-rating Coffee Curious outranks a 1-rating Coffee Curious), **frozen at the moment the comment was submitted** (a commenter's position doesn't shift later as they keep rating elsewhere). There is no verified-user carve-out in v1 — ranking is purely by that frozen count.

Each comment displays alongside the commenter's username: their **city "Local" badge**, if this cafe's city is one where they've crossed the threshold (§8.4), and their **tier badge for this specific category**.

### 8.4 City "Local" badge
No tier ladder for cities at all — just one binary threshold. More than 20 ratings by a user in a given city earns a single badge, dynamically named (e.g. "Barcelona Local"). No weighting effect whatsoever. Shown on the user's public profile and next to their name wherever their comment appears on a cafe in that city.

---

## 9. Question banks & answer types

All questions in every category are **independently optional** — a user can answer none, some, or all. An unanswered question writes no data at all (no null/zero placeholder). None of these answers, nor comments, are weighted by tier.

### 9.1 Answer types
- **Yes/No** — tallied as running yes/no counts; UI shows a progress bar with a status label above it: 0–40% yes → "No", 40–65% → "Maybe", 65–100% → "Yes".
- **Select options** (used for the milk question) — behaves as **independent yes/no toggles per option**, not a single choice; UI shows one button per option (rather than two Yes/No buttons) and one progress bar per option. Multiple options can be selected simultaneously — **except** selecting "None" deselects and disables every other option for that question.
- **Scale** (None / Minimal / Lots / Loads) — shown as a plain percentage split across the four buckets (no blended single score). Visual treatment (for the later design pass): color-graded, with whichever bucket holds the largest share rendered visually larger than the others.
- **Time range** (used once, for laptop-usage hours) — individual start/end times collected; the cafe displays the **median** start and median end across all respondents.

### 9.2 Full question bank (initial 5 categories)

**Computer**
| Question | Type |
|---|---|
| Can you bring laptops here? | Yes/No |
| Are there power outlets available near the seating areas? | Scale |
| Is the Wi-Fi reliable enough for working on a laptop? | Scale |
| Is there enough table space to comfortably use a laptop? | Yes/No |
| Is the cafe quiet enough to comfortably concentrate on laptop work? | Yes/No |
| Can you comfortably make video calls from the cafe? | Yes/No |
| Does the cafe have dedicated areas suitable for working on a laptop? | Yes/No |
| Would you feel comfortable staying here for a couple of hours while working? | Yes/No |
| Are there specific times you're allowed to use a laptop? | Time range (median start/end) |

**Accessible** (all Yes/No)
- Is the cafe step-free from the entrance to the main seating area?
- Is there enough space between tables for a wheelchair to move comfortably?
- Is there an accessible toilet available?
- Can you easily enter the cafe without needing assistance?
- Is there accessible seating available, such as tables with enough legroom for a wheelchair?

**Veggie**
| Question | Type |
|---|---|
| Do they offer alternative m*lks? | Select: None, Soy, Oat, Coconut, Other |
| Is there at least one vegetarian food option? | Yes/No |
| Is there at least one vegan food option? | Yes/No |
| Are vegan/vegetarian options clearly identified on the menu? | Yes/No |
| Does the cafe allow vegan/vegetarian substitutions? | Yes/No |

**Cosy** (all Yes/No)
- Does the cafe have comfortable seating suitable for staying for a while?
- Is the cafe generally quiet enough to have a relaxed conversation?
- Does the cafe have a warm or intimate atmosphere?
- Is the seating arranged in a way that gives you a sense of privacy?

**Datespot** (all Yes/No)
- Is the atmosphere romantic or intimate enough for a date?
- Is there enough privacy between tables for a couple to have a personal conversation?
- Is the cafe public and open enough that you would feel comfortable meeting a stranger here?
- Is there usually enough staff or activity around that you wouldn't feel isolated?
- If you needed help during a date, do you feel like it would be easy to approach a member of staff?

---

## 10. Search, filtering & the map

### 10.1 Homepage layout
Map on one side, cafe list on the other (existing layout retained). A row of category filter buttons sits above the list; a free-text cafe-name search box is also available, **scoped to the current visible map area only** — it does not surface or pan to matches outside the current viewport.

### 10.2 Category filtering & sorting
- **No category selected**: every cafe shows its **overall Quick Review** average; list sorted by it, highest first.
- **One category selected**: shows and sorts by that category's weighted average; the list is filtered to cafes that actually have data in that category (a cafe with zero ratings there doesn't appear).
- **Multiple categories selected**: each cafe's displayed score is the mean of its averages across whichever of the selected categories it actually has data for (a cafe missing one of the selected categories still appears, scored on the ones it has); list re-sorts to always show the highest first.
- Selecting a filter always triggers a re-sort of the current result set.

*Assumption flagged for confirmation*: multi-category filtering was described in terms of "show only the ones in the category" for efficiency, but the exact inclusion rule (must a cafe have data in **all** selected categories, or **any**) wasn't explicitly specified. This document assumes **any** (inclusive), since requiring all selected categories to have data would likely hide most results once two or more filters are active.

### 10.3 Map / viewport loading
- `Cafe.location` is queried via the `2dsphere`-indexed GeoJSON point; the map sends its current bounding box on pan/zoom (debounced ~300–400ms after movement settles).
- A single backend aggregation does everything in one pass: match cafes inside the bounding box (and `verified` status only) → compute the active display score per §10.2 → sort → paginate.
- **Pagination**: 10 cafes per page, numbered next/previous page navigation (not infinite scroll).
- **Safety caps**: a hard limit of 1000 cafes per query, plus a minimum zoom level below which individual cafe markers/list results simply don't load (a "zoom in to see cafes" prompt instead) — exact zoom threshold to be set sensibly during build. Marker clustering is explicitly deferred.
- Default map view centers on the user's geolocation (with permission).
- Selecting a category filter also updates what the map markers/popups display, for consistency with the list.

### 10.4 "Open now" filter
In scope for v1. Depends on the structured single-window-per-day `openingHours` field (§4.2, §7.1) — computed against the current day and time, no OSM re-querying involved (the data was already captured once, at creation/confirm time).

A note on efficiency, since it came up directly in discussion: restructuring `ratingSummary`/`CafeRating`/`contributorStats` as small arrays keyed by category id (rather than fixed named fields, per §11) adds no measurable load-time cost at this app's realistic scale — the arrays involved are bounded by the number of categories that exist (a handful, growing slowly and deliberately), not by user or cafe volume. The parts of this query path that genuinely cost time — the geospatial index doing its narrowing work, network round-trips, and (if applicable) serverless cold starts — are entirely unaffected by this choice.

---

## 11. Category extensibility

Categories are treated as **data, not schema**. A single **category registry** config file is the source of truth for every category's id, label, and question bank (§9). `Cafe.ratingSummary`, each `CafeRating`'s category entries, and `User.contributorStats.categories` are all modeled as **arrays keyed by `categoryId`**, not fixed named fields (`computer`, `accessible`, etc. hardcoded into the schema). The same idea applies one level deeper: each category's question-answer tallies are stored as `{ questionId, tally }` entries rather than a fixed per-category shape.

**Practical effect**: adding a sixth category, or a new question inside an existing category, requires editing only the registry file — no schema migration, no controller changes, and no frontend component changes, since every rendering surface (category tabs, filter buttons, rating form sections, question renderers) iterates the registry dynamically rather than hardcoding category names.

This is the same standing principle applied elsewhere in this project — the tier weight table (§8.2) and the email sender config (§6.4) are likewise their own dedicated, easily-editable files, for the same underlying reason: nothing that might plausibly need tuning later should be buried inside logic code.

---

## 12. Favorites / "Top 10"

*Assumption flagged for confirmation*: the source conversation referred to both a "favourites"/"likes list" and a "top 10 list"; this document treats them as **one single list, capped at 10 entries**, populated through either of two entry points, since a genuinely separate two-list model (an uncapped "liked" pool feeding a curated public subset) was never explicitly confirmed. Worth a quick check before this feature is built.

- **Entry point 1**: a "Favourite" toggle on any Cafe Detail page, visible to logged-in users — directly adds/removes that cafe.
- **Entry point 2**: from the user's own public profile. If the list is empty, an "Add to Top 10" button opens a picker listing cafes the user has personally **rated**, sorted by the score they themselves gave (highest first), for them to choose from. If they've never rated anything, the picker instead shows a "Browse cafes" button that returns to the homepage.
- Displayed publicly on the profile as a "`username` loves…" section.

---

## 13. Page specs

### 13.1 Cafe Detail
- Header: cafe name.
- A small map showing just this cafe's pin.
- Tab bar: **General** (default) + one tab per category, rendered dynamically from the category registry.
- **General tab**: address, opening hours, phone, website, overall Quick Review score, who added it, a primary "Rate this cafe" button (opens the full flow — Quick Review + all five category sections, each independently submittable), a "Favourite" toggle, a general "Flag this cafe" button (the 10-reason picker), and a small dedicated "Report as permanently closed" shortcut (fast-path into the same flagging system).
- **Each category tab**: split into that category's question-answer breakdown on one side and its top 10 comments on the other (each comment showing username + city "Local" badge if applicable + tier badge for that category), plus a "Rate [Category]" shortcut that jumps straight into that category's form.

### 13.2 Add a Cafe
Standard single-column form, not a modal, submit button at the bottom — leading into the confirm step described in §7.1.

### 13.3 My Area
A single page holding everything, with layout deprioritized for now (revisit in the later design pass): my cafe submissions (all statuses, resubmit action on rejected ones), my ratings (view/delete, mine only), favorites management, and account settings (change username, change password directly, request account deletion, resend verification if needed).

### 13.4 Public Profile
- Top: username plus earned badges rendered in a pill/badge shape (category tier badges + city "Local" badge(s) — nothing shown for categories/cities with zero qualifying activity).
- A "`username` loves…" section showing their favorites/Top 10, rendered as a narrower (~25vw) column on the left side of the page.
- Cafes they've added (verified only — pending/rejected stay private to My Area) and cafes they've rated (showing their actual given scores).

### 13.5 Admin area
Two-panel layout: right side lists open items with a toggle between Pending Cafes and Flagged Cafes; left side shows full detail of the selected item with its actions (§6.3).

---

## 14. Non-functional requirements

- **Security**: bcrypt password hashing (already correct); httpOnly cookie sessions; locked-down CORS; rate limiting on auth endpoints; no email/password exposure beyond the owner; soft-delete on account removal; admin status re-verified live on every admin request; no secrets in logs; `JWT_SECRET` required with no fallback.
- **Performance**: geospatial (`2dsphere`) indexing for viewport queries; single-aggregation query design combining geo-match, category scoring, sorting, and pagination; hard caps on result volume and minimum zoom.
- **Accessibility**: the app should be genuinely accessible where possible — a fitting standard given "Accessible" is itself one of the rating categories.
- **Mobile-first, responsive** design, built around one root design-token file.
- **Third-party services, all free-tier/keyless**: Nominatim (geocoding), Overpass API (business presence + enrichment), Protomaps + MapLibre (basemap/map rendering), Gmail SMTP via Nodemailer (email). No Google Places. OSM attribution required in the footer.
- **Hosting**: Vercel for the frontend; backend/database choice to accommodate free-tier MongoDB Atlas.

---

## 15. Known implementation gaps (current codebase vs. this spec)

Carried over from the initial codebase audit — these need addressing during the build phase, several superseded by decisions in this document rather than simple bug fixes:

1. `updateCafe`/`deleteCafe` check `req.user._id`, but the JWT payload provides `req.user.id` — broken owner-check. Superseded by §7.3: editing is open to any logged-in user, and deletion of live cafes only happens via the admin-reviewed flag path, not a user-facing delete endpoint.
2. No rating functionality exists yet at all (models only) — the entire system in §8–§9 needs building from scratch.
3. `createCafe` currently hard-rejects (400) when Nominatim finds no match, instead of saving as `pending` — needs the two-stage flow in §7.1.
4. No admin role, no admin routes, no notification email sending anywhere (Nodemailer is installed but unused).
5. `populate("createdBy", "name email")` references a non-existent `name` field and an `email` field that must never be exposed this way — needs to become `populate("createdBy", "username")`.
6. The frontend stores the raw JWT in `localStorage` and logs it to the console in places — needs to move to an httpOnly cookie, with all console-logging of secrets removed.
7. No client- or server-side field validation ahead of the geocoding call.
8. `getCafes` loads every cafe with no pagination, filtering, or bounding box — needs the aggregation-pipeline redesign in §10.3.
9. `JWT_SECRET` has an insecure hardcoded fallback — must fail to start if unset.
10. CORS is currently wide open — must be restricted to the deployed frontend origin with `credentials: true`.
11. No rate limiting anywhere yet.
12. `User` schema needs `username`, `emailVerified`, `active` (soft-delete), `favorites`, and the array-based `contributorStats` structure added.
13. `Cafe`/`CafeRating` schemas need the full restructuring described in §4.2–§4.3.

---

## 16. Open questions / assumptions carried into this document

1. **Favorites vs. "Top 10"** (§12) — treated as one list; confirm before building.
2. **Multi-category filter inclusion rule** (§10.2) — assumed "any of the selected categories," not "all."
3. **Duplicate-cafe detection algorithm** (§7.3) — accepted as in-scope, method not yet designed.
4. **Exact admin session length and minimum map zoom threshold** — described qualitatively, precise values to be set sensibly during build.
5. **Username format rules** — proposed default of 3–20 characters, alphanumeric plus underscore, case-insensitive uniqueness; not explicitly confirmed.

---

## 17. Glossary

- **Quick Review** — the unweighted 1–5 overall star rating, not tied to any category.
- **Category rating** — a 1–5 score for one specific category, weighted by the rater's tier in that category.
- **Tier** — a per-category (never overall) rank earned by rating-count volume: Coffee Curious → Café Regular → Bean Scout → Coffee Connoisseur → Café Oracle.
- **Weight** — the multiplier a tier applies to a rater's category quick-score when a cafe's average is computed; frozen at submission time.
- **"Local" badge** — a single threshold badge (>20 ratings in a city), unrelated to the tier system, display-only.
- **addressVerification.status** — `pending` (not yet confirmed, hidden from the public), `verified` (confirmed, live), `rejected` (declined, hidden, resubmittable).
- **My Area** — the private, owner-only account/dashboard page, distinct from the public profile.
