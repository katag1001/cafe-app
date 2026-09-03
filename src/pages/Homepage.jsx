import { useLocation } from 'react-router-dom'

import ViewCafeMap from '../components/cafes/view_cafes/ViewCafeMap'
import './Homepage.css'

function Homepage() {
  const location = useLocation()
  const message = location.state?.message

  return (
    <main className="homepage">
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Crowd-sourced &amp; caffeinated</p>
          <h1>Find your next favorite cafe</h1>
          <p className="hero-subtitle">
            Real ratings from real regulars — wifi, seating, quiet hours, and more. Pan the map,
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
