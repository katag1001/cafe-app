const { Cafe, CafeRating, User } = require('../_models/models')
const categoryRegistry = require('../_config/categories')

const toMinutes = (hhmm) => {
  if (typeof hhmm !== 'string') return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

const fromMinutes = (totalMinutes) => {
  const rounded = Math.round(totalMinutes)
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const median = (sortedValues) => {
  const mid = Math.floor(sortedValues.length / 2)
  return sortedValues.length % 2 !== 0
    ? sortedValues[mid]
    : (sortedValues[mid - 1] + sortedValues[mid]) / 2
}

// Builds the aggregated answers block for one category from every rating
// entry that touched it, per the four answer-type rules in PRD.md §9.1.
// Comments/questions are never weighted — this only aggregates the raw
// yes/no, scale, select, and time values.
function aggregateAnswers(categoryDef, entries) {
  const result = []

  for (const question of categoryDef.questions) {
    const values = []

    entries.forEach((entry) => {
      const answer = entry.answers?.find((a) => a.questionId === question.id)
      if (answer && answer.value !== undefined && answer.value !== null) {
        values.push(answer.value)
      }
    })

    if (!values.length) continue

    if (question.type === 'yesno') {
      const yes = values.filter((v) => v === true).length
      const no = values.filter((v) => v === false).length
      result.push({ questionId: question.id, tally: { yes, no } })
    } else if (question.type === 'scale' || question.type === 'quality') {
      const tally = {}
      question.options.forEach((opt) => { tally[opt] = 0 })
      values.forEach((v) => { if (tally[v] !== undefined) tally[v] += 1 })
      result.push({ questionId: question.id, tally })
    } else if (question.type === 'select') {
      // Each option is an independent yes/no toggle (PRD.md §9.1), so every
      // option gets its own yes/no tally, not a single-choice distribution.
      const tally = {}
      question.options.forEach((opt) => { tally[opt] = { yes: 0, no: 0 } })
      values.forEach((selected) => {
        const selectedList = Array.isArray(selected) ? selected : []
        question.options.forEach((opt) => {
          if (selectedList.includes(opt)) tally[opt].yes += 1
          else tally[opt].no += 1
        })
      })
      result.push({ questionId: question.id, tally })
    } else if (question.type === 'time') {
      const starts = values.map((v) => toMinutes(v?.start)).filter((m) => m !== null).sort((a, b) => a - b)
      const ends = values.map((v) => toMinutes(v?.end)).filter((m) => m !== null).sort((a, b) => a - b)
      result.push({
        questionId: question.id,
        tally: {
          medianStart: starts.length ? fromMinutes(median(starts)) : null,
          medianEnd: ends.length ? fromMinutes(median(ends)) : null,
        },
      })
    }
  }

  return result
}

// Always rebuildable from CafeRating — never hand-patch ratingSummary
// elsewhere (CLAUDE.md §4.3). Called after every rating write/delete.
async function recomputeCafeRatingSummary(cafeId) {
  const ratings = await CafeRating.find({ cafeId })

  const overallScores = ratings.map((r) => r.overallScore).filter((s) => typeof s === 'number')
  const overallAverage = overallScores.length
    ? overallScores.reduce((sum, s) => sum + s, 0) / overallScores.length
    : 0

  const categorySummaries = []

  for (const categoryDef of categoryRegistry) {
    const entries = []

    ratings.forEach((rating) => {
      const entry = rating.categories?.find((c) => c.categoryId === categoryDef.id)
      if (entry && typeof entry.score === 'number') entries.push(entry)
    })

    if (!entries.length) continue

    const weightedSum = entries.reduce((sum, e) => sum + e.score * (e.weight || 1), 0)
    const weightTotal = entries.reduce((sum, e) => sum + (e.weight || 1), 0)
    const average = weightTotal ? weightedSum / weightTotal : 0

    categorySummaries.push({
      categoryId: categoryDef.id,
      average,
      count: entries.length,
      answers: aggregateAnswers(categoryDef, entries),
    })
  }

  await Cafe.findByIdAndUpdate(cafeId, {
    $set: {
      'ratingSummary.overall': { average: overallAverage, count: overallScores.length },
      'ratingSummary.categories': categorySummaries,
    },
  })
}

// Category counts: distinct cafes this user has a category entry for, per
// category — used for both tier badges and weight lookups. City counts:
// distinct cafes with at least one category rating, tallied by the cafe's
// address (PRD.md §8.4) — a Quick-Review-only rating doesn't count toward
// this, to keep the "Local" badge meaningful rather than trivially earned.
async function recomputeUserContributorStats(userId) {
  const ratings = await CafeRating.find({ userId }).populate('cafeId', 'address')

  const categoryCounts = new Map()
  const cityCounts = new Map()

  for (const rating of ratings) {
    // Only entries carrying an actual score count as a "rating" — a
    // comment-only entry (no score) is feedback, not a rating, and must
    // never advance tier progress or the Local badge on its own.
    const scoredEntries = rating.categories?.filter((entry) => typeof entry.score === 'number') || []

    // Category counts reflect the user's own rating activity regardless of
    // whether the cafe they rated still exists (e.g. was later hard-closed)
    // — their contribution/experience shouldn't retroactively vanish.
    scoredEntries.forEach((entry) => {
      categoryCounts.set(entry.categoryId, (categoryCounts.get(entry.categoryId) || 0) + 1)
    })

    // City counts do need the cafe's current address, so they're skipped if
    // the cafe has since been deleted (rating.cafeId fails to populate).
    if (scoredEntries.length && rating.cafeId) {
      const city = rating.cafeId.address?.city
      const country = rating.cafeId.address?.country
      if (city && country) {
        const key = `${city}|${country}`
        cityCounts.set(key, (cityCounts.get(key) || 0) + 1)
      }
    }
  }

  const categories = Array.from(categoryCounts.entries()).map(([categoryId, count]) => ({
    categoryId,
    count,
  }))

  const cities = Array.from(cityCounts.entries()).map(([key, count]) => {
    const [city, country] = key.split('|')
    return { city, country, count }
  })

  await User.findByIdAndUpdate(userId, {
    $set: { 'contributorStats.categories': categories, 'contributorStats.cities': cities },
  })
}

module.exports = { recomputeCafeRatingSummary, recomputeUserContributorStats }
