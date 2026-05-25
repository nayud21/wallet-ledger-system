interface SparkProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}

export default function Spark({ data, color = '#10b981', height = 28, fill = false }: SparkProps) {
  if (data.length < 2) {
    return (
      <svg viewBox={`0 0 120 ${height}`} className="block" style={{ width: '100%', height }}>
        <line x1="0" y1={height / 2} x2="120" y2={height / 2} stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  const W = 120;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = W / (data.length - 1);
  const path = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(H - ((v - min) / range) * (H - 4) - 2).toFixed(1)}`)
    .join(' ');
  const gradId = `spfill-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block" style={{ width: '100%', height }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
