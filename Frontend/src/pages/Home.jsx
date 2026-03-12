import { useNavigate } from "react-router-dom";
import { useState } from "react";
import FeatureCard from "../Components/FeatureCard";

export default function Home() {

  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/layout?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (

    <div
      className="home-container"
      style={{ backgroundImage: "url(/warehouse-bg.png)" }}
    >

      <div className="home-overlay" />

      <div className="brand-watermark">
        VAPE <span>SUPPLIER</span>
      </div>


      <div className="home-content">

        <h1 className="home-title">
          Warehouse Management System
        </h1>

        <p className="home-subtitle">
          Real-time stock visibility, intelligent layout & faster warehouse operations
        </p>


        {/* SEARCH */}

        <input
          className="home-search"
          placeholder="Search product, SKU, or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />


        {/* FEATURE GRID */}

        <div className="feature-grid">


          <FeatureCard
            title="Stock Layout"
            desc="Visual warehouse map with live occupancy"
            onClick={() => navigate("/layout")}
          />


          <FeatureCard
            title="Stock Movement Scanner"
            desc="Move stock between locations using barcode scan"
            onClick={() => navigate("/scanner")}
          />


          {/* NEW PALLET BUILDER */}

          <FeatureCard
            title="Pallet Builder"
            desc="Build pallets before placing into locations"
            onClick={() => navigate("/pallet-builder")}
          />


          <FeatureCard
            title="Warehouse Optimizer"
            desc="Analyse pallets and improve utilisation"
            onClick={() => navigate("/optimizer")}
          />


          <FeatureCard
            title="Purchase Intelligence"
            desc="Smart reorder recommendations"
            onClick={() => navigate("/purchase-dashboard")}
          />


          <FeatureCard
            title="Label Printing"
            desc="Generate & print bin & pallet labels"
            onClick={() => navigate("/po-labels")}
          />


          <FeatureCard
            title="Warehouse Upload"
            desc="Upload latest stock & product data"
            onClick={() => navigate("/warehouse-upload")}
          />


          <FeatureCard
            title="AI Prediction"
            desc="Demand forecasting & replenishment"
            disabled
          />

          <FeatureCard

            title="Pallet Dashboard"
            desc="Live pallet receiving monitor"
            onClick={() => navigate("/pallet-dashboard")}
          />

        </div>

      </div>

    </div>

  );

}