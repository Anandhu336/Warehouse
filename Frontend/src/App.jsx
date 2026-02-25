import { Routes, Route } from "react-router-dom";

import Home from "./tempPages/Home";
import LayoutPage from "./tempPages/LayoutPage";
import PoLabels from "./tempPages/PoLabels";
import WarehouseUpload from "./tempPages/WarehouseUpload";
import WarehouseOptimizer from "./tempPages/WarehouseOptimizer";
import PurchaseDashboard from "./tempPages/PurchaseDashboard";
import ScannerPage from "./tempPages/ScannerPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/layout" element={<LayoutPage />} />
      <Route path="/po-labels" element={<PoLabels />} />
      <Route path="/optimizer" element={<WarehouseOptimizer />} />
      <Route path="/warehouse-upload" element={<WarehouseUpload />} />
      <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />
      <Route path="/scanner" element={<ScannerPage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;