import { useState } from "react";
import PrintLabels from "../components/PrintLabels";
import BASE_URL from "../api";

export default function PoLabels() {
  const [file, setFile] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState(false);

  /* ===============================
     UPLOAD PO
  ================================ */
  const uploadPO = async () => {
    if (!file) {
      setError("Please select a CSV");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BASE_URL}/po/labels`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const data = await res.json();
      setLabels(Array.isArray(data.labels) ? data.labels : []);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UPDATE QTY
  ================================ */
  const updateQty = (i, value) => {
    const copy = [...labels];

    const qty = value === "" ? "" : Number(value);
    const units = copy[i].units_per_carton || 1;

    copy[i] = {
      ...copy[i],
      qty_outstanding: qty,
      labels_required: qty === "" ? 0 : Math.ceil(qty / units),
    };

    setLabels(copy);
  };

  /* ===============================
     UPDATE BARCODE
  ================================ */
  const updateBarcode = (i, value) => {
    const copy = [...labels];

    copy[i] = {
      ...copy[i],
      carton_barcode: value.replace(/\D/g, ""),
    };

    setLabels(copy);
  };

  /* ===============================
     PRINT MODE
  ================================ */
  if (printMode) {
    return (
      <PrintLabels
        labels={labels}
        onBack={() => setPrintMode(false)}
      />
    );
  }

  /* ===============================
     UI
  ================================ */
  return (
    <div className="po-page">
      <h2>PO Label Printing</h2>
      <p className="subtitle">
        Upload PO CSV — edit & print labels
      </p>

      <div className="upload-card">
        <input
          type="file"
          accept=".csv"
          onChange={e => setFile(e.target.files[0])}
        />

        <button onClick={uploadPO} disabled={loading}>
          {loading ? "Processing…" : "Upload PO"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {labels.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Labels</th>
                <th>Barcode</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}>
                  <td>{l.sku}</td>
                  <td>{l.product_name}</td>

                  <td>
                    <input
                      type="number"
                      value={l.qty_outstanding}
                      onChange={e =>
                        updateQty(i, e.target.value)
                      }
                    />
                  </td>

                  <td className="labels">
                    {l.labels_required}
                  </td>

                  <td>
                    <input
                      value={l.carton_barcode || ""}
                      onChange={e =>
                        updateBarcode(i, e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="print-btn"
            onClick={() => setPrintMode(true)}
          >
            Print Labels
          </button>
        </div>
      )}
    </div>
  );
}