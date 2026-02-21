import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RackGrid from "../Components/RackGrid";
import BinPopup from "../Components/BinPopup";
import BASE_URL from "../api";

export default function LayoutPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const params = new URLSearchParams(routerLocation.search);
  const initialSearch = params.get("search") || "";

  const [bins, setBins] = useState([]);
  const [filteredBins, setFilteredBins] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [search, setSearch] = useState(initialSearch);
  const [aisleFilter, setAisleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // ===============================
  // LOAD DATA
  // ===============================
  useEffect(() => {
    const loadBins = async () => {
      try {
        const res = await fetch(`${BASE_URL}/bins`);

        if (!res.ok) throw new Error("Failed to load bins");

        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];

        setBins(safeData);
        setFilteredBins(safeData);
      } catch (err) {
        console.error("Error loading bins:", err);
        setBins([]);
        setFilteredBins([]);
      } finally {
        setLoading(false);
      }
    };

    loadBins();
  }, []);

  // ===============================
  // SMART FILTER + SEARCH
  // ===============================
  useEffect(() => {
    let result = bins;

    // ✅ CORRECT AISLE FILTER
    if (aisleFilter !== "ALL") {
      result = result.filter(b => {
        if (!b.location_code) return false;

        // Format: "ELECTRA P5-A1"
        const parts = b.location_code.split(" ");
        if (parts.length < 2) return false;

        const aislePart = parts[1].split("-")[0]; // P5
        return aislePart.startsWith(aisleFilter);
      });
    }

    // 🔍 SMART SEARCH
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const ranked = [];

      result.forEach(loc => {
        const locationCode = loc.location_code?.toLowerCase() || "";

        const exactLocation = locationCode === query;
        const partialLocation = locationCode.includes(query);

        const skuExact = (loc.items || []).some(i =>
          i.sku?.toLowerCase() === query
        );

        const skuPartial = (loc.items || []).some(i =>
          i.sku?.toLowerCase().includes(query)
        );

        const productMatch = (loc.items || []).some(i =>
          i.product_name?.toLowerCase().includes(query)
        );

        if (exactLocation)
          ranked.unshift({ ...loc, highlight: true });
        else if (skuExact)
          ranked.unshift(loc);
        else if (partialLocation || skuPartial || productMatch)
          ranked.push(loc);
      });

      result = ranked;
    }

    setFilteredBins(result);
  }, [bins, search, aisleFilter]);

  // ===============================
  // AUTO SCROLL TO EXACT MATCH
  // ===============================
  useEffect(() => {
    if (!search) return;

    const el = document.getElementById(search.toUpperCase());

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [filteredBins]);

  // ===============================
  // SAVE CAPACITY
  // ===============================
  const saveCapacity = async (locationCode, maxCartons) => {
    try {
      await fetch(`${BASE_URL}/locations/pallet-capacity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_code: locationCode.toUpperCase(),
          max_cartons: Number(maxCartons),
        }),
      });

      setBins(prev =>
        prev.map(b =>
          b.location_code === locationCode.toUpperCase()
            ? { ...b, max_cartons: Number(maxCartons) }
            : b
        )
      );

      setSelectedLocation(null);
    } catch (err) {
      console.error("Capacity update failed:", err);
      alert("Failed to update capacity");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: 16,
      }}
    >
      <div style={topBar}>
        <button style={btn} onClick={() => navigate("/")}>
          ← Home
        </button>

        <select
          value={aisleFilter}
          onChange={e => setAisleFilter(e.target.value)}
          style={input}
        >
          <option value="ALL">All Aisles</option>
          {["P", "Q", "R", "S", "T"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <input
          placeholder="Search SKU, product or location"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={input}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <p>Loading…</p>
        ) : filteredBins.length === 0 ? (
          <p style={{ marginTop: 40, opacity: 0.6 }}>
            No results found.
          </p>
        ) : (
          <RackGrid
            bins={filteredBins}
            onSelect={setSelectedLocation}
          />
        )}
      </div>

      {selectedLocation && (
        <BinPopup
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSave={saveCapacity}
        />
      )}
    </div>
  );
}

const topBar = {
  display: "flex",
  gap: 12,
  marginBottom: 16,
};

const btn = {
  background: "#161a22",
  color: "#fff",
  padding: "8px 12px",
  border: "none",
  cursor: "pointer",
};

const input = {
  background: "#161a22",
  color: "#fff",
  padding: "8px 12px",
  border: "none",
};