import { useEffect, useState } from "react";
import Select from "react-select";
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
  // REACT SELECT DARK STYLE
  // =========================
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      color: "white",
      minWidth: 180
    }),
    menu: (base) => ({
      ...base,
      color: "black"
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#e5e7eb"
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "black"
    }),
  };


  // =========================
  // LOAD FILTER OPTIONS
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
  // CLEAR FILTERS
  // =========================
  const clearFilters = () => {

    setFilters({
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

  };


  const totalLocations = locations.length;
  const mixedCount = locations.filter(l => l.is_mixed).length;
  const lowCount = locations.filter(l => l.needs_merge).length;


  return (

    <div className="dashboard-wrapper">

      {/* HEADER */}

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


          {/* RACK */}
          <Select
            styles={selectStyles}
            isMulti
            placeholder="Rack"
            options={[1,2,3,4,5,6,7,8,9].map(r => ({
              value: r,
              label: `Rack ${r}`
            }))}
            value={filters.rack.map(r => ({ value:r, label:`Rack ${r}` }))}
            onChange={(selected)=>
              setFilters({
                ...filters,
                rack: selected ? selected.map(s=>s.value) : []
              })
            }
          />


          {/* SHELF */}
          <Select
            styles={selectStyles}
            isMulti
            placeholder="Shelf"
            options={["A","B","C","D"].map(s => ({
              value:s,
              label:`Shelf ${s}`
            }))}
            value={filters.shelf.map(s=>({value:s,label:`Shelf ${s}`}))}
            onChange={(selected)=>
              setFilters({
                ...filters,
                shelf: selected ? selected.map(s=>s.value) : []
              })
            }
          />


          {/* CATEGORY */}
          <Select
            styles={selectStyles}
            isMulti
            placeholder="Category"
            options={availableFilters.categories.map(c=>({value:c,label:c}))}
            value={filters.category.map(c=>({value:c,label:c}))}
            onChange={(selected)=>
              setFilters({
                ...filters,
                category: selected ? selected.map(s=>s.value) : []
              })
            }
          />


          {/* BRAND */}
          <Select
            styles={selectStyles}
            isMulti
            placeholder="Brand"
            options={availableFilters.brands.map(b=>({value:b,label:b}))}
            value={filters.brand.map(b=>({value:b,label:b}))}
            onChange={(selected)=>
              setFilters({
                ...filters,
                brand: selected ? selected.map(s=>s.value) : []
              })
            }
          />


          {/* FLAVOUR */}
          <Select
            styles={selectStyles}
            isMulti
            placeholder="Flavour"
            options={flavours.map(f=>({value:f,label:f}))}
            value={filters.flavour.map(f=>({value:f,label:f}))}
            onChange={(selected)=>
              setFilters({
                ...filters,
                flavour: selected ? selected.map(s=>s.value) : []
              })
            }
          />


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


          {/* EMPTY */}
          <select
            value={filters.empty}
            onChange={e => setFilters({ ...filters, empty: e.target.value })}
          >
            <option value="">All Locations</option>
            <option value="true">Empty</option>
            <option value="false">Occupied</option>
          </select>


          {/* CLEAR FILTERS */}
          <button onClick={clearFilters} className="clear-btn">
            Clear Filters
          </button>

        </div>


        {/* STATS */}

        <div className="dashboard-stats">
          <div>Total Locations: {totalLocations}</div>
          <div>Mixed Pallets: {mixedCount}</div>
          <div>Low Occupancy: {lowCount}</div>
        </div>

      </div>


      {/* BODY */}

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

                    <div>Capacity: {p.max_cartons}</div>

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

            <button
              onClick={() => setSelected(null)}
              className="close-btn"
            >
              ✕
            </button>

            <h3>{selected.location_code}</h3>

            <div>Occupancy: {selected.occupancy_percent}%</div>

            <h4>Products</h4>

            {selected.items?.map((item,i)=>(
              <div key={i} className="sku-row">
                <div>{item.product_name}</div>
                <div>{item.cartons} cartons</div>
              </div>
            ))}

          </div>
        )}

      </div>

    </div>

  );

}