import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/login/Login'

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleLoginSuccess = () => {
    navigate('/')
  }

  return (
    <main className="auth-app-shell">
      <header className="auth-header">
        <p className="eyebrow">Authentication</p>
        <h1>Log in</h1>
      </header>

      {error ? (
        <section className="status-banner" role="alert">
          {error}
        </section>
      ) : null}

      <section className="auth-layout">
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onError={setError}
        />
      </section>

      <p>
        Don't have an account?{' '}
        <button type="button" onClick={() => navigate('/register')}>
          Register
        </button>
      </p>
    </main>
  )
}

export default LoginPage
