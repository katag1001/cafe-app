import { useState } from 'react'

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
const usernameRule = /^[a-z0-9_]{3,20}$/

export default function Register({ onRegisterSuccess }) {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const email = form.email.trim().toLowerCase()
    const username = form.username.trim().toLowerCase()

    if (!email || !username || !form.password || !form.confirmPassword) {
      setError('Email, username, and password are required.')
      return
    }

    if (!usernameRule.test(username)) {
      setError('Username must be 3-20 characters: lowercase letters, numbers, or underscores only.')
      return
    }

    if (!passwordRule.test(form.password)) {
      setError('Password must be at least 8 characters long and include a letter, a number, and a special character.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password: form.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create the account.')
      }

      setForm({ email: '', username: '', password: '', confirmPassword: '' })
      onRegisterSuccess?.()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <h2>Create account</h2>
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
          />
        </label>

        <label>
          Username
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="yourusername"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Secure password"
            required
          />
        </label>

        <label>
          Confirm password
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter password"
            required
          />
        </label>

        <small className="password-hint">
          Username: 3-20 characters, lowercase letters/numbers/underscores only.
          Password: at least 8 characters, a number, a letter, and a special character.
        </small>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create user'}
        </button>
      </form>

      {error ? <p className="error-message">{error}</p> : null}
    </section>
  )
}
