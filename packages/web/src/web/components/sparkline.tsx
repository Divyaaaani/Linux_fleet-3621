export function Sparkline({
  data,
  color = "#3fb950",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (!data.length) {
    return <div style={{ height }} />;
  }
  const w = 100;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${pts} ${w},${height}`;
  const id = `grad-${color.replace("#", "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function LineChart({
  data,
  color = "#58a6ff",
  height = 180,
  label,
}: {
  data: number[];
  color?: string;
  height?: number;
  label?: string;
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-xs"
        style={{ height, color: "#8b98a9" }}
      >
        no data yet
      </div>
    );
  }
  const w = 300;
  const max = 100;
  const min = 0;
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const id = `lg-${color.replace("#", "")}-${label}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={w}
          y1={height - (g / 100) * height}
          y2={height - (g / 100) * height}
          stroke="#1e2733"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${id})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
