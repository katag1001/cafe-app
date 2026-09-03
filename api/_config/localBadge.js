// The city "Local" badge threshold (PRD.md §8.4). A single value, kept here
// rather than inline at each call site so it stays in sync everywhere it's
// checked (profile badges, comment badges, the local-users lookup).
module.exports = {
  THRESHOLD: 20,
}
