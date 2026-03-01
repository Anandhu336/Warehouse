import { useState, useEffect } from "react";
import BASE_URL from "../api";

export default function WarehouseUpload() {

  const [productFile, setProductFile] = useState(null);
  const [locationFile, setLocationFile] = useState(null);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  // =========================
  // LOAD HISTORY
  // =========================
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/upload/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  // =========================
  // UPLOAD PRODUCTS
  // =========================
  const uploadProducts = async () => {

    if (!productFile) {
      setError("Please select Product Master file");
      return;
    }

    setLoadingProducts(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("products_file", productFile);

    try {
      const res = await fetch(`${BASE_URL}/upload/products`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();

      setReport({
        message: data.status,
        rows: data.rows
      });

      fetchHistory();
    } catch (err) {
      setError("Product upload failed");
    } finally {
      setLoadingProducts(false);
    }
  };

  // =========================
  // UPLOAD LOCATION STOCK
  // =========================
  const uploadLocation = async () => {

    if (!locationFile) {
      setError("Please select Location Stock file");
      return;
    }

    setLoadingLocation(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("location_file", locationFile);

    try {
      const res = await fetch(`${BASE_URL}/upload/location-stock`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();

      setReport({
        message: data.status,
        rows: data.rows
      });

      fetchHistory();
    } catch {
      setError("Location upload failed");
    } finally {
      setLoadingLocation(false);
    }
  };

  // =========================
  // DELETE ONE HISTORY ROW
  // =========================
  const deleteHistory = async (id) => {
    await fetch(`${BASE_URL}/upload/history/${id}`, {
      method: "DELETE",
    });
    fetchHistory();
  };

  // =========================
  // CLEAR ALL HISTORY
  // =========================
  const clearHistory = async () => {
    await fetch(`${BASE_URL}/upload/history`, {
      method: "DELETE",
    });
    fetchHistory();
  };

  return (
    <div className="upload-wrapper">

      <h2>Warehouse Upload Center</h2>

      {/* ================= PRODUCT UPLOAD ================= */}
      <div className="upload-box">
        <h4>Upload Product Master</h4>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setProductFile(e.target.files[0])}
        />

        <button
          onClick={uploadProducts}
          disabled={loadingProducts}
        >
          {loadingProducts ? "Uploading..." : "Upload Products"}
        </button>
      </div>

      {/* ================= LOCATION UPLOAD ================= */}
      <div className="upload-box">
        <h4>Upload Location Stock</h4>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setLocationFile(e.target.files[0])}
        />

        <button
          onClick={uploadLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? "Uploading..." : "Upload Location"}
        </button>
      </div>

      {/* ================= REPORT ================= */}
      {report && (
        <div className="report-card">
          <strong>{report.message}</strong>
          <div>Rows Processed: {report.rows}</div>
        </div>
      )}

      {error && <div className="upload-error">{error}</div>}

      {/* ================= HISTORY ================= */}
      {history.length > 0 && (
        <div className="history-card">

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>Upload History</h3>
            <button onClick={clearHistory} className="danger-btn">
              Clear All
            </button>
          </div>

          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Products</th>
                <th>Locations</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    {new Date(h.upload_time).toLocaleString()}
                  </td>
                  <td>{h.product_rows || 0}</td>
                  <td>{h.location_rows || 0}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => deleteHistory(h.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}
    </div>
  );
}