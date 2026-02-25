import { useState } from "react";
import BASE_URL from "../api";

export default function ScannerPage() {
  const [form, setForm] = useState({
    sku: "",
    from_location: "",
    to_location: "",
    cartons: 1,
  });

  const [message, setMessage] = useState("");

  const moveStock = async () => {
    const res = await fetch(`${BASE_URL}/scanner/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage("✅ Move successful");
      setForm({
        sku: "",
        from_location: "",
        to_location: "",
        cartons: 1,
      });
    } else {
      setMessage(`❌ ${data.detail}`);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Scanner Movement</h2>

      <input
        placeholder="Scan FROM location"
        value={form.from_location}
        onChange={e => setForm({ ...form, from_location: e.target.value })}
      />

      <br /><br />

      <input
        placeholder="Scan SKU"
        value={form.sku}
        onChange={e => setForm({ ...form, sku: e.target.value })}
      />

      <br /><br />

      <input
        type="number"
        placeholder="Cartons"
        value={form.cartons}
        onChange={e => setForm({ ...form, cartons: e.target.value })}
      />

      <br /><br />

      <input
        placeholder="Scan TO location"
        value={form.to_location}
        onChange={e => setForm({ ...form, to_location: e.target.value })}
      />

      <br /><br />

      <button onClick={moveStock}>MOVE STOCK</button>

      <p>{message}</p>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <div style={{ padding: 40 }}>
      <h2>Scanner Page Working</h2>
    </div>
  );
}