import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'

// The mobile layout wraps nav links onto extra lines, so the header's real
// height varies by breakpoint/content and can't be a fixed design token.
// Keeping --header-height in sync lets any sticky element (e.g. RateCafePage)
// offset itself below the header correctly at every viewport size.
function Header({ currentUser }) {
  const headerRef = useRef(null)

  useLayoutEffect(() => {
    const headerEl = headerRef.current
    if (!headerEl) return

    const updateHeight = () => {
      document.documentElement.style.setProperty('--header-height', `${headerEl.offsetHeight}px`)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(headerEl)
    return () => observer.disconnect()
  }, [])

  return (
    <header className="header" ref={headerRef}>
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
