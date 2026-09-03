const OpeningHours = require('opening_hours')

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const pad = (n) => String(n).padStart(2, '0')

// Converts an OSM `opening_hours` tag string into this app's structured,
// single-window-per-day format (PRD.md §11 open-hours scope). If a day has
// multiple disjoint intervals (e.g. a lunch break), only the earliest start
// and latest end are kept — a deliberate simplification, not a bug.
//
// Note: times are read back using the local time of whatever process runs
// this parser, matching how the `opening_hours` library interpreted the
// input in the first place (it round-trips consistently regardless of the
// server's actual timezone, but is not the cafe's own local timezone unless
// they happen to match). This is acceptable because the confirm-step always
// shows the result to a human for review/correction before saving.
function parseOpeningHours(rawString) {
  if (!rawString) {
    return null
  }

  let oh

  try {
    oh = new OpeningHours(rawString)
  } catch (error) {
    return null
  }

  // A fixed reference week (Sunday -> Saturday), arbitrary but stable.
  const referenceSunday = new Date('2024-01-07T00:00:00')
  const referenceNextSunday = new Date('2024-01-14T00:00:00')

  let intervals

  try {
    intervals = oh.getOpenIntervals(referenceSunday, referenceNextSunday)
  } catch (error) {
    return null
  }

  const byDay = new Map()

  for (const [start, end] of intervals) {
    const day = DAY_NAMES[start.getDay()]
    const openMinutes = start.getHours() * 60 + start.getMinutes()
    const closeMinutes = end.getHours() * 60 + end.getMinutes()

    const existing = byDay.get(day)

    if (!existing) {
      byDay.set(day, { openMinutes, closeMinutes })
    } else {
      existing.openMinutes = Math.min(existing.openMinutes, openMinutes)
      existing.closeMinutes = Math.max(existing.closeMinutes, closeMinutes)
    }
  }

  if (!byDay.size) {
    return null
  }

  return Array.from(byDay.entries()).map(([day, { openMinutes, closeMinutes }]) => ({
    day,
    open: `${pad(Math.floor(openMinutes / 60))}:${pad(openMinutes % 60)}`,
    close: `${pad(Math.floor(closeMinutes / 60))}:${pad(closeMinutes % 60)}`,
  }))
}

module.exports = { parseOpeningHours }
