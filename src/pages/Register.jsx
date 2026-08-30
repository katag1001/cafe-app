import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RegisterForm from '../components/login/Register'

function Register() {
  const navigate = useNavigate()
  const [registered, setRegistered] = useState(false)

  const handleRegisterSuccess = () => {
    setRegistered(true)
  }

  return (
    <main className="auth-app-shell">
      <header className="auth-header">
        <p className="eyebrow">Authentication</p>
        <h1>Create an account</h1>
      </header>

      {registered ? (
        <section className="status-banner" role="status">
          Account created! Check your email for a verification link before logging in.
        </section>
      ) : (
        <section className="auth-layout">
          <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
        </section>
      )}

      <p>
        Already have an account?{' '}
        <button type="button" onClick={() => navigate('/login')}>
          Log in
        </button>
      </p>
    </main>
  )
}

export default Register
