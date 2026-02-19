import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({ value }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!value || !ref.current) return;

    JsBarcode(ref.current, value, {
      format: "CODE128",
      width: 2,
      height: 70,
      displayValue: true,
      fontSize: 14,
      margin: 0,
    });
  }, [value]);

  return <svg ref={ref} />;
}