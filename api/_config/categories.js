// Answer types: 'yesno' | 'select' | 'scale' | 'quality' | 'time'
// - 'select' options carry an optional `exclusiveOption` — selecting that
//   option deselects every other option for the same question (PRD.md §9.1).
// - 'scale' options are always None/Minimal/Lots/Loads, listed explicitly on
//   each question so a consumer never needs implicit type-based knowledge.
// - 'quality' behaves identically to 'scale' (single-select from explicit
//   options) but uses a Poor..Exceptional quality scale instead.

const SCALE_OPTIONS = ['None', 'Minimal', 'Lots', 'Loads']
const QUALITY_OPTIONS = ['Poor', 'Average', 'Good', 'Great', 'Exceptional']

module.exports = [
    {
    id: 'coffee',
    label: 'Coffee',
    questions: [
      { id: 'coffee-quality', text: 'How would you describe the quality of the coffee?', type: 'quality', options: QUALITY_OPTIONS },
      { id: 'specialty-coffee', text: 'Do they serve specialty coffee?', type: 'yesno' },
      { id: 'roast-own-coffee', text: 'Do they roast their own coffee?', type: 'yesno' },
      { id: 'choice-of-beans', text: 'Do they offer a choice of different beans?', type: 'yesno' },
      { id: 'brewing-methods', text: 'Do they offer different brewing methods, such as espresso, pour-over, AeroPress, or batch brew?', type: 'yesno' },
      { id: 'staff-knowledge', text: 'Do the staff demonstrate knowledge about the coffee they serve?', type: 'yesno' },
      { id: 'core-part-of-offering', text: "Does the café's coffee feel like a core part of what they do, rather than an afterthought?", type: 'yesno' },
    ],
  },
  {
    id: 'computer',
    label: 'Computer',
    questions: [
      { id: 'bring-laptops', text: 'Can you bring laptops here?', type: 'yesno' },
      { id: 'power-outlets', text: 'Are there power outlets available near the seating areas?', type: 'scale', options: SCALE_OPTIONS },
      { id: 'wifi-reliable', text: 'Is the Wi-Fi reliable enough for working on a laptop?', type: 'scale', options: SCALE_OPTIONS },
      { id: 'table-space', text: 'Is there enough table space to comfortably use a laptop?', type: 'yesno' },
      { id: 'quiet-for-work', text: 'Is the cafe quiet enough to comfortably concentrate on laptop work?', type: 'yesno' },
      { id: 'video-calls', text: 'Can you comfortably make video calls from the cafe?', type: 'yesno' },
      { id: 'dedicated-work-areas', text: 'Does the cafe have dedicated areas suitable for working on a laptop?', type: 'yesno' },
      { id: 'comfortable-hours', text: 'Would you feel comfortable staying here for a couple of hours while working?', type: 'yesno' },
      { id: 'laptop-hours', text: "Are there specific times you're allowed to use a laptop?", type: 'time' },
    ],
  },
  {
    id: 'accessible',
    label: 'Accessible',
    questions: [
      { id: 'step-free-entrance', text: 'Is the cafe step-free from the entrance to the main seating area?', type: 'yesno' },
      { id: 'wheelchair-table-space', text: 'Is there enough space between tables for a wheelchair to move comfortably?', type: 'yesno' },
      { id: 'accessible-toilet', text: 'Is there an accessible toilet available?', type: 'yesno' },
      { id: 'enter-without-assistance', text: 'Can you easily enter the cafe without needing assistance?', type: 'yesno' },
      { id: 'accessible-seating', text: 'Is there accessible seating available, such as tables with enough legroom for a wheelchair?', type: 'yesno' },
    ],
  },
  {
    id: 'veggie',
    label: 'Veggie',
    questions: [
      { id: 'alt-milks', text: 'Do they offer alternative m*lks?', type: 'select', options: ['None', 'Soy', 'Oat', 'Coconut', 'Other'], exclusiveOption: 'None' },
      { id: 'vegetarian-option', text: 'Is there at least one vegetarian food option?', type: 'yesno' },
      { id: 'vegan-option', text: 'Is there at least one vegan food option?', type: 'yesno' },
      { id: 'menu-clearly-marked', text: 'Are vegan/vegetarian options clearly identified on the menu?', type: 'yesno' },
      { id: 'substitutions-allowed', text: 'Does the cafe allow vegan/vegetarian substitutions?', type: 'yesno' },
    ],
  },
  {
    id: 'cosy',
    label: 'Cosy',
    questions: [
      { id: 'comfortable-seating', text: 'Does the cafe have comfortable seating suitable for staying for a while?', type: 'yesno' },
      { id: 'quiet-for-conversation', text: 'Is the cafe generally quiet enough to have a relaxed conversation?', type: 'yesno' },
      { id: 'warm-atmosphere', text: 'Does the cafe have a warm or intimate atmosphere?', type: 'yesno' },
      { id: 'private-seating-arrangement', text: 'Is the seating arranged in a way that gives you a sense of privacy?', type: 'yesno' },
    ],
  },
  {
    id: 'datespot',
    label: 'Datespot',
    questions: [
      { id: 'romantic-atmosphere', text: 'Is the atmosphere romantic or intimate enough for a date?', type: 'yesno' },
      { id: 'table-privacy', text: 'Is there enough privacy between tables for a couple to have a personal conversation?', type: 'yesno' },
      { id: 'public-and-open', text: 'Is the cafe public and open enough that you would feel comfortable meeting a stranger here?', type: 'yesno' },
      { id: 'staff-activity-present', text: "Is there usually enough staff or activity around that you wouldn't feel isolated?", type: 'yesno' },
      { id: 'approachable-staff', text: 'If you needed help during a date, do you feel like it would be easy to approach a member of staff?', type: 'yesno' },
    ],
  },

]
