import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router preserves scroll position across route changes by default;
// this resets it to the top whenever the pathname changes.
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop
