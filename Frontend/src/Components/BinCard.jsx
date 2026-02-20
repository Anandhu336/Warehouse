import { useState } from "react";

export default function BinCard({ location, onClick }) {
  const [hover, setHover] = useState(null);

  const totalCartons = Number(location.total_cartons || 0);
  const maxCartons =
    location.max_cartons != null ? Number(location.max_cartons) : null;

  const items = Array.isArray(location.items) ? location.items : [];

  // ===============================
  // OCCUPANCY %
  // ===============================
  let percent = null;
  if (maxCartons && maxCartons > 0) {
    percent = Math.min(
      Math.round((totalCartons / maxCartons) * 100),
      100
    );
  }

  let color = "#555";
  if (percent !== null) {
    if (percent <= 50) color = "#2ecc71";
    else if (percent <= 80) color = "#f1c40f";
    else color = "#e74c3c";
  }

  // ===============================
  // HOVER HANDLERS
  // ===============================
  const handleEnter = (e) => {
    const x = Math.min(e.clientX + 16, window.innerWidth - 340);
    const y = e.clientY + 16;
    setHover({ x, y });
  };

  const handleLeave = () => {
    setHover(null);
  };

  // ===============================
  // HIGHLIGHT IF SEARCH MATCH
  // ===============================
  const highlightStyle = location.highlight
    ? {
        boxShadow: "0 0 0 3px #22c55e",
        transform: "scale(1.02)",
      }
    : {};

  return (
    <>
      <div
        id={location.location_code}
        className="bin-card"
        onClick={() => onClick(location)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          borderTop: `4px solid ${color}`,
          transition: "all 0.2s ease",
          ...highlightStyle,
        }}
      >
        <strong>{location.location_code}</strong>

        <div className="bin-cartons">
          {maxCartons
            ? `${totalCartons} / ${maxCartons} cartons`
            : `${totalCartons} cartons`}
        </div>

        {percent !== null && (
          <div className="bin-progress">
            <div
              className="bin-progress-fill"
              style={{
                width: `${percent}%`,
                background: color,
              }}
            />
          </div>
        )}

        <div className="bin-sku-count">
          {items.length} SKU{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ===============================
          HOVER TOOLTIP
      =============================== */}
      {hover && items.length > 0 && (
        <div
          className="hover-layer-fixed"
          style={{ top: hover.y, left: hover.x }}
          onMouseEnter={() => setHover(hover)}
          onMouseLeave={handleLeave}
        >
          {items.map((i, idx) => (
            <div key={idx} className="hover-row">
              <span className="hover-name">{i.product_name}</span>
              <span className="hover-cartons">
                {i.cartons} ctn
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}