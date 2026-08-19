import { useNavigate } from 'react-router-dom'
import RegisterForm from '../components/login/Register'
import { setAuthState } from '../components/login/authCache'

function Register() {
  const navigate = useNavigate()

  const handleRegisterSuccess = () => {
    setAuthState(true)
    navigate('/')
  }

  return (
    <main className="auth-app-shell">
      <header className="auth-header">
        <p className="eyebrow">Authentication</p>
        <h1>Create an account</h1>
      </header>

      <section className="auth-layout">
        <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
      </section>

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
