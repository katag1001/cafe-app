const AUTH_STORAGE_KEY = 'auth_session'

export function readAuthState() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return false
    }

    const session = JSON.parse(storedValue)

    return Boolean(session?.token && session?.user)
  } catch {
    return false
  }
}

export function setAuthState(loggedIn, token = null, user = null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!loggedIn || !token) {
    clearAuthState()
    return
  }

  const session = {
    loggedIn: true,
    token,
    user,
    savedAt: Date.now(),
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(session),
  )
}

export function getSessionToken() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const session = JSON.parse(storedValue)

    return session?.token || null
  } catch {
    return null
  }
}

export function getSessionUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const session = JSON.parse(storedValue)

    return session?.user || null
  } catch {
    return null
  }
}

export function setSessionToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)
    const session = storedValue ? JSON.parse(storedValue) : {}

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...session,
        token: token || null,
        loggedIn: Boolean(token),
      }),
    )
  } catch {
    // Ignore storage errors.
  }
}

export function clearSessionToken() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedValue) {
      return
    }

    const session = JSON.parse(storedValue)

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...session,
        token: null,
        loggedIn: false,
      }),
    )
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

export function clearAuthState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
