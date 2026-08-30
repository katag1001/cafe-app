import { useEffect, useState } from 'react'

// Module-level cache so the registry is only ever fetched once per page
// load, no matter how many components call this hook. The frontend must
// never hardcode categories itself — see CLAUDE.md §4.2.
let cachedCategories = null
let inFlightRequest = null

function loadCategories() {
  if (cachedCategories) {
    return Promise.resolve(cachedCategories)
  }

  if (!inFlightRequest) {
    inFlightRequest = fetch('/api/categories')
      .then((response) => response.json())
      .then((data) => {
        cachedCategories = data.categories || []
        return cachedCategories
      })
      .finally(() => {
        inFlightRequest = null
      })
  }

  return inFlightRequest
}

export function useCategories() {
  const [categories, setCategories] = useState(cachedCategories || [])
  const [loading, setLoading] = useState(!cachedCategories)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cachedCategories) {
      return
    }

    let isMounted = true

    loadCategories()
      .then((data) => {
        if (isMounted) setCategories(data)
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { categories, loading, error }
}
