import { useState } from 'react'
import { setAuthState } from './authCache'

export default function Login({ onLoginSuccess, onLogout }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setMessage('')

    const email = form.email.trim().toLowerCase()

    if (!email || !form.password) {
      setError('Email and password are required.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: form.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      console.log('LOGIN RESPONSE:', data)

      // Save the JWT and user information to localStorage.
      setAuthState(true, data.token, data.user)

      console.log(
        'LOCAL STORAGE AFTER LOGIN:',
        window.localStorage.getItem('auth_session'),
      )

      // Clear the form after successful login.
      setForm({
        email: '',
        password: '',
      })

      setMessage('Login successful.')

      // Tell the parent component that login succeeded.
      onLoginSuccess?.(data.user)
    } catch (requestError) {
      setError(requestError.message || 'Login failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    // Clear authentication state.
    setAuthState(false, null, null)

    setMessage('')
    setError('')

    // Tell the parent component that logout succeeded.
    onLogout?.()
  }

  return (
    <section className="auth-card">
      <h2>Log in</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {message ? (
        <p className="success-message">{message}</p>
      ) : null}

      {error ? (
        <p className="error-message">{error}</p>
      ) : null}

      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </section>
  )
}
