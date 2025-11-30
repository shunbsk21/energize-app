export function RadarChart({ values }: { values: Record<Dimension, number> }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const axes: Dimension[] = ["EI", "SN", "TF", "JP"];
  const points = axes.map((d, i) => {
    const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
    const r = (values[d] / 100) * radius;
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
  });
  const polygon = points.map((p) => p.join(",")).join(" ");
  const labels = axes.map((d, i) => {
    const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
    const lx = cx + (radius + 18) * Math.cos(angle);
    const ly = cy - (radius + 18) * Math.sin(angle);
    const label = d === "EI" ? "外向(E)<->内向(I)" : d === "SN" ? "感覚(S)<->直観(N)" : d === "TF" ? "思考(T)<->感情(F)" : "判断(J)<->知覚(P)";
    return { x: lx, y: ly, label };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {[0.33, 0.66, 1].map((f, idx) => {
        const poly = axes.map((d, i) => {
          const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
          const r = radius * f;
          return `${cx + r * Math.cos(angle)},${cy - r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={idx} points={poly} fill="none" stroke="#e6e6e6" strokeWidth={1} />;
      })}
      {axes.map((_, i) => {
        const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0f0f0" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="rgba(79,70,229,0.12)" stroke="#4f46e5" strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#4f46e5" />)}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y} fontSize={10} textAnchor="middle" fill="#334155">{l.label.split("<")[0]}</text>
      ))}
    </svg>
  );
}