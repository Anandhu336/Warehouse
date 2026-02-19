export default function FeatureCard({ title, desc, onClick, disabled }) {
  return (
    <div
      className={`feature-card ${disabled ? "disabled" : ""}`}
      onClick={!disabled ? onClick : undefined}
    >
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}