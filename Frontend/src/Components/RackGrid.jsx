import BinCard from "./BinCard";

export default function RackGrid({ bins, onSelect }) {
  const left = {};
  const right = {};

  bins.forEach(loc => {
    if (!loc.location_code) return;

    // Extract aisle number (Q16 from "ELECTRA Q16-A1")
    const aisleMatch = loc.location_code.match(/[A-Z]\d+/);
    const aisleFull = aisleMatch ? aisleMatch[0] : "";

    const aisleNumber = parseInt(aisleFull.match(/\d+/)?.[0] || 0, 10);

    // LEFT = odd numbers, RIGHT = even numbers
    const side = aisleNumber % 2 === 0 ? right : left;

    if (!side[aisleFull]) side[aisleFull] = [];
    side[aisleFull].push(loc);
  });

  return (
    <div style={grid}>
      <Side title="LEFT SIDE" data={left} onSelect={onSelect} />
      <Side title="RIGHT SIDE" data={right} onSelect={onSelect} />
    </div>
  );
}

function Side({ title, data, onSelect }) {
  // 🔥 Proper numeric aisle sorting (Q2 before Q16)
  const sortedAisles = Object.keys(data).sort((a, b) => {
    const letterA = a[0];
    const letterB = b[0];

    if (letterA !== letterB) {
      return letterA.localeCompare(letterB);
    }

    const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
    const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);

    return numA - numB;
  });

  return (
    <div>
      <h2>{title}</h2>

      {sortedAisles.map(aisle => (
        <div key={aisle} style={{ marginBottom: 32 }}>
          <h3>{aisle}</h3>

          <div style={aisleGrid}>
            {data[aisle]
              .sort((a, b) => {
                // 🔥 Proper rack sorting (A1, A2, B1, C2 etc.)
                const extractRack = code => {
                  const match = code.match(/-([A-Z]\d+)/);
                  return match ? match[1] : "";
                };

                const rackA = extractRack(a.location_code);
                const rackB = extractRack(b.location_code);

                const letterA = rackA[0];
                const letterB = rackB[0];

                if (letterA !== letterB) {
                  return letterA.localeCompare(letterB);
                }

                const numA = parseInt(rackA.match(/\d+/)?.[0] || 0, 10);
                const numB = parseInt(rackB.match(/\d+/)?.[0] || 0, 10);

                return numA - numB;
              })
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