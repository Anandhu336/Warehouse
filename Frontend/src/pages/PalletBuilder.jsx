import { useState, useRef } from "react";
import BASE_URL from "../api";

export default function PalletBuilder() {

  const [pallet, setPallet] = useState(null);
  const [sku, setSku] = useState("");
  const [cartons, setCartons] = useState(1);
  const [items, setItems] = useState([]);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const skuRef = useRef();
  const qtyRef = useRef();
  const locationRef = useRef();

  const createPallet = async () => {

    try {

      const res = await fetch(`${BASE_URL}/pallet/create`, {
        method: "POST"
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ Failed to create pallet");
        return;
      }

      setPallet(data.pallet_id);
      setMessage(`✅ Pallet created: ${data.pallet_id}`);

      load(data.pallet_id);

      setTimeout(() => {
        skuRef.current?.focus();
      }, 100);

    } catch {
      setMessage("❌ Backend connection failed");
    }

  };


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


  const addItem = async () => {

    if (!pallet) {
      setMessage("❌ Create pallet first");
      return;
    }

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
          sku: sku.trim(),
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

      setTimeout(() => {
        skuRef.current?.focus();
      }, 100);

    } catch {
      setMessage("❌ Failed to add item");
    }

  };


  const verifyPallet = async () => {

    if (!pallet) return;

    await fetch(`${BASE_URL}/pallet/verify/${pallet}`, {
      method: "POST"
    });

    setMessage("✅ Pallet verified");

    setTimeout(() => {
      locationRef.current?.focus();
    }, 100);

  };


  const movePallet = async () => {

    if (!pallet) {
      setMessage("❌ Create pallet first");
      return;
    }

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

      <h2 style={{ marginBottom: 20 }}>📦 Pallet Builder</h2>

      {!pallet && (
        <button style={btnPrimary} onClick={createPallet}>
          Create Pallet
        </button>
      )}

      {pallet && (

        <>
          <div style={palletCard}>
            Pallet: {pallet}
          </div>

          <input
            ref={skuRef}
            style={input}
            placeholder="Scan SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") qtyRef.current?.focus();
            }}
          />

          <input
            ref={qtyRef}
            style={input}
            type="number"
            value={cartons}
            onChange={(e) => setCartons(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />

          <button style={btnPrimary} onClick={addItem}>
            Add Item
          </button>

          <hr style={divider} />

          <div style={{ marginBottom: 10, fontWeight: "bold" }}>
            Items ({items.length})
          </div>

          {items.map((i, index) => (

            <div key={index} style={row}>

              <div>
                <div style={{ fontWeight: 600 }}>
                  {i.product_name}
                </div>

                <div style={skuLabel}>
                  SKU: {i.sku}
                </div>
              </div>

              <div style={{ fontWeight: 700 }}>
                {i.cartons} cartons
              </div>

            </div>

          ))}

          <hr style={divider} />

          <button style={btnPrimary} onClick={verifyPallet}>
            Verify Pallet
          </button>

          <input
            ref={locationRef}
            style={input}
            placeholder="Scan Destination Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") movePallet();
            }}
          />

          <button style={btnPrimary} onClick={movePallet}>
            Move Pallet
          </button>

          <div style={messageBox}>
            {message}
          </div>

        </>

      )}

    </div>

  );

}


// =============================
// STYLES
// =============================

const wrapper = {
  padding: 40,
  maxWidth: 600,
  margin: "auto",
  color: "white"
};

const palletCard = {
  background: "#334155",
  padding: 14,
  borderRadius: 8,
  marginBottom: 20,
  fontWeight: "bold"
};

const input = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white"
};

const btnPrimary = {
  padding: "12px 18px",
  background: "#22c55e",
  border: "none",
  borderRadius: 6,
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: 10
};

const divider = {
  border: "1px solid #334155",
  margin: "20px 0"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  background: "#1e293b",
  padding: 12,
  borderRadius: 6,
  marginBottom: 8
};

const skuLabel = {
  fontSize: 12,
  opacity: 0.7
};

const messageBox = {
  marginTop: 15
};