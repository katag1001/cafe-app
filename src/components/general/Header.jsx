import { Link } from 'react-router-dom'
import './Header.css'

function Header({ currentUser, onLogout }) {
  return (
    <header className="header">
      <nav className="navbar">
        <Link to="/" className="logo">
          CafeFinder
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/newcafe">New Cafe</Link>

          {currentUser?.isAdmin ? <Link to="/admin">Admin</Link> : null}

          {currentUser ? (
            <>
              <Link to="/my-area">My Area</Link>
              <Link to={`/users/${currentUser.username}`}>{currentUser.username}</Link>
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Header
