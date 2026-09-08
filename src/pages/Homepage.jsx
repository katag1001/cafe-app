import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import ViewCafeMap from '../components/cafes/view_cafes/ViewCafeMap'
import './Homepage.css'

const MESSAGE_TIMEOUT_MS = 6000

function Homepage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState(location.state?.message)

  // The success/status message is passed via router state after actions like
  // submitting a cafe. Clear it after a few seconds so it doesn't linger on
  // the homepage indefinitely, and drop it from history state so it doesn't
  // reappear on back/forward navigation.
  useEffect(() => {
    if (!location.state?.message) return

    const timer = setTimeout(() => {
      setMessage(undefined)
      navigate(location.pathname, { replace: true, state: {} })
    }, MESSAGE_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [location.state, location.pathname, navigate])

  return (
    <main className="homepage">
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Crowd-sourced &amp; caffeinated</p>
          <h1>Find your next favorite cafe</h1>
          <p className="hero-subtitle">
            Real ratings from real regulars. Pan the map,
            filter by what matters, and pick your next spot.
          </p>
          {message && <p className="message">{message}</p>}
        </div>
      </section>

      <section className="browse-section container">
        <ViewCafeMap />
      </section>
    </main>
  )
}

export default Homepage
