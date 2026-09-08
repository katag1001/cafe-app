// Maps backend category ids (api/_config/categories.js) to the label shown
// on screen. The backend registry stays the source of truth for ids/questions
// (CLAUDE.md §4.2) — this only overrides how each id is displayed.
const CATEGORY_DISPLAY_LABELS = {
  coffee: 'Quality Coffee',
  computer: 'Laptop/Work Friendly',
  accessible: 'Accessible',
  veggie: 'Veggie/Vegan Friendly',
  cosy: 'Cosy',
  datespot: 'Date Friendly',
};

export function getCategoryDisplayLabel(categoryId, fallbackLabel) {
  return CATEGORY_DISPLAY_LABELS[categoryId] || fallbackLabel || categoryId;
}
