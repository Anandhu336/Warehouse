import { useEffect, useState } from "react";
import BASE_URL from "../api";

export default function WarehouseOptimizer() {

  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    aisle: "ALL",
    category: "",
    brand: "",
    flavour: "",
    search: "",
    pallet_type: "",
  });

  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    brands: [],
  });

  const [flavours, setFlavours] = useState([]);
  const [groupCapacity, setGroupCapacity] = useState("");
  const [locationCapacity, setLocationCapacity] = useState("");

  // =========================
  // LOAD FILTERS
  // =========================
  useEffect(() => {
    fetch(`${BASE_URL}/optimizer/filters`)
      .then(res => res.json())
      .then(data => setAvailableFilters(data || { categories: [], brands: [] }))
      .catch(() => setAvailableFilters({ categories: [], brands: [] }));
  }, []);

  // =========================
  // LOAD LOCATIONS
  // =========================
  useEffect(() => {
    loadLocations();
  }, [filters]);

  const loadLocations = () => {
    setLoading(true);

    const params = { ...filters };
    if (params.aisle === "ALL") delete params.aisle;

    const query = new URLSearchParams(params).toString();

    fetch(`${BASE_URL}/optimizer/locations?${query}`)
      .then(res => res.json())
      .then(data => {
        setLocations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLocations([]);
        setLoading(false);
      });
  };

  // =========================
  // BRAND → FLAVOURS
  // =========================
  useEffect(() => {

    if (!filters.brand && !filters.category) {
      setFlavours([]);
      return;
    }

    const params = new URLSearchParams({
      brand: filters.brand,
      category: filters.category
    }).toString();

    fetch(`${BASE_URL}/optimizer/flavours?${params}`)
      .then(res => res.json())
      .then(data => setFlavours(data.flavours || []))
      .catch(() => setFlavours([]));

  }, [filters.brand, filters.category]);

  // =========================
  // GROUP CAPACITY UPDATE
  // =========================
  const updateGroupCapacity = async () => {

    if (!selected || !groupCapacity) return;

    await fetch(`${BASE_URL}/optimizer/set-group-capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: selected.items[0].brand,
        category: selected.items[0].category,
        max_cartons: Number(groupCapacity)
      }),
    });

    setGroupCapacity("");
    loadLocations();
  };

  // =========================
  // LOCATION CAPACITY UPDATE
  // =========================
  const updateLocationCapacity = async () => {

    if (!selected || !locationCapacity) return;

    await fetch(`${BASE_URL}/optimizer/set-location-capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_code: selected.location_code,
        max_cartons: Number(locationCapacity)
      }),
    });

    setLocationCapacity("");
    loadLocations();
  };

  const totalLocations = locations.length;
  const mixedCount = locations.filter(l => l.is_mixed).length;
  const lowCount = locations.filter(l => l.needs_merge).length;

  return (
    <div className="dashboard-wrapper">

      {/* ================= HEADER ================= */}
      <div className="dashboard-header">

        <div className="filter-row">

          {/* AISLE */}
          <select
            value={filters.aisle}
            onChange={e =>
              setFilters({ ...filters, aisle: e.target.value })
            }
          >
            <option value="ALL">All Aisles</option>
            {["P","Q","R","S","T"].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* CATEGORY */}
          <select
            value={filters.category}
            onChange={e =>
              setFilters({ ...filters, category: e.target.value, flavour: "" })
            }
          >
            <option value="">All Categories</option>
            {availableFilters.categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          {/* BRAND */}
          <select
            value={filters.brand}
            onChange={e =>
              setFilters({ ...filters, brand: e.target.value, flavour: "" })
            }
          >
            <option value="">All Brands</option>
            {availableFilters.brands.map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>

          {/* FLAVOUR */}
          <select
            value={filters.flavour}
            onChange={e =>
              setFilters({ ...filters, flavour: e.target.value })
            }
          >
            <option value="">All Flavours</option>
            {flavours.map((f, i) => (
              <option key={i} value={f}>{f}</option>
            ))}
          </select>

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search SKU or Product"
            value={filters.search}
            onChange={e =>
              setFilters({ ...filters, search: e.target.value })
            }
          />

          {/* PALLET TYPE */}
          <select
            value={filters.pallet_type}
            onChange={e =>
              setFilters({ ...filters, pallet_type: e.target.value })
            }
          >
            <option value="">All Pallets</option>
            <option value="single">Single SKU</option>
            <option value="mixed">Mixed</option>
          </select>

        </div>

        <div className="dashboard-stats">
          <div>Total Locations: {totalLocations}</div>
          <div>Mixed Pallets: {mixedCount}</div>
          <div>Low Occupancy: {lowCount}</div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="dashboard-body">

        {/* GRID */}
        <div className="dashboard-grid">
          {loading ? (
            <p>Loading...</p>
          ) : locations.length === 0 ? (
            <p>No data found</p>
          ) : (
            <div className="card-grid">
              {locations.map((p, i) => {

                const occupancy = p.occupancy_percent || 0;

                return (
                  <div
                    key={i}
                    className={`optimizer-card 
                      ${p.is_mixed ? "mixed" : ""} 
                      ${p.needs_merge ? "low" : ""}`}
                    onClick={() => setSelected(p)}
                  >
                    <div className="opt-header">
                      <strong>{p.location_code}</strong>
                      <span>{occupancy}%</span>
                    </div>

                    <div>Cartons: {p.total_cartons}</div>

                    <div>
                      Capacity: {p.max_cartons}
                      {p.capacity_source === "location-override" && " (Manual Pallet)"}
                      {p.capacity_source === "group-override" && " (Brand Override)"}
                      {p.capacity_source === "default" && " (Default 30)"}
                    </div>

                    {p.is_mixed && (
                      <div className="flag red">Mixed SKU</div>
                    )}

                    {p.needs_merge && (
                      <div className="flag yellow">
                        Low Occupancy — Merge Suggested
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        {selected && (
          <div className="dashboard-sidebar">

            <h3>{selected.location_code}</h3>
            <div>Occupancy: {selected.occupancy_percent}%</div>

            <h4>Products</h4>

            {selected.items.map((item, idx) => (
              <div key={idx} className="sku-row">
                <div>{item.product_name}</div>
                <div>{item.cartons} cartons</div>
              </div>
            ))}

            {/* GROUP OVERRIDE */}
            <div style={{ marginTop: 20 }}>
              <h4>
                Set Capacity for {selected.items[0].brand} - {selected.items[0].category}
              </h4>

              <input
                type="number"
                value={groupCapacity}
                onChange={e => setGroupCapacity(e.target.value)}
              />

              <button
                style={{ marginLeft: 10 }}
                onClick={updateGroupCapacity}
              >
                Update
              </button>
            </div>

            {/* LOCATION OVERRIDE */}
            <div style={{ marginTop: 20 }}>
              <h4>Set Capacity For This Pallet Only</h4>

              <input
                type="number"
                value={locationCapacity}
                onChange={e => setLocationCapacity(e.target.value)}
              />

              <button
                style={{ marginLeft: 10 }}
                onClick={updateLocationCapacity}
              >
                Update
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}