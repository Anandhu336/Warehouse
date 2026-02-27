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

  useEffect(() => {
    fetch(`${BASE_URL}/optimizer/filters`)
      .then(res => res.json())
      .then(data => setAvailableFilters(data))
  }, []);

  useEffect(() => {
    loadLocations();
  }, [filters]);

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

  const loadLocations = () => {
    setLoading(true);

    const params = { ...filters };
    if (params.aisle === "ALL") delete params.aisle;

    const query = new URLSearchParams(params).toString();

    fetch(`${BASE_URL}/optimizer/locations?${query}`)
      .then(res => res.json())
      .then(data => {
        setLocations(data);
        setLoading(false);
      });
  };

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

  return (
    <div className="dashboard-wrapper">

      <div className="filter-row">

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
          placeholder="Search SKU or Product"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />

      </div>

      <div className="card-grid">
        {locations.map((p,i)=>(
          <div key={i} onClick={()=>setSelected(p)}>
            <strong>{p.location_code}</strong>
            <div>{p.occupancy_percent}%</div>
            <div>Capacity: {p.max_cartons}</div>
          </div>
        ))}
      </div>

      {selected && !selected.is_mixed && (
        <div>
          <h4>
            Set Capacity for {selected.items[0].brand} - {selected.items[0].category}
          </h4>

          <input
            type="number"
            value={groupCapacity}
            onChange={e => setGroupCapacity(e.target.value)}
          />

          <button onClick={updateGroupCapacity}>Update</button>
        </div>
      )}
    </div>
  );
}