import { useEffect } from "react";

function parseProduct(productName) {
  let name = productName;
  let flavour = "";
  let strength = "";

  if (productName.includes("[")) {
    name = productName.split("[")[0].trim();

    const inside = productName.split("[")[1].replace("]", "");
    const parts = inside.split("/");

    flavour = parts[0]?.trim() || "";
    strength = parts[1]?.trim() || "";
  }

  return { name, flavour, strength };
}

export default function PrintLabels({ labels, onBack }) {
  useEffect(() => {
    setTimeout(() => window.print(), 300);
  }, []);

  return (
    <>
      {/* Screen-only back button */}
      <button className="back-btn no-print" onClick={onBack}>
        ← Back
      </button>

      <div id="print-area">
        {labels.flatMap(label => {
          const { name, flavour, strength } =
            parseProduct(label.product_name);

          return Array.from(
            { length: label.labels_required },
            (_, i) => (
              <div className="label" key={`${label.sku}-${i}`}>

                {/* PRODUCT NAME */}
                <div className="label-product">
                  {name}
                </div>

                {/* FLAVOUR */}
                <div className="label-flavour">
                  {flavour}
                </div>

                {/* STRENGTH */}
                <div className="label-strength">
                  {strength}
                </div>

                {/* BARCODE */}
                <div className="label-barcode">
                  <img
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${label.sku}&code=Code128`}
                    alt="barcode"
                  />
                  <div className="barcode-text">
                    {label.sku}
                  </div>
                </div>

              </div>
            )
          );
        })}
      </div>
    </>
  );
}