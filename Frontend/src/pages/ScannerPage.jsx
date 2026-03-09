import { useState, useRef } from "react";
import BASE_URL from "../api";

export default function ScannerPage() {

  const [form, setForm] = useState({
    sku: "",
    from_location: "",
    to_location: "",
    cartons: 1
  });

  const [message, setMessage] = useState("");

  const fromRef = useRef();
  const skuRef = useRef();
  const qtyRef = useRef();
  const toRef = useRef();


  const moveStock = async () => {

    if (!form.sku || !form.from_location || !form.to_location) {
      setMessage("❌ Missing scan");
      return;
    }

    const res = await fetch(`${BASE_URL}/scanner/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        cartons: Number(form.cartons)
      })
    });

    const data = await res.json();

    if (res.ok) {

      setMessage("✅ Move successful");

      setForm({
        sku: "",
        from_location: "",
        to_location: "",
        cartons: 1
      });

      fromRef.current.focus();

    } else {
      setMessage(`❌ ${data.detail}`);
    }
  };


  const handleKey = (e, next) => {

    if (e.key === "Enter") {
      next.current.focus();
    }

  };


  return (

    <div style={{
      padding: 30,
      maxWidth: 500,
      margin: "auto"
    }}>

      <h2>📦 Scanner Movement</h2>


      {/* FROM LOCATION */}

      <label>FROM LOCATION</label>

      <input
        ref={fromRef}
        placeholder="Scan FROM location"
        value={form.from_location}
        onChange={e =>
          setForm({ ...form, from_location: e.target.value })
        }
        onKeyDown={(e)=>handleKey(e, skuRef)}
        style={inputStyle}
      />


      {/* SKU */}

      <label>SKU</label>

      <input
        ref={skuRef}
        placeholder="Scan SKU"
        value={form.sku}
        onChange={e =>
          setForm({ ...form, sku: e.target.value })
        }
        onKeyDown={(e)=>handleKey(e, qtyRef)}
        style={inputStyle}
      />


      {/* CARTONS */}

      <label>CARTONS</label>

      <input
        ref={qtyRef}
        type="number"
        value={form.cartons}
        onChange={e =>
          setForm({ ...form, cartons: e.target.value })
        }
        onKeyDown={(e)=>handleKey(e, toRef)}
        style={inputStyle}
      />


      {/* TO LOCATION */}

      <label>TO LOCATION</label>

      <input
        ref={toRef}
        placeholder="Scan TO location"
        value={form.to_location}
        onChange={e =>
          setForm({ ...form, to_location: e.target.value })
        }
        onKeyDown={(e)=>{
          if(e.key === "Enter"){
            moveStock();
          }
        }}
        style={inputStyle}
      />


      {/* MOVE BUTTON */}

      <button
        onClick={moveStock}
        style={{
          marginTop:20,
          width:"100%",
          padding:18,
          background:"#22c55e",
          border:"none",
          fontWeight:"bold",
          fontSize:18,
          borderRadius:8
        }}
      >
        MOVE STOCK
      </button>


      <p style={{marginTop:20}}>{message}</p>

    </div>

  );

}



const inputStyle = {
  width:"100%",
  padding:16,
  marginTop:6,
  marginBottom:16,
  fontSize:18,
  borderRadius:6,
  border:"1px solid #ccc"
};