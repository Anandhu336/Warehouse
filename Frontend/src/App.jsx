import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import LayoutPage from "./pages/LayoutPage";
import PoLabels from "./pages/PoLabels";
import WarehouseUpload from "./pages/WarehouseUpload";
import WarehouseOptimizer from "./pages/WarehouseOptimizer";
import PurchaseDashboard from "./pages/PurchaseDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/layout" element={<LayoutPage />} />
      <Route path="/po-labels" element={<PoLabels />} />
      <Route path="/optimizer" element={<WarehouseOptimizer />} />
      <Route path="/warehouse-upload" element={<WarehouseUpload />} />

      {/* ✅ ONLY THIS LINE ADDED */}
      <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;