// Resolves the frontend's own public origin, used for links embedded in
// emails (and for locking down CORS) — resolved automatically so nothing
// needs to be manually reconfigured between local dev and Vercel.
//
// Priority:
// 1. An explicit FRONTEND_URL always wins (e.g. a custom domain later).
// 2. Vercel's assigned production domain — stable across deployments, which
//    matters because a link emailed today must still work after a later
//    deploy reassigns VERCEL_URL to a new preview hash.
// 3. The current Vercel deployment's own URL (covers preview deployments).
// 4. The local Vite dev server, as a pure-local fallback.
function resolveFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:5173";
}

module.exports = { FRONTEND_URL: resolveFrontendUrl() };
