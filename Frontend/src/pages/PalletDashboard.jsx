import { useEffect, useState } from "react";
import BASE_URL from "../api";

export default function PalletDashboard() {

  const [pallets, setPallets] = useState([]);
  const [loading, setLoading] = useState(true);


  // =============================
  // LOAD DASHBOARD DATA
  // =============================

  const load = async () => {

    try {

      const res = await fetch(`${BASE_URL}/pallet/dashboard`);
      const data = await res.json();

      // Ensure we always store an array
      if (Array.isArray(data)) {
        setPallets(data);
      } else if (Array.isArray(data.pallets)) {
        setPallets(data.pallets);
      } else {
        setPallets([]);
      }

    } catch (err) {

      console.error("Dashboard load failed", err);
      setPallets([]);

    } finally {

      setLoading(false);

    }

  };


  // =============================
  // AUTO REFRESH
  // =============================

  useEffect(() => {

    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);

  }, []);


  return (

    <div style={wrapper}>

      <h2 style={{ marginBottom: 20 }}>📦 Pallet Dashboard</h2>

      {loading && <div>Loading pallets...</div>}

      {!loading && pallets.length === 0 && (
        <div>No pallets currently active</div>
      )}

      {pallets.map((p, index) => (

        <div key={index} style={card}>

          <div style={header}>
            {p.pallet_id}
          </div>

          <div style={statusRow}>
            Status: 
            <span style={statusColor(p.status)}>
              {p.status}
            </span>
          </div>

          <div>SKUs: {p.total_skus}</div>

          <div>Cartons: {p.total_cartons}</div>

        </div>

      ))}

    </div>

  );

}


// =============================
// STYLES
// =============================

const wrapper = {
  padding: 40,
  maxWidth: 900,
  margin: "auto",
  color: "white"
};

const card = {
  background: "#1e293b",
  padding: 20,
  marginTop: 12,
  borderRadius: 8,
  border: "1px solid #334155"
};

const header = {
  fontWeight: "bold",
  fontSize: 18,
  marginBottom: 6
};

const statusRow = {
  marginBottom: 6
};


// =============================
// STATUS COLOR
// =============================

function statusColor(status){

  if(status === "building"){
    return { color:"#facc15", marginLeft:6 };
  }

  if(status === "verified"){
    return { color:"#22c55e", marginLeft:6 };
  }

  if(status === "stored"){
    return { color:"#38bdf8", marginLeft:6 };
  }

  return { marginLeft:6 };

}