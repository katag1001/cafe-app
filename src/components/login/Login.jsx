import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Login({ onLoginSuccess, onError }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    onError?.('')
    setMessage('')
    setNeedsVerification(false)

    const email = form.email.trim().toLowerCase()

    if (!email || !form.password) {
      onError?.('Email and password are required.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
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
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true)
        }

        throw new Error(data.message || 'Login failed.')
      }

      setForm({
        email: '',
        password: '',
      })

      setMessage('Login successful.')
      onLoginSuccess?.(data.user)
    } catch (requestError) {
      onError?.(requestError.message || 'Login failed.')
    } finally {
      setIsLoading(false)
    }
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

      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>

      {message ? (
        <p className="success-message">{message}</p>
      ) : null}

      {needsVerification ? (
        <p className="error-message">
          Your email isn't verified yet. Check your inbox, or{' '}
          <Link to="/resend-verification">resend the verification email</Link>.
        </p>
      ) : null}
    </section>
  )
}
