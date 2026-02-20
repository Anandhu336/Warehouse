import { Routes, Route } from "react-router-dom";

import Home from "./Pages/Home";
import LayoutPage from "./Pages/LayoutPage";
import PoLabels from "./Pages/PoLabels";
import WarehouseUpload from "./Pages/WarehouseUpload";
import WarehouseOptimizer from "./Pages/WarehouseOptimizer";
import PurchaseDashboard from "./Pages/PurchaseDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/layout" element={<LayoutPage />} />
      <Route path="/po-labels" element={<PoLabels />} />
      <Route path="/optimizer" element={<WarehouseOptimizer />} />
      <Route path="/warehouse-upload" element={<WarehouseUpload />} />
      <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;