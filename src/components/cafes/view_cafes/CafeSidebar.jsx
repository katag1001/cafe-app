import CafeCard from "./CafeCard";

function CafeSidebar({ cafes }) {
  return (
    <aside className="cafe-sidebar">
      {cafes.map((cafe) => (
        <CafeCard
          key={cafe._id}
          cafe={cafe}
        />
      ))}
    </aside>
  );
}

export default CafeSidebar;
