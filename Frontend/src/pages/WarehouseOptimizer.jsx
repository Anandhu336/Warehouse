// FULL FINAL REACT VERSION (with cleaned loadLocations)

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

  useEffect(() => {
    fetch(`${BASE_URL}/optimizer/filters`)
      .then(res => res.json())
      .then(data => setAvailableFilters(data || { categories: [], brands: [] }));
  }, []);

  useEffect(() => {
    loadLocations();
  }, [filters]);

  const loadLocations = () => {

    setLoading(true);

    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        params[key] = value;
      }
    });

    const query = new URLSearchParams(params).toString();

    fetch(`${BASE_URL}/optimizer/locations?${query}`)
      .then(res => res.json())
      .then(data => {
        setLocations(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

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
      .then(data => setFlavours(data.flavours || []));
  }, [filters.brand, filters.category]);

  const updateGroupCapacity = async () => {

    if (!selected || !groupCapacity) return;

    await fetch(`${BASE_URL}/optimizer/set-group-capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: selected?.items?.[0]?.brand,
        category: selected?.items?.[0]?.category,
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

  return (
    <div className="dashboard-wrapper">

      {/* FILTERS */}
      <div className="filter-row">

        <select value={filters.aisle}
          onChange={e => setFilters({ ...filters, aisle: e.target.value })}>
          <option value="ALL">All Aisles</option>
          {["P","Q","R","S","T"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value, flavour: "" })}>
          <option value="">All Categories</option>
          {availableFilters.categories.map((c,i)=>
            <option key={i} value={c}>{c}</option>
          )}
        </select>

        <select value={filters.brand}
          onChange={e => setFilters({ ...filters, brand: e.target.value, flavour: "" })}>
          <option value="">All Brands</option>
          {availableFilters.brands.map((b,i)=>
            <option key={i} value={b}>{b}</option>
          )}
        </select>

        <select value={filters.flavour}
          onChange={e => setFilters({ ...filters, flavour: e.target.value })}>
          <option value="">All Flavours</option>
          {flavours.map((f,i)=>
            <option key={i} value={f}>{f}</option>
          )}
        </select>

        <input
          type="text"
          placeholder="Search SKU, Product or Location"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />

        <select value={filters.pallet_type}
          onChange={e => setFilters({ ...filters, pallet_type: e.target.value })}>
          <option value="">All Pallets</option>
          <option value="single">Single SKU</option>
          <option value="mixed">Mixed</option>
        </select>

      </div>

      {/* GRID */}
      <div className="card-grid">
        {locations.map((p,i)=>(
          <div key={i}
            className="optimizer-card"
            onClick={()=>setSelected(p)}>

            <strong>{p.location_code}</strong>
            <div>{p.occupancy_percent}%</div>
            <div>Cartons: {p.total_cartons}</div>
            <div>
              Capacity: {p.max_cartons}
              {p.capacity_source==="location-override" && " (Manual)"}
              {p.capacity_source==="group-override" && " (Group)"}
            </div>
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      {selected && (
        <div className="dashboard-sidebar">

          <h3>{selected.location_code}</h3>

          {selected.items.map((item,i)=>(
            <div key={i}>
              {item.product_name} — {item.cartons}
            </div>
          ))}

          <h4>Set Capacity For This Pallet</h4>
          <input type="number"
            value={locationCapacity}
            onChange={e=>setLocationCapacity(e.target.value)} />
          <button onClick={updateLocationCapacity}>Update</button>

          <h4>Set Capacity For Brand</h4>
          <input type="number"
            value={groupCapacity}
            onChange={e=>setGroupCapacity(e.target.value)} />
          <button onClick={updateGroupCapacity}>Update</button>

        </div>
      )}

    </div>
  );
}