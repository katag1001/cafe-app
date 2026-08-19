# Frontend + API

The React frontend is wired to the Express backend in `api/`.

## Run locally

Start the backend:

```bash
npm run dev:api
```

Start the frontend in a second terminal:

```bash
npm run dev
```

During development, Vite proxies requests from `/api/*` to `http://localhost:4444`.

## Backend endpoints used by the UI

- `GET /api/test/getTest`
- `POST /api/test/postTest`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires Bearer token)

## Auth behavior

- Passwords must contain at least 8 characters, along with a letter, a number, and a special character.
- Duplicate emails are rejected before a user is created.
- The server issues a JWT on successful register/login and validates it for protected routes.
- The frontend keeps only a boolean logged-in flag in local storage and stores the token in memory so no sensitive user data is exposed.

## Optional frontend API override

If you deploy the frontend separately, set `VITE_API_BASE_URL` to your backend origin or base path.
