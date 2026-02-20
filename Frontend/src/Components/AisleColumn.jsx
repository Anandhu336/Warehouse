import BinCard from "./Bincard";

export default function AisleColumn({ title, bins }) {
  const aisles = [...new Set(bins.map(b => b.aisle))];

  return (
    <div style={{ width: "100%" }}>
      <h2 style={{ marginBottom: "16px" }}>{title}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
          gap: "24px"
        }}
      >
        {aisles.map(aisle => {
          const aisleBins = bins.filter(b => b.aisle === aisle);

          return (
            <div key={aisle}>
              <h3
                style={{
                  marginBottom: "10px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid #2b2f3a",
                  letterSpacing: "1px"
                }}
              >
                {aisle}
              </h3>

              {["C", "B", "A"].map(level => (
                <div
                  key={level}
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "12px"
                  }}
                >
                  {aisleBins
                    .filter(b => b.level === level)
                    .sort((a, b) => a.slot - b.slot)
                    .map(bin => (
                      <BinCard key={bin.location_code} bin={bin} />
                    ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}