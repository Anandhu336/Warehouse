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


  // =========================
  // CREATE PALLET
  // =========================

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
        skuRef.current.focus();
      }, 100);

    } catch {
      setMessage("❌ Backend connection failed");
    }

  };


  // =========================
  // LOAD PALLET ITEMS
  // =========================

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


  // =========================
  // ADD ITEM
  // =========================

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
        skuRef.current.focus();
      }, 100);

    } catch {
      setMessage("❌ Failed to add item");
    }

  };


  // =========================
  // VERIFY PALLET
  // =========================

  const verifyPallet = async () => {

    await fetch(`${BASE_URL}/pallet/verify/${pallet}`, {
      method: "POST"
    });

    setMessage("✅ Pallet verified");

    setTimeout(() => {
      locationRef.current.focus();
    }, 100);

  };


  // =========================
  // MOVE PALLET
  // =========================

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

      <h2 style={{marginBottom:20}}>📦 Pallet Builder</h2>


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


          {/* SKU SCAN */}

          <input
            ref={skuRef}
            style={input}
            placeholder="Scan SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e)=>{
              if(e.key==="Enter"){
                qtyRef.current.focus();
              }
            }}
          />


          {/* CARTONS */}

          <input
            ref={qtyRef}
            style={input}
            type="number"
            value={cartons}
            onChange={(e) => setCartons(e.target.value)}
            onKeyDown={(e)=>{
              if(e.key==="Enter"){
                addItem();
              }
            }}
          />


          <button style={btnPrimary} onClick={addItem}>
            Add Item
          </button>


          <hr style={divider} />


          {/* PALLET ITEMS */}

          <div style={{marginBottom:10,fontWeight:"bold"}}>
            Items ({items.length})
          </div>

          {items.map((i, index) => (

            <div key={index} style={row}>

              <div>
                <div style={{fontWeight:600}}>
                  {i.product_name}
                </div>

                <div style={skuLabel}>
                  SKU: {i.sku}
                </div>
              </div>

              <div style={{fontWeight:700}}>
                {i.cartons} cartons
              </div>

            </div>

          ))}


          <hr style={divider} />


          {/* VERIFY */}

          <button style={btnPrimary} onClick={verifyPallet}>
            Verify Pallet
          </button>


          {/* MOVE */}

          <input
            ref={locationRef}
            style={input}
            placeholder="Scan Destination Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e)=>{
              if(e.key==="Enter"){
                movePallet();
              }
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


// =========================
// STYLES
// =========================

const wrapper = {
  padding: 40,
  maxWidth: 650,
  margin: "auto",
  color: "white"
};

const palletCard = {
  background:"#1e293b",
  padding:"14px 18px",
  borderRadius:6,
  fontSize:20,
  marginBottom:20,
  fontWeight:"bold"
};

const input = {
  width:"100%",
  padding:16,
  marginTop:10,
  marginBottom:10,
  fontSize:18,
  borderRadius:6,
  border:"1px solid #334155",
  background:"#0f172a",
  color:"white"
};

const btnPrimary = {
  padding:"14px 20px",
  background:"#22c55e",
  border:"none",
  marginTop:10,
  fontWeight:"bold",
  cursor:"pointer",
  borderRadius:6
};

const divider = {
  border:"none",
  borderTop:"1px solid #334155",
  margin:"20px 0"
};

const row = {
  display:"flex",
  justifyContent:"space-between",
  padding:"12px 16px",
  background:"#1e293b",
  border:"1px solid #334155",
  borderRadius:6,
  marginTop:8
};

const skuLabel = {
  fontSize:12,
  opacity:0.7
};

const messageBox = {
  marginTop:20,
  fontWeight:"bold"
};