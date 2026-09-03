import { Link } from 'react-router-dom'
import './Header.css'

function Header({ currentUser }) {
  return (
    <header className="header">
      <nav className="navbar container">
        <Link to="/" className="logo">
          <span className="logo-mark">☕</span>
          CafeFinder
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/browse-user-faves">Browse user faves</Link>
          {currentUser?.isAdmin ? <Link to="/admin">Admin</Link> : null}
          {currentUser ? <Link to="/my-area">My Area</Link> : <Link to="/login">Login</Link>}
          <Link to="/newcafe" className="nav-cta">
            + Add a cafe
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
