import { useState } from 'react';

const formatRupiahShort = (num) => {
  const n = Number(num || 0);
  if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(n) >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n}`;
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

/**
 * Grafik garis sederhana (revenue/cost/profit per hari) pakai SVG murni.
 * Sengaja tidak pakai library chart eksternal (recharts, dll) supaya tidak menambah
 * dependency yang berisiko konflik versi dengan React 19 yang dipakai project ini.
 *
 * @param {Array<{date: string, revenue: number, cost: number, profit: number}>} data
 */
export default function SimpleLineChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-ink/40 text-sm">
        Belum ada data transaksi sukses pada rentang ini.
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [d.revenue, d.cost, d.profit]);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = maxValue - minValue || 1;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const scaleX = (i) => padding.left + i * xStep;
  const scaleY = (val) => padding.top + chartHeight - ((val - minValue) / range) * chartHeight;

  const buildPath = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d[key])}`).join(' ');

  const series = [
    { key: 'revenue', label: 'Pendapatan', color: '#6D28D9' },
    { key: 'cost', label: 'Modal Digiflazz', color: '#DC2626' },
    { key: 'profit', label: 'Profit', color: '#EAB308' },
  ];

  // Kalau data terlalu padat (misal 30 hari), jangan tampilkan semua label tanggal
  // di sumbu X biar tidak numpuk -- ambil beberapa titik saja secara merata.
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <div className="flex gap-4 mb-3 flex-wrap">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs font-bold text-ink/70">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Garis bantu horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const y = padding.top + chartHeight * t;
          const val = maxValue - range * t;
          return (
            <g key={idx}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#0F0F12" strokeOpacity="0.06" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#0F0F12" opacity="0.5">
                {formatRupiahShort(val)}
              </text>
            </g>
          );
        })}

        {/* Garis nol (kalau profit bisa negatif) */}
        {minValue < 0 && (
          <line
            x1={padding.left} x2={width - padding.right}
            y1={scaleY(0)} y2={scaleY(0)}
            stroke="#0F0F12" strokeOpacity="0.2" strokeDasharray="4 3"
          />
        )}

        {/* 3 garis data */}
        {series.map(s => (
          <path key={s.key} d={buildPath(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* Titik + area hover per index */}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={scaleX(i) - xStep / 2} y={padding.top} width={xStep || chartWidth} height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {hoverIndex === i && (
              <line x1={scaleX(i)} x2={scaleX(i)} y1={padding.top} y2={padding.top + chartHeight} stroke="#0F0F12" strokeOpacity="0.15" />
            )}
            {series.map(s => (
              <circle
                key={s.key} cx={scaleX(i)} cy={scaleY(d[s.key])} r={hoverIndex === i ? 4.5 : 3}
                fill={s.color} stroke="white" strokeWidth="1.5"
              />
            ))}
          </g>
        ))}

        {/* Label tanggal sumbu X */}
        {data.map((d, i) => (
          i % labelStep === 0 && (
            <text key={i} x={scaleX(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#0F0F12" opacity="0.5">
              {formatDateShort(d.date)}
            </text>
          )
        ))}
      </svg>

      {/* Tooltip sederhana di bawah grafik untuk titik yang di-hover */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div className="mt-2 p-3 bg-ink text-white rounded-lg text-xs inline-flex flex-col gap-1">
          <span className="font-bold">{formatDateShort(data[hoverIndex].date)}</span>
          <span>Pendapatan: <strong>{formatRupiahShort(data[hoverIndex].revenue)}</strong></span>
          <span>Modal: <strong>{formatRupiahShort(data[hoverIndex].cost)}</strong></span>
          <span>Profit: <strong>{formatRupiahShort(data[hoverIndex].profit)}</strong></span>
        </div>
      )}
    </div>
  );
}