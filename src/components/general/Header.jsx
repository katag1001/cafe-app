import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <nav className="navbar">
        <Link to="/" className="logo">
          CafeFinder
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/newcafe">New Cafe</Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
