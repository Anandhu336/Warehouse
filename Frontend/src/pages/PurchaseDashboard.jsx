import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import BASE_URL from "../api";

export default function PurchaseDashboard() {
  const [salesFile, setSalesFile] = useState(null);
  const [stockFile, setStockFile] = useState(null);
  const [supplierFile, setSupplierFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState(5000);

  const handleAnalyze = async () => {
    if (!salesFile || !stockFile || !supplierFile) {
      alert("Please upload all three files");
      return;
    }

    const formData = new FormData();
    formData.append("sales_file", salesFile);
    formData.append("stock_file", stockFile);
    formData.append("supplier_file", supplierFile);

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/purchase/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Analysis failed");
        setLoading(false);
        return;
      }

      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  const totalCapital = results.reduce(
    (sum, r) => sum + Number(r.capital_required || 0),
    0
  );

  const urgentCount = results.filter(r => r.status === "URGENT").length;
  const orderSoonCount = results.filter(r => r.status === "ORDER_SOON").length;
  const safeCount = results.filter(r => r.status === "SAFE").length;

  const avgDaysCover =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + Number(r.days_cover || 0), 0) /
          results.length
        ).toFixed(1)
      : 0;

  return (
    <div style={container}>
      <h1>Purchase Intelligence Dashboard</h1>
      <p style={{ opacity: 0.6 }}>
        Advanced purchasing control & capital optimisation
      </p>

      <div style={uploadBox}>
        <input type="file" onChange={e => setSalesFile(e.target.files[0])} />
        <input type="file" onChange={e => setStockFile(e.target.files[0])} />
        <input type="file" onChange={e => setSupplierFile(e.target.files[0])} />
        <button onClick={handleAnalyze} style={btn}>
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div style={kpiRow}>
            <KPI title="Total Capital Required" value={`£${totalCapital.toLocaleString()}`} />
            <KPI title="Urgent SKUs" value={urgentCount} highlight="red" />
            <KPI title="Order Soon" value={orderSoonCount} highlight="yellow" />
            <KPI title="Avg Days Cover" value={avgDaysCover} />
          </div>
        </>
      )}
    </div>
  );
}

const KPI = ({ title, value, highlight }) => {
  let bg = "#111827";
  if (highlight === "red") bg = "#7f1d1d";
  if (highlight === "yellow") bg = "#78350f";

  return (
    <div style={{ ...card, background: bg }}>
      <h3>{title}</h3>
      <p style={{ fontSize: 24, fontWeight: 600 }}>{value}</p>
    </div>
  );
};

const container = {
  padding: 32,
  background: "#0b0f1a",
  minHeight: "100vh",
  color: "#fff",
};

const uploadBox = {
  display: "flex",
  gap: 12,
  marginTop: 20,
  alignItems: "center",
  flexWrap: "wrap",
};

const btn = {
  padding: "10px 18px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const kpiRow = {
  display: "flex",
  gap: 20,
  marginTop: 30,
  flexWrap: "wrap",
};

const card = {
  padding: 20,
  borderRadius: 12,
  minWidth: 220,
};