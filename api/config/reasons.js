// Fixed reason lists for flagging a live cafe and for admin rejection of a
// pending submission (PRD.md §6.3). Kept as data, not inline strings
// scattered across controllers/schemas, for the same reason as
// categories.js/tiers.js — see CLAUDE.md §4.2.

const FLAG_REASONS = [
  { id: "does_not_exist", label: "Cafe doesn't exist / never existed here" },
  { id: "permanently_closed", label: "Cafe has permanently closed down" },
  { id: "duplicate", label: "Duplicate of another listing already on the site" },
  { id: "incorrect_address", label: "Incorrect address or location" },
  { id: "inappropriate_content", label: "Inappropriate or vulgar name/content" },
  { id: "spam", label: "Spam or promotional listing" },
  { id: "not_a_cafe", label: "Not actually a cafe (wrong type of business)" },
  { id: "owner_removal_request", label: "Owner/manager requesting removal" },
  { id: "incorrect_information", label: "Incorrect information (hours, contact details, etc.)" },
  { id: "other", label: "Other" },
];

const REJECTION_REASONS = [
  { id: "could_not_verify", label: "Could not verify this is a real business" },
  { id: "duplicate", label: "Duplicate of an existing cafe already listed" },
  { id: "incomplete_address", label: "Incomplete or inaccurate address" },
  { id: "inappropriate_content", label: "Inappropriate or vulgar content" },
  { id: "spam", label: "Spam or promotional submission" },
  { id: "other", label: "Other" },
];

module.exports = { FLAG_REASONS, REJECTION_REASONS };
