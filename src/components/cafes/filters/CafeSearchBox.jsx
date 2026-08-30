import { useState, useEffect } from "react";

// Scoped to the current map viewport only — no global search, no auto-pan
// (PRD.md §10.1).
function CafeSearchBox({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange(localValue);
  };

  return (
    <form className="cafe-search-box" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search cafe name in this area..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}

export default CafeSearchBox;
