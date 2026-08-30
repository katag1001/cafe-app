// The session token now lives in an httpOnly cookie, which JavaScript cannot
// read at all. Auth state is therefore never read synchronously from
// anywhere client-side — it's always asked of the backend, which reads the
// cookie itself and reports back who (if anyone) is logged in.

export async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/me', { credentials: 'include' })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user || null
  } catch {
    return null
  }
}

export async function logoutCurrentUser() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // Best-effort — the cookie will simply expire on its own otherwise.
  }
}
