# Cafe Finder

A crowd-sourced cafe discovery app, similar in spirit to HappyCow: instead of one generic star rating, cafes are rated across purpose-built categories — **Computer**, **Accessible**, **Veggie**, **Cosy**, **Datespot** — so users can filter for what actually matters to them. The founding use case: someone looking for a laptop-friendly cafe filters by "Computer" to see the best-rated options nearby; if they're also disabled, they cross-reference against "Accessible" to find somewhere that satisfies both. Discovery is the product — ratings exist to power good filtering, not just to display a number.

This is a portfolio project (global scope, mobile-first responsive web, English only) built with production-grade discipline — real security and data-handling practices — because a genuine public launch is the intended eventual outcome, even though it currently runs entirely on free-tier infrastructure. The full product specification lives in [`PRD.md`](./PRD.md); the architecture and build constraints this README summarizes live in [`CLAUDE.md`](./CLAUDE.md). This document explains, in plain terms, what the app does and how its major processes actually work end to end.

---

## Table of contents

- [What the app does](#what-the-app-does)
- [Users & roles](#users--roles)
- [Tech stack](#tech-stack)
- [Core processes](#core-processes)
  - [Adding a cafe & automatic verification](#adding-a-cafe--automatic-verification)
  - [The rating system](#the-rating-system)
  - [Tiers, weighting & badges](#tiers-weighting--badges)
  - [Search, filtering & the map](#search-filtering--the-map)
  - [Admin moderation](#admin-moderation)
  - [Authentication & account security](#authentication--account-security)
  - [Email notifications](#email-notifications)
  - [Favorites / "Top 10"](#favorites--top-10)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Known scope decisions & what's deliberately left out](#known-scope-decisions--whats-deliberately-left-out)

---

## What the app does

At its core, Cafe Finder is a map + list of cafes that anyone can browse, search, and filter. Registered users can add new cafes, rate them across categories, leave comments, flag problems, and build a public profile with badges and favorites. An admin reviews new submissions and user reports before certain content goes live.

The product's central idea is that a single star rating hides too much information. A cafe might be a terrible place to work but a great date spot. So instead of one number, every cafe carries:

- An **overall Quick Review** score (a plain 1–5 star, unweighted, not tied to any category) — this is what you see when no filter is active.
- Up to five **category scores**, each built from a weighted quick-score plus a bank of specific yes/no, scale, multi-select, or time-range questions (e.g. "Are there power outlets near the seating areas?", "Is the Wi-Fi reliable enough for working on a laptop?").

Filtering by a category re-sorts the whole list and map by that category's score, and only shows cafes that actually have data for it.

## Users & roles

| Role | Can do |
|---|---|
| **Anonymous visitor** | Browse the map, view verified cafe details, search and filter, read ratings/comments |
| **Registered user** | Everything above, plus add cafes, rate, comment, flag, favorite, and have a public profile. Must verify their email before they can log in at all |
| **Admin** | A registered user whose email is in the `ADMIN_EMAILS` environment variable. Reviews pending cafe submissions and flagged-cafe reports via a dedicated Admin area |

There's no third "moderator" tier, and no in-app way for an admin to create another admin — admin membership is entirely env-var-driven and re-checked **live on every admin request**, never cached in a token or database field. That means revoking someone's access is just an env var edit and a redeploy, effective immediately regardless of how long their session cookie has left to live.

## Tech stack

- **Frontend** — React 19 + Vite, `react-router-dom` for routing, MapLibre GL + Protomaps for the map, plain CSS with custom properties (no CSS framework, no component library).
- **Backend** — Node.js + Express, Mongoose/MongoDB, deployed as a single serverless function.
- **Database** — MongoDB Atlas (free M0 tier).
- **Auth** — JWT stored in an `httpOnly` cookie, bcrypt password hashing.
- **External services** (all free-tier or keyless — no billing account needed anywhere):
  - **Nominatim** — geocodes a submitted address to real-world coordinates.
  - **Overpass API** — checks whether a named commercial point-of-interest actually exists near that location, and pulls opening hours / phone / website from OSM tags when available.
  - **`opening_hours.js`** — parses OSM's opening-hours text syntax into this app's structured per-day format.
  - **Protomaps** — vector basemap tiles rendered via MapLibre GL.
  - **Nodemailer + Gmail SMTP** — all outbound email (verification, password reset, moderation notifications).
- **Hosting** — Vercel, frontend and backend both, as one deployment (see [Deployment](#deployment)).
- **Linting** — `oxlint`.

No automated test suite exists or is required for this project — QA is manual.

## Core processes

### Adding a cafe & automatic verification

Adding a cafe isn't just a form save — it runs through a two-stage automatic verification check before the cafe becomes public, so the map doesn't fill up with fake or unverifiable listings:

1. **User fills in the Add a Cafe form** (name, address, opening hours, etc). Required-field validation happens client-side for UX, and again server-side as a safety net, since the API endpoint itself is a public URL that a form can be bypassed for.
2. **Stage A — Nominatim**: does the submitted address resolve to a real place at all?
3. **Stage B — Overpass**: is there a named commercial point-of-interest within roughly 30–50m of that resolved point? This deliberately isn't restricted to `amenity=cafe` specifically — just "a business is here" — because OSM's tagging of small independent cafes is inconsistent.
4. If Overpass finds a match, its `opening_hours`, `phone`, and `website` tags (when present) are extracted and prefilled — `opening_hours` gets run through the `opening_hours.js` parser to convert it into this app's structured per-day format.
5. **Confirm step**: the normalized address and any auto-fetched fields are shown back to the user to accept or edit before final save. This also catches typos, since Nominatim's fuzzy matching quietly corrects minor spelling differences.
6. **Outcome**:
   - **Both stages pass** → the cafe saves immediately as `verified` and is public right away; the creator is notified instantly (email + a one-time in-app toast).
   - **Either stage fails, or the OSM services time out** (a timeout is never treated as a rejection) → the cafe saves as `pending` and is **fully hidden from every public surface** — the map, list, search, and even the creator's own public profile. The creator can still see it, with its status, in their private My Area. An admin reminder email fires and the item lands in the admin review queue.
7. An admin approves or rejects the pending submission (see [Admin moderation](#admin-moderation)). On rejection, the creator can edit and resubmit the *same* cafe — it doesn't create a duplicate — which resets it to pending and reruns the whole verification flow.

Google Places was deliberately not used here: it requires a billing-enabled account and its terms restrict long-term caching of results, which directly conflicts with this app's "geocode once, store forever" approach. OSM data's ODbL license has no such restriction (in exchange, the app credits "© OpenStreetMap contributors" in the footer).

Any logged-in user can edit any existing cafe — this is deliberately open, collaborative editing, not restricted to the original creator. There's no direct "delete" button for a live cafe; removal only happens through the flag → admin-review → admin-deletes path below, so a single user can't unilaterally take down a real business's listing.

### The rating system

There are two distinct ways to rate a cafe:

- **Quick Review** — a single 1–5 star, not tied to any category, feeding the cafe's overall average. Always weighted at ×1 for every user regardless of experience, and giving one never earns any tier or badge.
- **Category rating** — pick a category, give a 1–5 quick score (this one *is* weighted — see below), then optionally work through that category's question bank, and optionally leave a comment. Every question is independently optional; skipping one writes no data at all, rather than a null placeholder.

Each category's questions use one of four answer types:

| Type | Example | How it's displayed |
|---|---|---|
| **Yes/No** | "Can you bring laptops here?" | A progress bar with a status label: 0–40% yes → "No", 40–65% → "Maybe", 65–100% → "Yes" |
| **Select** (multi-toggle) | "Do they offer alternative m\*lks?" | One button + one progress bar per option; options can combine freely, except choosing "None" clears and disables the rest |
| **Scale** (None/Minimal/Lots/Loads) | "Are there power outlets near the seating areas?" | A percentage split across the four buckets, no blended score |
| **Time range** | "Are there specific times you're allowed to use a laptop?" | The median start and end time across all respondents |

A user can update or override any of their existing ratings on a cafe at any time — the UI detects "you've already rated this" and offers to override — but can never submit a second, separate rating for the same cafe (enforced by a unique `(user, cafe)` index on the ratings collection).

The full current question bank across all five categories is defined in [`api/config/categories.js`](./api/config/categories.js) — see the [Category extensibility](#category-extensibility) note below for why that single file is the only place this ever needs editing.

### Tiers, weighting & badges

A user earns a **tier per category** based purely on how many times they've rated in that category — there's no such thing as an overall tier, and someone who has only ever left Quick Reviews has no tier or badge anywhere.

| Tier | Name | Ratings in category | Weight multiplier |
|---|---|---|---|
| 1 | Coffee Curious | 1–5 | ×1 |
| 2 | Café Regular | 6–20 | ×1.2 |
| 3 | Bean Scout | 21–50 | ×1.4 |
| 4 | Coffee Connoisseur | 51–100 | ×1.7 |
| 5 | Café Oracle | 101+ | ×2 |

This weight applies **only** to a rater's 1–5 category quick-score when a cafe's category average is computed — never to Quick Review, and never to the granular question answers or comments, which always stay simple unweighted tallies. Critically, the weight is **frozen onto that specific rating at the moment it's submitted or edited** — it doesn't silently increase later if the rater levels up without touching that rating again. This keeps every individual rating record self-contained and honestly rebuildable from source data, at the cost of a small amount of "live" accuracy.

Two more badge types exist, both display-only with no effect on weighting:

- **Comment ranking** — each category's free-text comments are shown as a "top 10" list, ranked by how many ratings that specific user has made *in that specific category* (a raw count, frozen at the moment the comment was posted).
- **City "Local" badge** — a single binary threshold, not a ladder: more than 20 ratings by a user in a given city earns a dynamically-named badge (e.g. "Barcelona Local"), shown on their profile and next to their comments on cafes in that city.

### Search, filtering & the map

The homepage is a map on one side and a filterable cafe list on the other. A row of category buttons and a free-text name search (scoped only to what's currently visible on the map — it never pans to results outside the viewport) sit above the list.

- **No category selected** → every cafe shows its overall Quick Review average; the list sorts by it, highest first.
- **One category selected** → cafes show and sort by that category's weighted average; cafes with no data in that category simply don't appear.
- **Multiple categories selected** → each cafe's score is the mean of its averages across whichever selected categories it actually has data for (a cafe missing one of the selected categories still shows, scored on what it has).

Behind the scenes, the map sends its current bounding box to the backend on pan/zoom (debounced ~300–400ms), and a single aggregation pipeline handles matching cafes inside that box, computing the active display score, sorting, and paginating (10 cafes per page) in one pass — with a hard cap of 1000 cafes per query and a minimum zoom level below which individual markers don't load. An "Open now" filter is also available, computed from each cafe's stored structured opening hours against the current day/time — no live OSM re-querying involved.

### Admin moderation

The Admin area is a two-panel review console, reachable only to users whose email is currently in `ADMIN_EMAILS` (the header only shows the "Admin" link to them):

- **Right panel** — a list of open items, toggleable between **Pending Cafes** and **Flagged Cafes**.
- **Left panel** — full detail of whichever item is selected, with the relevant actions.

**Pending Cafes** can be approved (→ verified, creator notified by email + toast) or rejected with a reason chosen from a fixed list (couldn't verify it's a real business, duplicate, incomplete/inaccurate address, inappropriate content, spam, or a free-text "Other") — the reason is included in the rejection email, and the creator can edit-and-resubmit the same cafe afterward.

**Flagged Cafes** can be resolved or dismissed. Flagged cafes stay **publicly visible while under review** — a deliberate anti-abuse choice, since auto-hiding an already-live cafe on a single unverified flag would make it trivial to take down a real business. Any user can flag a cafe for one of ten reasons (doesn't exist, permanently closed, duplicate, wrong address, inappropriate content, spam, wrong business type, owner requesting removal, incorrect info, or other) — "permanently closed" also gets a dedicated one-click shortcut on the cafe detail page, since it's expected to be the most common report. Cafes are only ever **hard-deleted** once an admin confirms closure — there's no soft-closed/archived state.

### Authentication & account security

- Registration collects a username, email, and password (8+ characters, at least one letter, one number, one special character — bcrypt-hashed).
- **Unverified accounts cannot log in at all.** Verification uses a signed, single-use, ~24h-expiring token; only its hash is stored, so a database leak can't hand out a usable token. A rate-limited resend option exists.
- Password reset reuses the same token mechanism for logged-out users; a logged-in user can also change their password directly from My Area with their current password.
- The session JWT lives in an **httpOnly cookie**, never in `localStorage` — a deliberate hardening step so an XSS bug elsewhere can't read the token via JavaScript. Regular sessions last 6 months; admin sessions use a shorter expiry as defense-in-depth (though the live `ADMIN_EMAILS` re-check, not token lifetime, is what actually matters).
- CORS is locked to the exact deployed frontend origin with `credentials: true`.
- Login is rate-limited (~10 attempts/15 min per IP); registration and resend-verification are rate-limited (~5/hour per IP).
- Account deletion is a **soft delete**: the account is deactivated and its `email`/`password` are scrubbed, but the `username` and everything the user authored (cafes, ratings, comments) stay attributed to them — "the information they've put up should stay."
- **Data exposure rule, applied everywhere**: no endpoint ever returns a password hash; no endpoint ever returns a user's email except that user's own `/me` request. Every other surface — populated cafe creators, comment authorship, public profiles — exposes `username` only.

### Email notifications

All email is sent via Nodemailer + Gmail SMTP through one shared `sendEmail()` utility (config in [`api/config/email.js`](./api/config/email.js)), and is always **best-effort and non-blocking** — a failed send never rolls back the underlying database action, since the database is always the source of truth. Cases covered: signup verification, resend-verification, password reset, admin reminder when a cafe needs review, cafe-approved (email + toast), and cafe-rejected (email only, including the reason).

### Favorites / "Top 10"

Every user has a single favorites list, capped at 10 cafes, reachable two ways: a "Favourite" toggle on any cafe's detail page, or from the user's own profile via an "Add to Top 10" picker (listing cafes they've personally rated, sorted by the score they gave). It's displayed publicly on their profile as a "`username` loves…" section.

## Data model

The database holds three source-of-truth collections plus one report collection; everything else (`Cafe.ratingSummary`, `User.contributorStats`) is a **derived, rebuildable cache** computed from them — never hand-patched independently.

- **`User`** — username (unique, public), email (private, owner-only), bcrypt password hash, email-verification state, active/soft-delete flag, up to 10 favorites, and `contributorStats` (per-category rating counts feeding tiers, per-city counts feeding the Local badge).
- **`Cafe`** — name, creator, structured address, location stored both as plain lat/lng (for the map) and a GeoJSON `Point` with a `2dsphere` index (for bounding-box queries), opening hours, phone/website, `addressVerification` status, and `ratingSummary`.
- **`CafeRating`** — one document per `(user, cafe)` pair: an unweighted overall score, plus an array of per-category entries (score, frozen weight, question answers, comment). Editing a rating updates the existing document in place; it never creates a second one.
- **`Flag`** — a report against a cafe: reason, optional free text, and open/resolved/dismissed status.

**Category extensibility**: category and rating data is modeled as **arrays keyed by `categoryId`** throughout — `Cafe.ratingSummary`, each `CafeRating`'s category entries, and `User.contributorStats.categories` — never as fixed named schema fields like `ratingSummary.computer`. The entire category/question-bank registry lives in one file, [`api/config/categories.js`](./api/config/categories.js), which the backend exposes via `GET /api/categories` and the frontend renders dynamically. Adding a sixth category, or a new question to an existing one, requires editing exactly that one file — no schema migration, no controller changes, and no frontend changes. The same "config, not code" principle applies to the tier/weight table ([`api/config/tiers.js`](./api/config/tiers.js)) and the email sender config ([`api/config/email.js`](./api/config/email.js)).

## Project structure

```
api/
  index.js         # the ONLY file directly under /api — exports the Express app
  config/          # categories.js, tiers.js, email.js, reasons.js, frontendUrl.js
  controllers/     # request handlers
  models/          # Mongoose schemas
  routes/          # all Express routes, wired to controllers
  services/        # Nominatim, Overpass, opening-hours parsing, email, tokens, tiers, recompute
  middleware/       # auth (requireAuth/requireAdmin), rate limiting
src/
  components/
    cafes/          # add/view cafe UI
    admin/           # admin review console
    profile/         # public profile
    myarea/          # private account area
    login/
    general/         # Header etc.
    map/
  pages/             # one route-level component per page (Homepage, LoginPage, NewCafe, RateCafePage, AdminPage, ...)
```

Everything on the backend routes through the single `api/index.js` Express app (see [Deployment](#deployment) for why), and no component hardcodes a color, spacing, or font value — every design token lives in `src/index.css`'s `:root`.

## Running locally

Start the backend:

```bash
npm run dev:api
```

Start the frontend in a second terminal:

```bash
npm run dev
```

During development, Vite proxies `/api/*` requests to `http://localhost:4444`. Other useful commands:

```bash
npm run build     # production frontend build
npm run lint       # oxlint
npm run preview    # preview the production build locally
```

There's no test command — this project uses manual QA only.

## Environment variables

Copy `api/.env.example` to `api/.env` and fill in real values for local development (production values are set through the Vercel project dashboard instead, never committed):

| Variable | Purpose |
|---|---|
| `MONGO` | MongoDB Atlas connection string |
| `JWT_SECRET` | Required, no fallback — the app refuses to start if this is unset |
| `PORT` | Local backend port (defaults to 4444) |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses, checked live on every admin request |
| `EMAIL_FROM_ADDRESS` / `EMAIL_APP_PASSWORD` / `EMAIL_FROM_NAME` | Gmail SMTP sender config for Nodemailer (`EMAIL_APP_PASSWORD` is a generated Gmail App Password, not the account's normal password) |
| `FRONTEND_URL` | Optional override; auto-detected from Vercel's own env vars in production or `http://localhost:5173` locally |
| `NODE_ENV` | Set automatically by Vercel in production; leave unset locally so cookies work over plain `http` |

## Deployment

Frontend and backend both deploy from this one repository as a single Vercel project. The most important constraint shaping the backend's structure is Vercel's Hobby-plan cap of roughly 12 serverless functions — since every file directly under `/api/` becomes its own function, **the entire backend is one Express app exported from the single `api/index.js` entry point**, with every route added via `api/routes/routes.js` regardless of how many features it grows to cover. A `vercel.json` rewrite (`/api/:path*` → `/api/index`) routes all API traffic to that one function, since Vercel's default file-based routing would otherwise only map the literal `/api` or `/api/index` path. The MongoDB connection is cached and reused across invocations rather than reopened per-request, since serverless functions can cold-start and run concurrently.

## Known scope decisions & what's deliberately left out

This is an early-stage portfolio project, so some things are explicitly deferred rather than forgotten:

- No user-uploaded cafe photos (moderation risk not worth solving yet).
- No admin-invites-admin flow — admins are managed purely via the `ADMIN_EMAILS` allowlist.
- No public leaderboards, no map marker clustering, no non-English localization.
- No legal pages (Privacy Policy / Terms of Service) and no GDPR export tooling yet.
- Only single-window opening hours per day (no split shifts).
- A cafe's rating history / a user's contributor stats are **not** recomputed if the cafe's address or city is corrected after the fact — considered too complex relative to the value at this stage.

See `PRD.md` §1 and §16 for the full list and the open assumptions still worth double-checking before further build-out.
