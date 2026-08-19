const LOGGED_IN_KEY = 'auth_user_logged_in'

let inMemoryToken = null

export function readAuthState() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const storedValue = window.localStorage.getItem(LOGGED_IN_KEY)
    if (!storedValue) {
      return false
    }

    return JSON.parse(storedValue)?.loggedIn === true
  } catch {
    return false
  }
}

export function setAuthState(loggedIn) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LOGGED_IN_KEY, JSON.stringify({ loggedIn: Boolean(loggedIn) }))
}

export function clearAuthState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(LOGGED_IN_KEY)
}

export function setSessionToken(token) {
  inMemoryToken = token || null
}

export function getSessionToken() {
  return inMemoryToken
}

export function clearSessionToken() {
  inMemoryToken = null
}
