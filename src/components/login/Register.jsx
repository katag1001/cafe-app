import { useState } from 'react'
import { setSessionToken } from './authCache'

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

export default function Register({ onRegisterSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
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

    if (!passwordRule.test(form.password)) {
      setError('Password must be at least 8 characters long and include a letter, a number, and a special character.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: form.password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create the account.')
      }

      setSessionToken(data.token)
      setForm({ email: '', password: '' })
      setMessage('Account created successfully.')
      onRegisterSuccess?.(data.user)
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

        <small className="password-hint">
          Use at least 8 characters, a number, a letter, and a special character.
        </small>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create user'}
        </button>
      </form>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  )
}
