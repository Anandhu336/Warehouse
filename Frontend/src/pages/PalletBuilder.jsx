import { useState } from "react";
import BASE_URL from "../api";

export default function PalletBuilder() {

  const [pallet, setPallet] = useState(null);
  const [sku, setSku] = useState("");
  const [cartons, setCartons] = useState(1);
  const [items, setItems] = useState([]);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");


  // -----------------------------
  // CREATE PALLET
  // -----------------------------
  const createPallet = async () => {

    try {

      const res = await fetch(`${BASE_URL}/pallet/create`, {
        method: "POST"
      });

      const data = await res.json();

      setPallet(data.pallet_id);
      setMessage(`Pallet created: ${data.pallet_id}`);

      load(data.pallet_id);

    } catch (err) {
      setMessage("❌ Failed to create pallet");
    }

  };


  // -----------------------------
  // LOAD PALLET ITEMS
  // -----------------------------
  const load = async (pid) => {

    if (!pid) return;

    try {

      const res = await fetch(`${BASE_URL}/pallet/${pid}`);
      const data = await res.json();

      setItems(data.items || []);

    } catch {
      setMessage("❌ Failed to load pallet");
    }

  };


  // -----------------------------
  // ADD SKU TO PALLET
  // -----------------------------
  const addItem = async () => {

    if (!sku) {
      setMessage("❌ Scan SKU first");
      return;
    }

    try {

      const res = await fetch(`${BASE_URL}/pallet/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pallet_id: pallet,
          sku: sku,
          cartons: Number(cartons)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data.detail}`);
        return;
      }

      setSku("");
      setCartons(1);

      load(pallet);

    } catch {
      setMessage("❌ Failed to add item");
    }

  };


  // -----------------------------
  // VERIFY PALLET
  // -----------------------------
  const verifyPallet = async () => {

    await fetch(`${BASE_URL}/pallet/verify/${pallet}`, {
      method: "POST"
    });

    setMessage("✅ Pallet verified");

  };


  // -----------------------------
  // MOVE PALLET
  // -----------------------------
  const movePallet = async () => {

    if (!location) {
      setMessage("❌ Scan destination location");
      return;
    }

    await fetch(`${BASE_URL}/pallet/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pallet_id: pallet,
        location: location
      })
    });

    setMessage("✅ Pallet moved");

    setLocation("");

  };


  return (

    <div style={wrapper}>

      <h2>📦 Pallet Builder</h2>


      {!pallet && (
        <button style={btn} onClick={createPallet}>
          Create Pallet
        </button>
      )}


      {pallet && (

        <>
          <h3>Pallet: {pallet}</h3>


          {/* SKU SCAN */}

          <input
            style={input}
            placeholder="Scan SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />


          {/* CARTONS */}

          <input
            style={input}
            type="number"
            value={cartons}
            onChange={(e) => setCartons(e.target.value)}
          />


          <button style={btn} onClick={addItem}>
            Add Item
          </button>


          <hr />


          {/* PALLET ITEMS */}

          {items.map((i, index) => (

            <div key={index} style={row}>
              <div>{i.product_name}</div>
              <div>{i.cartons} cartons</div>
            </div>

          ))}


          <hr />


          {/* VERIFY */}

          <button style={btn} onClick={verifyPallet}>
            Verify Pallet
          </button>


          {/* MOVE */}

          <input
            style={input}
            placeholder="Scan Destination Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />


          <button style={btn} onClick={movePallet}>
            Move Pallet
          </button>


          <p style={{ marginTop: 20 }}>{message}</p>

        </>

      )}

    </div>

  );

}


// -----------------------------
// STYLES
// -----------------------------

const wrapper = {
  padding: 40,
  maxWidth: 600,
  margin: "auto"
};

const input = {
  width: "100%",
  padding: 14,
  marginTop: 10,
  marginBottom: 10,
  fontSize: 18
};

const btn = {
  padding: 16,
  background: "#22c55e",
  border: "none",
  marginTop: 10,
  fontWeight: "bold",
  cursor: "pointer"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: 10,
  background: "#f1f1f1",
  marginTop: 5
};