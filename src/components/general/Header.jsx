import { Link } from 'react-router-dom'
import './Header.css'

function Header({ currentUser }) {
  return (
    <header className="header">
      <nav className="navbar container">
        <Link to="/" className="logo">
          Chocolate Pistachio
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/browse-user-faves">User faves</Link>
          {currentUser?.isAdmin ? <Link to="/admin">Admin</Link> : null}
          {currentUser ? <Link to="/my-area">Me</Link> : <Link to="/login">Login</Link>}
          <Link to="/newcafe" className="nav-cta">
            + Add a cafe
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
