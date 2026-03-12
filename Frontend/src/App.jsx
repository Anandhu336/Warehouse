import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import LayoutPage from "./pages/LayoutPage";
import PoLabels from "./pages/PoLabels";
import WarehouseUpload from "./pages/WarehouseUpload";
import WarehouseOptimizer from "./pages/WarehouseOptimizer";
import PurchaseDashboard from "./pages/PurchaseDashboard";
import ScannerPage from "./pages/ScannerPage";
import PalletBuilder from "./pages/PalletBuilder";
import PalletDashboard from "./pages/PalletDashboard";

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
      <Route path="/pallet-builder" element={<PalletBuilder />} />
      <Route path="/pallet-dashboard" element={<PalletDashboard />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;