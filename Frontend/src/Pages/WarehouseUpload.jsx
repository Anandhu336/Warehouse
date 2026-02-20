import { useState, useEffect } from "react";
import BASE_URL from "../api";

export default function WarehouseUpload() {
  const [productFile, setProductFile] = useState(null);
  const [locationFile, setLocationFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  // ----------------------------------
  // LOAD UPLOAD HISTORY
  // ----------------------------------
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/upload/history`);

      if (!res.ok) {
        console.warn("History fetch failed");
        return;
      }

      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History error:", err);
      setHistory([]);
    }
  };

  // ----------------------------------
  // HANDLE UPLOAD
  // ----------------------------------
  const handleUpload = async () => {
    if (!productFile || !locationFile) {
      setError("Please upload both Product and Location files");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("products_file", productFile);
    formData.append("location_file", locationFile);

    try {
      const res = await fetch(
        `${BASE_URL}/upload/warehouse-data`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const data = await res.json();

      setReport({
        product_rows: data.products_loaded || 0,
        location_rows: data.locations_loaded || 0,
        new_products: data.new_products || 0,
        updated_products: data.updated_products || 0,
      });

      // Refresh history after successful upload
      fetchHistory();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-wrapper">
      <h2 className="upload-title">Warehouse Data Upload</h2>

      <p className="upload-subtitle">
        Upload Product Master & Location Stock CSV to auto-update the system
      </p>

      {/* ========================= */}
      {/* UPLOAD SECTION */}
      {/* ========================= */}

      <div className="upload-grid">
        <div className="upload-box">
          <h4>Product Master File</h4>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setProductFile(e.target.files[0])}
          />
          <span>{productFile?.name || "No file selected"}</span>
        </div>

        <div className="upload-box">
          <h4>Location Stock File</h4>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setLocationFile(e.target.files[0])}
          />
          <span>{locationFile?.name || "No file selected"}</span>
        </div>
      </div>

      <button
        className="upload-btn"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? "Processing..." : "Upload & Process"}
      </button>

      {error && <p className="upload-error">{error}</p>}

      {/* ========================= */}
      {/* VALIDATION REPORT */}
      {/* ========================= */}

      {report && (
        <div className="report-card">
          <h3>Upload Summary</h3>

          <div className="report-grid">
            <div className="report-item">
              <span>Total Products</span>
              <strong>{report.product_rows}</strong>
            </div>

            <div className="report-item">
              <span>Total Locations</span>
              <strong>{report.location_rows}</strong>
            </div>

            <div className="report-item green">
              <span>New Products</span>
              <strong>{report.new_products}</strong>
            </div>

            <div className="report-item yellow">
              <span>Updated Products</span>
              <strong>{report.updated_products}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* HISTORY TABLE */}
      {/* ========================= */}

      {history.length > 0 && (
        <div className="history-card">
          <h3>Recent Uploads</h3>

          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Products</th>
                <th>Locations</th>
                <th>New</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td>
                    {h.upload_time
                      ? new Date(h.upload_time).toLocaleString()
                      : "-"}
                  </td>
                  <td>{h.product_rows || 0}</td>
                  <td>{h.location_rows || 0}</td>
                  <td>{h.new_products || 0}</td>
                  <td>{h.updated_products || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}