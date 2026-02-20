import BinCard from "./Bincard";

export default function RackGrid({ bins, onSelect }) {
  const left = {};
  const right = {};

  bins.forEach(loc => {
    const num = parseInt(loc.location_code.match(/\d+/)?.[0] || 0, 10);
    const side = num % 2 === 0 ? left : right;

    const aisle = loc.location_code.split("-")[0];
    if (!side[aisle]) side[aisle] = [];
    side[aisle].push(loc);
  });

  return (
    <div style={grid}>
      <Side title="LEFT SIDE" data={left} onSelect={onSelect} />
      <Side title="RIGHT SIDE" data={right} onSelect={onSelect} />
    </div>
  );
}

function Side({ title, data, onSelect }) {
  return (
    <div>
      <h2>{title}</h2>

      {Object.keys(data).sort().map(aisle => (
        <div key={aisle} style={{ marginBottom: 32 }}>
          <h3>{aisle}</h3>

          <div style={aisleGrid}>
            {data[aisle]
              .sort((a, b) =>
                a.location_code.localeCompare(b.location_code)
              )
              .map(loc => (
                <BinCard
                  key={loc.location_code}
                  location={loc}
                  onClick={() => onSelect(loc)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "40px",
};

const aisleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "14px",
};