import { useState, useRef } from "react";
import BASE_URL from "../api";

export default function ScannerPage() {

  const [location, setLocation] = useState("");
  const [locationData, setLocationData] = useState(null);
  const [mode, setMode] = useState(null);
  const [message, setMessage] = useState("");

  const locationRef = useRef();

  const [moveForm, setMoveForm] = useState({
    sku: "",
    to_location: "",
    cartons: 1
  });


  // --------------------------------
  // SCAN LOCATION
  // --------------------------------

  const loadLocation = async () => {

    if (!location) return;

    const res = await fetch(`${BASE_URL}/scanner/location/${location}`);
    const data = await res.json();

    setLocationData(data);
    setMode(null);
  };


  // --------------------------------
  // BULK MOVE
  // --------------------------------

  const moveStock = async () => {

    const res = await fetch(`${BASE_URL}/scanner/move`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        sku: moveForm.sku,
        from_location: location,
        to_location: moveForm.to_location,
        cartons: Number(moveForm.cartons)
      })
    });

    const data = await res.json();

    if(res.ok){

      setMessage("✅ Move successful");

      setMoveForm({
        sku:"",
        to_location:"",
        cartons:1
      });

      loadLocation();

    } else {

      setMessage(`❌ ${data.detail}`);

    }
  };


  // --------------------------------
  // REMOVE STOCK
  // --------------------------------

  const removeStock = async () => {

    const res = await fetch(`${BASE_URL}/scanner/remove`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        sku: moveForm.sku,
        location: location,
        cartons: Number(moveForm.cartons)
      })
    });

    if(res.ok){

      setMessage("✅ Stock removed");
      loadLocation();

    }
  };


  // --------------------------------
  // SWAP LOCATION
  // --------------------------------

  const swapLocation = async () => {

    const res = await fetch(`${BASE_URL}/scanner/swap`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        location_a: location,
        location_b: moveForm.to_location
      })
    });

    if(res.ok){

      setMessage("✅ Locations swapped");

    }
  };


  return (

    <div style={{
      padding:30,
      maxWidth:700,
      margin:"auto"
    }}>

      <h2>📦 Warehouse Scanner</h2>


      {/* LOCATION SCAN */}

      <label>SCAN LOCATION</label>

      <input
        ref={locationRef}
        value={location}
        placeholder="Scan location"
        onChange={(e)=>setLocation(e.target.value)}
        onKeyDown={(e)=>{
          if(e.key==="Enter"){
            loadLocation();
          }
        }}
        style={inputStyle}
      />


      {/* LOCATION CONTENT */}

      {locationData && (

        <div style={{
          background:"#111827",
          padding:20,
          borderRadius:10,
          color:"white",
          marginTop:20
        }}>

          <h3>{locationData.location}</h3>

          <p>
            Total SKUs: {locationData.total_skus} |
            Units: {locationData.total_units}
          </p>


          {/* SKU LIST */}

          {locationData.items.map((item,i)=>(
            <div key={i} style={skuRow}>

              <div>

                <strong>{item.product_name}</strong>

                <div style={{fontSize:12}}>
                  {item.sku}
                </div>

              </div>

              <div>

                {item.cartons} cartons

              </div>

            </div>
          ))}


          {/* ACTION BUTTONS */}

          <div style={{marginTop:20,display:"grid",gap:10}}>

            <button
              style={actionBtn}
              onClick={()=>setMode("bulk")}
            >
              Bulk Move
            </button>

            <button
              style={actionBtn}
              onClick={()=>setMode("swap")}
            >
              Swap Location
            </button>

            <button
              style={actionBtn}
              onClick={()=>setMode("remove")}
            >
              Remove Stock
            </button>

            <button
              style={dangerBtn}
              onClick={()=>setMode("delete")}
            >
              Delete Location
            </button>

          </div>


          {/* MODE PANELS */}

          {mode==="bulk" && (

            <div style={{marginTop:20}}>

              <h4>Bulk Move</h4>

              <input
                placeholder="SKU"
                value={moveForm.sku}
                onChange={(e)=>setMoveForm({...moveForm,sku:e.target.value})}
                style={inputStyle}
              />

              <input
                placeholder="To location"
                value={moveForm.to_location}
                onChange={(e)=>setMoveForm({...moveForm,to_location:e.target.value})}
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Cartons"
                value={moveForm.cartons}
                onChange={(e)=>setMoveForm({...moveForm,cartons:e.target.value})}
                style={inputStyle}
              />

              <button style={actionBtn} onClick={moveStock}>
                MOVE
              </button>

            </div>

          )}


          {mode==="remove" && (

            <div style={{marginTop:20}}>

              <h4>Remove Stock</h4>

              <input
                placeholder="SKU"
                value={moveForm.sku}
                onChange={(e)=>setMoveForm({...moveForm,sku:e.target.value})}
                style={inputStyle}
              />

              <input
                type="number"
                placeholder="Cartons"
                value={moveForm.cartons}
                onChange={(e)=>setMoveForm({...moveForm,cartons:e.target.value})}
                style={inputStyle}
              />

              <button style={actionBtn} onClick={removeStock}>
                REMOVE
              </button>

            </div>

          )}


          {mode==="swap" && (

            <div style={{marginTop:20}}>

              <h4>Swap Location</h4>

              <input
                placeholder="Other location"
                value={moveForm.to_location}
                onChange={(e)=>setMoveForm({...moveForm,to_location:e.target.value})}
                style={inputStyle}
              />

              <button style={actionBtn} onClick={swapLocation}>
                SWAP
              </button>

            </div>

          )}

        </div>

      )}

      <p style={{marginTop:20}}>{message}</p>

    </div>

  );

}


const inputStyle = {
  width:"100%",
  padding:16,
  marginTop:10,
  marginBottom:10,
  fontSize:18,
  borderRadius:6,
  border:"1px solid #ccc"
};

const actionBtn = {
  padding:16,
  background:"#22c55e",
  border:"none",
  borderRadius:8,
  fontWeight:"bold",
  fontSize:16
};

const dangerBtn = {
  padding:16,
  background:"#ef4444",
  border:"none",
  borderRadius:8,
  fontWeight:"bold",
  fontSize:16,
  color:"white"
};

const skuRow = {
  display:"flex",
  justifyContent:"space-between",
  padding:12,
  background:"#1f2937",
  marginTop:8,
  borderRadius:6
};