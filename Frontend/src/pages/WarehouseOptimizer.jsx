import { useEffect, useState } from "react";
import BASE_URL from "../api";

export default function WarehouseOptimizer() {

  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    aisle: "ALL",
    rack: [],
    shelf: [],
    category: [],
    brand: [],
    flavour: [],
    search: "",
    pallet_type: "",
    empty: "",
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
      .then(data => setAvailableFilters(data || { categories: [], brands: [] }));
  }, []);

  // =========================
  // LOAD LOCATIONS
  // =========================
  useEffect(() => {
    loadLocations();
  }, [filters]);

  const loadLocations = () => {

    setLoading(true);

    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {

      if (!value || value === "ALL") return;

      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.append(key, value);
      }

    });

    fetch(`${BASE_URL}/optimizer/locations?${params.toString()}`)
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
  // BRAND → FLAVOUR
  // =========================
  useEffect(() => {

    if (filters.brand.length === 0 && filters.category.length === 0) {
      setFlavours([]);
      return;
    }

    const params = new URLSearchParams();

    filters.brand.forEach(b => params.append("brand", b));
    filters.category.forEach(c => params.append("category", c));

    fetch(`${BASE_URL}/optimizer/flavours?${params.toString()}`)
      .then(res => res.json())
      .then(data => setFlavours(data.flavours || []));

  }, [filters.brand, filters.category]);

  // =========================
  // MULTI SELECT HANDLER
  // =========================
  const handleMultiSelect = (e, key) => {

    const values = Array.from(e.target.selectedOptions, option => option.value);

    setFilters({
      ...filters,
      [key]: values
    });

  };

  // =========================
  // UPDATE CAPACITY
  // =========================
  const updateGroupCapacity = async () => {

    if (!selected || !groupCapacity) return;

    await fetch(`${BASE_URL}/optimizer/set-group-capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: selected.items?.[0]?.brand,
        category: selected.items?.[0]?.category,
        max_cartons: Number(groupCapacity)
      }),
    });

    setGroupCapacity("");
    loadLocations();

  };

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

      <div className="dashboard-header">

        <div className="filter-row">

          {/* AISLE */}
          <select
            value={filters.aisle}
            onChange={e => setFilters({ ...filters, aisle: e.target.value })}
          >
            <option value="ALL">All Aisles</option>
            {["P","Q","R","S","T"].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* RACK MULTI */}
          <select
            multiple
            value={filters.rack}
            onChange={(e)=>handleMultiSelect(e,"rack")}
          >
            {[1,2,3,4,5,6,7,8,9].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* SHELF MULTI */}
          <select
            multiple
            value={filters.shelf}
            onChange={(e)=>handleMultiSelect(e,"shelf")}
          >
            {["A","B","C","D"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* CATEGORY MULTI */}
          <select
            multiple
            value={filters.category}
            onChange={(e)=>handleMultiSelect(e,"category")}
          >
            {availableFilters.categories.map((c,i)=>(
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          {/* BRAND MULTI */}
          <select
            multiple
            value={filters.brand}
            onChange={(e)=>handleMultiSelect(e,"brand")}
          >
            {availableFilters.brands.map((b,i)=>(
              <option key={i} value={b}>{b}</option>
            ))}
          </select>

          {/* FLAVOUR MULTI */}
          <select
            multiple
            value={filters.flavour}
            onChange={(e)=>handleMultiSelect(e,"flavour")}
          >
            {flavours.map((f,i)=>(
              <option key={i} value={f}>{f}</option>
            ))}
          </select>

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search SKU, Product or Location"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />

          {/* PALLET TYPE */}
          <select
            value={filters.pallet_type}
            onChange={e => setFilters({ ...filters, pallet_type: e.target.value })}
          >
            <option value="">All Pallets</option>
            <option value="single">Single SKU</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* EMPTY FILTER */}
          <select
            value={filters.empty}
            onChange={e => setFilters({ ...filters, empty: e.target.value })}
          >
            <option value="">All Locations</option>
            <option value="true">Empty Locations</option>
            <option value="false">Occupied Locations</option>
          </select>

        </div>

        <div className="dashboard-stats">
          <div>Total Locations: {totalLocations}</div>
          <div>Mixed Pallets: {mixedCount}</div>
          <div>Low Occupancy: {lowCount}</div>
        </div>

      </div>

      <div className="dashboard-body">

        <div className="dashboard-grid">

          {loading ? (
            <p>Loading...</p>
          ) : locations.length === 0 ? (
            <p>No data found</p>
          ) : (

            <div className="card-grid">

              {locations.map((p,i)=>{

                const occupancy = p.occupancy_percent || 0;

                return (
                  <div
                    key={i}
                    className={`optimizer-card 
                      ${p.is_mixed ? "mixed" : ""} 
                      ${p.needs_merge ? "low" : ""}
                      ${p.is_empty ? "empty" : ""}`}
                    onClick={()=>setSelected(p)}
                  >

                    <div className="opt-header">
                      <strong>{p.location_code}</strong>
                      <span>{occupancy}%</span>
                    </div>

                    <div>Cartons: {p.total_cartons}</div>

                    {p.is_empty && (
                      <div className="flag blue">Empty Location</div>
                    )}

                    <div>
                      Capacity: {p.max_cartons}
                      {p.capacity_source==="location-override" && " (Manual)"}
                      {p.capacity_source==="group-override" && " (Brand Override)"}
                      {p.capacity_source==="default" && " (Default 30)"}
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

      </div>

    </div>
  );
}