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

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      alert("Error running analysis");
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

  const deadStock = results.filter(
    r => r.avg_daily_sales === 0 && r.current_stock > 0
  );

  // -----------------------
  // Budget Optimisation
  // -----------------------
  const prioritizedOrders = [...results]
    .filter(r => r.suggested_order > 0)
    .sort((a, b) => {
      if (a.status === "URGENT" && b.status !== "URGENT") return -1;
      if (b.status === "URGENT" && a.status !== "URGENT") return 1;
      return b.capital_required - a.capital_required;
    });

  let remaining = budget;
  const selectedOrders = [];

  for (let item of prioritizedOrders) {
    if (item.capital_required <= remaining) {
      selectedOrders.push(item);
      remaining -= item.capital_required;
    }
  }

  // -----------------------
  // ABC Classification
  // -----------------------
  const abcData = [...results].sort(
    (a, b) => b.capital_required - a.capital_required
  );

  let cumulative = 0;
  abcData.forEach(item => {
    cumulative += item.capital_required;
    const percent =
      totalCapital > 0 ? cumulative / totalCapital : 0;

    if (percent <= 0.7) item.abc = "A";
    else if (percent <= 0.9) item.abc = "B";
    else item.abc = "C";
  });

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
            <KPI title="Dead Stock SKUs" value={deadStock.length} highlight="red" />
            <KPI title="Avg Days Cover" value={avgDaysCover} />
          </div>

          <div style={{ marginTop: 30 }}>
            <h3>Budget Simulation</h3>
            <input
              type="range"
              min="0"
              max={Math.max(totalCapital, 1000)}
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <p>Budget: £{budget.toLocaleString()}</p>

            <div style={kpiRow}>
              <KPI title="SKUs Within Budget" value={selectedOrders.length} />
              <KPI title="Unused Budget" value={`£${remaining.toLocaleString()}`} />
            </div>
          </div>

          <div style={chartBlock}>
            <h2>Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { status: "URGENT", value: urgentCount },
                  { status: "ORDER_SOON", value: orderSoonCount },
                  { status: "SAFE", value: safeCount },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={chartBlock}>
            <h2>Top 10 Capital Impact</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[...results]
                  .sort((a, b) => b.capital_required - a.capital_required)
                  .slice(0, 10)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sku" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="capital_required" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={chartBlock}>
            <h2>ABC Classification</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { type: "A", value: abcData.filter(i => i.abc === "A").length },
                  { type: "B", value: abcData.filter(i => i.abc === "B").length },
                  { type: "C", value: abcData.filter(i => i.abc === "C").length },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#9333ea" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 40 }}>
            <h2>Reorder Recommendations</h2>
            <table style={table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Daily Sales</th>
                  <th>Stock</th>
                  <th>Days Cover</th>
                  <th>Suggested Order</th>
                  <th>Capital</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {prioritizedOrders.map((r, i) => (
                  <tr key={i} style={rowStyle(r.status)}>
                    <td>{r.sku}</td>
                    <td>{Number(r.avg_daily_sales).toFixed(1)}</td>
                    <td>{r.current_stock}</td>
                    <td>{Number(r.days_cover).toFixed(1)}</td>
                    <td>{Math.round(r.suggested_order)}</td>
                    <td>£{Math.round(r.capital_required)}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const chartBlock = {
  marginTop: 50,
};

const table = {
  width: "100%",
  marginTop: 20,
  borderCollapse: "collapse",
};

const rowStyle = status => {
  if (status === "URGENT") return { background: "rgba(239,68,68,0.2)" };
  if (status === "ORDER_SOON") return { background: "rgba(250,204,21,0.2)" };
  return {};
};