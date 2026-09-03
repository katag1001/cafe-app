# CLAUDE.md — Architecture & Build Constraints

This document defines **how this codebase must be built** — hosting constraints, folder structure, coding patterns, and hard rules. It does not restate product/feature behavior in depth; for that, see `PRD.md`, which this document points to throughout. Read both before building anything non-trivial: `PRD.md` says *what* to build and why, this document says *how* it must be structured to actually work within the platform constraints this project is built on.

---

## 1. Project summary

A crowd-sourced cafe discovery app (full product spec in `PRD.md`). Currently an early-stage portfolio project, built with production-grade discipline because a real public launch is the intended eventual outcome. Global scope, mobile-first responsive web, English only, free-tier infrastructure throughout, manual QA (no automated test suite required).

---

## 2. Tech stack

- **Frontend**: React 19 + Vite, `react-router-dom` for routing, MapLibre GL + Protomaps for the map, plain CSS with custom properties (no CSS framework).
- **Backend**: Node.js + Express, Mongoose/MongoDB.
- **Database**: MongoDB Atlas, free tier (M0).
- **Auth**: JWT, stored in an `httpOnly` cookie (not `localStorage` — see §5.3), bcrypt password hashing.
- **External services** (all free-tier/keyless, no billing account required): Nominatim (geocoding), Overpass API (business-presence check + OSM enrichment), `opening_hours.js` (parses OSM opening-hours syntax), Protomaps (basemap tiles), Nodemailer + Gmail SMTP (email).
- **Hosting**: **everything on Vercel** — frontend and backend both, as a single deployment from this one repository. This is the most important constraint in this document; see §3.
- **Linting**: `oxlint` (`npm run lint`).

---

## 3. Deployment architecture — read this before touching `api/`

Everything deploys through Vercel as one project. This has a hard consequence that shapes the entire backend structure:

### 3.1 The serverless function limit

Vercel's Hobby (free) plan caps the project at roughly **12 serverless functions**. Vercel's zero-config Node detection treats **every `.js` file anywhere under `/api/`, including nested subfolders** (e.g. `api/controllers/foo.js`), as its own separate serverless-function entrypoint — confirmed empirically via `vercel build`, which produced 19 functions from this repo's `api/config/`, `api/controllers/`, `api/middleware/`, `api/models/`, `api/routes/`, `api/services/` files before this was fixed. (An earlier version of this document claimed nested files were exempt — that was wrong and caused a real deploy failure; do not reintroduce that assumption.)

The fix, and the rule going forward: **every folder under `/api/` other than the entry point must be prefixed with an underscore** (`api/_config/`, `api/_controllers/`, `api/_middleware/`, `api/_models/`, `api/_routes/`, `api/_services/`). Vercel's Node builder excludes any file or folder starting with `_` from function auto-detection, so these are treated as plain shared modules that `api/index.js` imports, not as separate functions. **Never add a new file or folder directly under `/api/` without a leading underscore**, and never add a second non-underscored file next to `index.js` (e.g. `api/admin.js`, `api/ratings.js`) — everything routes through the one `api/index.js` Express app, via `api/_routes/routes.js` and `api/_controllers/`.

This means the whole backend compiles down to exactly **one** Vercel function, regardless of how many Express routes it internally handles — there is effectively no limit on route count, only on non-underscored top-level entries in `/api/`. After any change to `/api/`'s folder structure, verify with `npx vercel build` and confirm `.vercel/output/functions/` contains exactly one `.func` directory (`api/index.func`) before deploying.

### 3.2 Making the Express app actually work as a Vercel function

Two changes are required to what's in the repo today (this is a build task, not yet done):

1. **`api/index.js` must export the Express `app`**, not call `.listen()` unconditionally. Vercel's Node runtime invokes the exported handler directly per-request; it does not run a persistent listening process. For local development to keep working via `npm run dev:api`, guard the `.listen()` call so it only runs when the file is executed directly (e.g. `if (require.main === module) app.listen(...)`), while always exporting `app` for Vercel to pick up.
2. **A `vercel.json` rewrite is required** to route all `/api/*` traffic to that one function, since Vercel's default zero-config file-based routing would otherwise only map `api/index.js` to the literal path `/api/index` or `/api`, not to `/api/cafes`, `/api/login`, etc. Something equivalent to:
   ```json
   { "rewrites": [{ "source": "/api/:path*", "destination": "/api/index" }] }
   ```

### 3.3 Database connections in a serverless environment

Serverless functions can cold-start and run concurrently; naively calling `mongoose.connect()` on every invocation risks exhausting the connection pool or creating redundant connections. The connection must be **cached and reused across invocations** within a warm function instance — check whether a connection already exists (or is in progress) before opening a new one, rather than unconditionally reconnecting on every request. This is a required pattern for `api/index.js`'s DB setup, not an optional optimization.

### 3.4 Execution time

Hobby-plan serverless functions have a request execution time ceiling (short — on the order of seconds). Calls out to Nominatim/Overpass/Gmail should be reasonably fast and timeout-guarded; avoid chaining multiple slow external calls synchronously within a single request if it can be avoided.

### 3.5 Environment variables

Production environment variables (`MONGO`, `JWT_SECRET`, `ADMIN_EMAILS`, `EMAIL_FROM_ADDRESS`, `EMAIL_APP_PASSWORD`, `VITE_PROTOMAPS_KEY`, `FRONTEND_URL`, etc.) are set through the Vercel project dashboard for deployed environments. Local development uses a single root-level `.env` (backend secrets) and `.env.local` (frontend/Vite-prefixed values), neither committed — there is no separate `api/.env`. Because `dev:api` runs `api/index.js` with its cwd changed to `api/` (via `npm --prefix api start`), `api/index.js` loads dotenv with an explicit path (`path.resolve(__dirname, '../.env')`) rather than the cwd-relative default, so it always finds the root `.env` regardless of how it's launched.

---

## 4. Backend architecture (`api/`)

### 4.1 Folder structure and what belongs where

```
api/
  index.js         # the ONLY non-underscored file directly under /api — exports the Express app (see §3)
  _config/         # static, hand-edited config data (see §4.2)
  _controllers/    # request handlers, one file per resource area
  _models/         # Mongoose schemas
  _routes/         # Express route definitions, wired to controllers
  _services/       # integrations with external systems (Nominatim, Overpass, email, opening-hours parsing)
  _middleware/      # auth (requireAuth/requireAdmin), rate limiting
```

Every folder here is underscore-prefixed so Vercel's per-file function auto-detection skips it (§3.1) — this is required, not stylistic. New feature areas follow the same "underscored subfolder, never a top-level file" rule.

### 4.2 Config-as-data principle

This project has a standing rule, applied repeatedly throughout `PRD.md`: **anything that could plausibly need tuning later lives in its own dedicated file, never hardcoded inline in logic.** Concretely, `api/_config/` should hold:

- **`categories.js`** — the category registry: every category's id, label, and full question bank (see `PRD.md` §9 for the actual question content, §11 for why this must be data-driven). This is the single source of truth categories and questions are defined from.
- **`tiers.js`** — the five-tier name/threshold/weight-multiplier table (`PRD.md` §8.2).
- **`email.js`** — sender address/name config, read by one shared `sendEmail()` service function, never hardcoded per call site.

**Important architectural consequence of the category registry**: the frontend must **not** keep its own hardcoded or duplicated copy of the category/question list. Since the frontend and backend are separate bundles with no shared-package tooling in this repo, a duplicated copy would silently drift out of sync and would also mean "add a category" still requires a frontend code change — defeating the entire point of `PRD.md` §11. Instead, the backend should expose the registry (e.g. via a `GET /api/categories` endpoint, or embedded in relevant existing responses), and the frontend fetches and renders from it dynamically. Adding a category should require editing exactly one backend file and nothing else, frontend included.

### 4.3 Source data vs. derived data

Per `PRD.md` §4: `Cafe`, `CafeRating`, and `User` are the source of truth. `Cafe.ratingSummary` and `User.contributorStats` are always *derived* from `CafeRating` (plus, for `contributorStats`, the tier config) and must be treated as rebuildable caches, never as independent state that could drift without a way to recompute it from source. Any code that mutates a rating must update these derived fields through a single, reusable recompute path — not scattered ad-hoc increment/decrement logic in multiple controllers.

### 4.4 The array-keyed schema pattern

Per `PRD.md` §4.2–§4.3 and §11: `Cafe.ratingSummary`, `CafeRating`'s per-category entries, and `User.contributorStats.categories` are all **arrays keyed by `categoryId`**, not fixed named schema fields (there is no `ratingSummary.computer`, `ratingSummary.accessible`, etc. as literal schema keys — there's a `ratingSummary` array containing `{ categoryId: "computer", ... }` among its entries). Any backend code that reads or writes category-specific rating data — controllers, aggregation pipelines, recompute logic — must look categories up by `categoryId` within these arrays, driven by the registry in `_config/categories.js`, rather than referencing a category by name as a literal object property anywhere. This is what makes adding a category a config-only change; breaking this pattern anywhere reintroduces the hardcoding problem it exists to avoid.

### 4.5 Auth & security architecture

(Full rules in `PRD.md` §5.) Architecturally relevant points for how code must be structured:

- JWT lives in an `httpOnly` cookie set by the backend, never returned in a JSON body for the frontend to store itself. `_middleware/auth.js` reads the cookie, not an `Authorization: Bearer` header.
- **Admin authorization is checked live, on every admin-gated request**, against the `ADMIN_EMAILS` env var — never cached on a JWT claim or a stored DB role field. `middleware/` should have a `requireAdmin` that runs after `requireAuth` and does this live check.
- CORS must be locked to the deployed frontend's exact origin with `credentials: true` — this is required, not optional, for the cookie to be sent cross-origin at all.
- Rate limiting (login, registration, resend-verification) belongs in `_middleware/`, applied at the route level in `_routes/routes.js`.
- `JWT_SECRET` must be read with no fallback value — the app should fail to start if it's unset, rather than signing tokens with a known default.
- No endpoint may return a user's password hash. No endpoint may return a user's email except that user's own `/me`-style request. Every other user-referencing response field (populated `createdBy`, comment authorship, public profile data) surfaces `username` only.

### 4.6 External service integration pattern

Each third-party/OSM integration gets its own file in `_services/` (the existing `_services/nominatim.js` is the template to follow):
- `_services/nominatim.js` — address geocoding (exists).
- `_services/overpass.js` — business-presence check + `opening_hours`/`phone`/`website` enrichment (`PRD.md` §7.1) — needed, doesn't exist yet.
- `_services/openingHours.js` — wraps the `opening_hours.js` parser to convert OSM's text syntax into this app's structured per-day format.
- `_services/email.js` — the shared `sendEmail()` utility used by every notification described in `PRD.md` §6.4, reading its sender config from `_config/email.js`.

All of these must respect the "geocode/verify once, cache forever" principle (`PRD.md` §7) — they are called at cafe creation/edit time only, never on read/view, and must send a descriptive `User-Agent` and respect the relevant service's rate limits.

---

## 5. Frontend architecture (`src/`)

### 5.1 Folder structure

```
src/
  components/
    cafes/          # existing: add_cafes, view_cafes
    admin/          # NEW — admin review console
    profile/        # NEW — public profile page
    myarea/         # NEW — private account area
    login/          # existing
    general/        # existing (Header, etc.)
    map/            # existing
  pages/            # route-level components, one per page in PRD.md §3
```

New feature areas get their own subfolder under `components/`, following the existing convention rather than flattening everything into one directory.

### 5.2 State management — deliberately lightweight, no Context

**Decision: no React Context, no Redux/Zustand/etc.** Shared state (auth/current-user, favorites, active map filters) is handled with plain component state and props, extending the app's current pattern rather than introducing a new abstraction layer. Concretely:

- A top-level component (`App.jsx`) is responsible for knowing the current auth state and passes it down as props to whatever needs it (Header for nav links and the conditional Admin link, pages that need to know if a user is logged in).
- Feature-local state (form inputs, a single page's filter selections, etc.) stays local to that component, as it already is.

### 5.3 Auth state — a required consequence of the cookie decision

Because the JWT now lives in an `httpOnly` cookie (§4.5), **JavaScript can no longer read the token directly** — the current `authCache.js` pattern of reading a token out of `localStorage` synchronously no longer works and must be replaced. The new pattern: on load, the app calls an authenticated `/me`-style endpoint; the browser automatically attaches the httpOnly cookie, and the response tells the frontend who's logged in (id, username, whether they're an admin) or that nobody is. That result is held in local state at the top level (`App.jsx`) and threaded down via props per §5.2 — there is no synchronous "check if logged in" read anywhere in the frontend anymore, only this one async fetch. Every place that currently calls into `authCache.js`'s token-reading functions needs to be updated to rely on this fetched state instead.

Logging in/out becomes: call the login/register/logout endpoint (which sets/clears the cookie server-side), then re-fetch or update the same top-level current-user state — never write a token to `localStorage` again.

### 5.4 Styling — one root theme file, nothing hardcoded

No component may hardcode a color, spacing value, or font value. All design tokens live as CSS custom properties on `:root` in `src/index.css` (already the natural home for this), and every component's CSS references those variables. This is a standing rule for the whole project, not just initial setup — it's what makes the planned full visual redesign (explicitly deferred until the app is functionally complete) a matter of editing one file rather than hunting through every component.

### 5.5 Routing

`react-router-dom`, as already set up in `App.jsx`. Each page in `PRD.md` §3's page list gets its own route and its own file under `src/pages/`, following the existing convention (`Homepage.jsx`, `LoginPage.jsx`, etc.).

---

## 6. Data model — pointer

The full conceptual data model (User, Cafe, CafeRating, Flag/Report, and the config files) is specified in `PRD.md` §4. The one thing to internalize architecturally, beyond what's in that section, is §4.4 of this document: category-related data is always array-keyed, never a fixed named field.

---

## 7. Hard constraints checklist

A quick-reference list of the non-negotiable rules from this document, for a fast sanity check before committing anything:

- [ ] No new file added directly under `/api/` — everything routes through `api/index.js` (§3.1).
- [ ] `api/index.js` exports the Express app; `.listen()` only runs outside the Vercel environment (§3.2).
- [ ] `vercel.json` rewrites all `/api/*` traffic to the single function (§3.2).
- [ ] MongoDB connection is cached/reused across invocations, never reconnected per-request (§3.3).
- [ ] Categories and their questions are only ever defined in `api/_config/categories.js`; the frontend fetches them, never hardcodes them (§4.2).
- [ ] `ratingSummary` / `CafeRating` category data / `contributorStats.categories` are array-keyed by `categoryId`, never named schema fields (§4.4).
- [ ] `ratingSummary` and `contributorStats` are always treated as recomputable from `CafeRating`, never hand-patched independently (§4.3).
- [ ] Admin status is re-checked live against `ADMIN_EMAILS` on every admin request, never trusted from a cached token/role (§4.5).
- [ ] No endpoint ever returns a password hash, or another user's email (§4.5).
- [ ] Auth token lives in an `httpOnly` cookie; nothing in the frontend reads or stores a raw JWT (§5.3).
- [ ] No React Context/state library introduced; shared state flows via props from `App.jsx` (§5.2).
- [ ] No hardcoded colors/spacing/fonts in any component — everything through `src/index.css`'s root custom properties (§5.4).

---

## 8. Commands

- `npm run dev` — frontend dev server (Vite).
- `npm run dev:api` — backend dev server (`node api/index.js` via the api workspace's `start` script).
- `npm run build` — production frontend build.
- `npm run lint` — `oxlint`.
- `npm run preview` — preview the production build locally.

No test command exists or is required — QA is manual for this project (`PRD.md` §1).

---

## 9. Where feature specs live

This document intentionally does not re-explain product behavior. When implementing a feature, consult `PRD.md`:

- §5 — auth & account security details
- §6 — admin system & moderation, email/notification content
- §7 — cafe submission & verification flow
- §8 — rating system, tier/weighting math, comments
- §9 — full question banks per category
- §10 — search, filtering, map/viewport behavior
- §12 — favorites/"Top 10"
- §13 — page-by-page content specs
- §15 — known gaps in the current codebase to address during the build
- §16 — open assumptions still worth double-checking
