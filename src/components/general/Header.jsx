import { Link } from 'react-router-dom'
import './Header.css'

function Header({ currentUser }) {
  return (
    <header className="header">
      <nav className="navbar">
        <Link to="/" className="logo">
          CafeFinder
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/newcafe">New Cafe</Link>
          <Link to="/browse-user-faves">Browse user faves</Link>

          {currentUser?.isAdmin ? <Link to="/admin">Admin</Link> : null}

          {currentUser ? <Link to="/my-area">My Area</Link> : <Link to="/login">Login</Link>}
        </div>
      </nav>
    </header>
  )
}

export default Header
