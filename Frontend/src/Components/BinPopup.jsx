import { useState } from "react";

export default function BinPopup({ location, onClose, onSave }) {
  if (!location) return null;

  const items = Array.isArray(location.items) ? location.items : [];

  const [maxCartons, setMaxCartons] = useState(
    location.max_cartons ?? ""
  );

  return (
    <div style={overlay}>
      <div style={popup}>
        <h2>{location.location_code}</h2>

        <p>
          <strong>Total cartons:</strong>{" "}
          {location.total_cartons}
        </p>

        <hr />

        <h4>SKUs in this location</h4>

        {/* ✅ SCROLLABLE SKU SECTION */}
        <div style={skuScroll}>
          {items.map((item, i) => (
            <div key={i} style={skuRow}>
              <div style={skuName}>{item.product_name}</div>
              <div>{item.cartons} cartons</div>
            </div>
          ))}
        </div>

        <hr />

        <label>Max cartons for this location</label>

        <input
          type="number"
          value={maxCartons}
          onChange={e => setMaxCartons(e.target.value)}
          placeholder="e.g. 60"
          style={input}
        />

        <div style={actions}>
          <button onClick={onClose}>Cancel</button>

          <button
            onClick={() =>
              onSave(location.location_code, Number(maxCartons))
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   STYLES
================================ */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const popup = {
  background: "#0f141d",
  padding: 20,
  borderRadius: 12,
  width: 380,
  maxHeight: "85vh",       // ✅ limit popup height
  display: "flex",         // ✅ allow flexible layout
  flexDirection: "column",
};

const skuScroll = {
  flex: 1,                 // ✅ take remaining space
  overflowY: "auto",       // ✅ enable scroll
  marginTop: 6,
  paddingRight: 6,
};

const skuRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 6,
  gap: 10,
};

const skuName = {
  flex: 1,
  paddingRight: 10,
};

const input = {
  width: "100%",
  padding: 8,
  marginTop: 6,
};

const actions = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 14,
};