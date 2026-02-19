import { useEffect, useState } from "react";

export default function WarehouseOptimizer() {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    aisle: "ALL",
    category: "",
    brand: "",
    search: "",
  });

  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    brands: [],
  });

  // -----------------------------
  // Load filter options
  // -----------------------------
  useEffect(() => {
    fetch("http://127.0.0.1:8000/optimizer/filters")
      .then(res => res.json())
      .then(data => setAvailableFilters(data || { categories: [], brands: [] }))
      .catch(() => setAvailableFilters({ categories: [], brands: [] }));
  }, []);

  // -----------------------------
  // Load locations
  // -----------------------------
  useEffect(() => {
    loadLocations();
  }, [filters]);

  const loadLocations = () => {
    setLoading(true);

    const params = { ...filters };

    if (params.aisle === "ALL") {
      delete params.aisle;
    }

    const query = new URLSearchParams(params).toString();

    fetch(`http://127.0.0.1:8000/optimizer/locations?${query}`)
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

  const updateCapacity = async (location_code, value) => {
  await fetch("http://127.0.0.1:8000/locations/pallet-capacity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location_code: location_code,
      max_cartons: Number(value),
    }),
  });

  loadLocations();
};

  // KPI calculations
  const totalLocations = locations.length;
  const mixedCount = locations.filter(l => l.is_mixed).length;
  const lowCount = locations.filter(l => l.needs_merge).length;

  return (
    <div className="dashboard-wrapper">

      {/* HEADER */}
      <div className="dashboard-header">
        <div className="filter-row">

          <select
            value={filters.aisle}
            onChange={e => setFilters({ ...filters, aisle: e.target.value })}
          >
            <option value="ALL">All Aisles</option>
            <option value="P">P</option>
            <option value="Q">Q</option>
            <option value="R">R</option>
            <option value="S">S</option>
            <option value="T">T</option>
          </select>

          <select
            value={filters.category}
            onChange={e => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All Categories</option>
            {availableFilters.categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.brand}
            onChange={e => setFilters({ ...filters, brand: e.target.value })}
          >
            <option value="">All Brands</option>
            {availableFilters.brands.map((b, i) => (
              <option key={i} value={b}>{b}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search SKU or Product"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />

        </div>

        <div className="dashboard-stats">
          <div>Total Locations: {totalLocations}</div>
          <div>Mixed Pallets: {mixedCount}</div>
          <div>Low Occupancy: {lowCount}</div>
        </div>
      </div>

      {/* BODY */}
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
                      ${p.needs_merge ? "low" : ""}
                    `}
                    onClick={() => setSelected(p)}
                  >
                    <div className="opt-header">
                      <strong>{p.location_code}</strong>
                      <span>{occupancy}%</span>
                    </div>

                    <div>Cartons: {p.total_cartons}</div>

                    <div className="capacity-row">
                      Capacity:
                      <input
                        type="number"
                        defaultValue={p.max_cartons}
                        onBlur={e =>
                          updateCapacity(p.location_code, e.target.value)
                        }
                      />
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
            <div className="sidebar-occ">
              Occupancy: {selected.occupancy_percent}%
            </div>

            <h4>Products</h4>

            <div className="sidebar-products">
              {selected.items.map((item, idx) => (
                <div key={idx} className="sku-row">
                  <div>{item.product_name}</div>
                  <div>{item.cartons} cartons</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}