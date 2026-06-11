import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend,
} from "recharts";
import { langColour } from "../../utils/langColours";
import styles from "./LanguageChart.module.css";

const MAX_SLICES   = 8;   // group tail into "Other"
const MIN_PCT      = 0.5; // slices below this % are folded into Other

/** Prepare sorted, capped data from the raw { lang: bytes } map */
function prepareData(rawStats) {
  const total = Object.values(rawStats).reduce((s, v) => s + v, 0);
  if (total === 0) return { slices: [], total };

  const sorted = Object.entries(rawStats)
    .map(([name, bytes]) => ({ name, bytes, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.bytes - a.bytes);

  const main  = sorted.filter((d) => d.pct >= MIN_PCT).slice(0, MAX_SLICES);
  const other = sorted.slice(main.length);

  if (other.length > 0) {
    const otherBytes = other.reduce((s, d) => s + d.bytes, 0);
    main.push({ name: "Other", bytes: otherBytes, pct: (otherBytes / total) * 100 });
  }

  return { slices: main, total };
}

/* ── Custom tooltip ─────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, pct, bytes } = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDot} style={{ background: langColour(name) }} />
      <span className={styles.tooltipName}>{name}</span>
      <span className={styles.tooltipPct}>{pct.toFixed(1)}%</span>
      <span className={styles.tooltipBytes}>{formatBytes(bytes)}</span>
    </div>
  );
}

/* ── Custom legend ──────────────────────────────────────────────────────── */
function ChartLegend({ slices, activeIndex, onHover }) {
  return (
    <ul className={styles.legend}>
      {slices.map((s, i) => (
        <li
          key={s.name}
          className={`${styles.legendItem} ${activeIndex === i ? styles.legendActive : ""}`}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
        >
          <span className={styles.legendDot} style={{ background: langColour(s.name) }} />
          <span className={styles.legendName}>{s.name}</span>
          <span className={styles.legendPct}>{s.pct.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
import { useState } from "react";

export function LanguageChart({ stats, loading }) {
  const [view, setView]           = useState("donut"); // "donut" | "bar"
  const [activeIndex, setActive]  = useState(null);

  if (loading) return <ChartSkeleton />;
  if (!stats)  return null;

  const { slices, total } = prepareData(stats);
  if (slices.length === 0) return null;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Language Statistics</h3>
        <div className={styles.toggle} role="group" aria-label="Chart type">
          <button
            className={`${styles.toggleBtn} ${view === "donut" ? styles.toggleActive : ""}`}
            onClick={() => setView("donut")}
            aria-pressed={view === "donut"}
          >
            <DonutIcon /> Donut
          </button>
          <button
            className={`${styles.toggleBtn} ${view === "bar" ? styles.toggleActive : ""}`}
            onClick={() => setView("bar")}
            aria-pressed={view === "bar"}
          >
            <BarIcon /> Bar
          </button>
        </div>
      </div>

      <p className={styles.sub}>
        Across public repositories · {slices.length} language{slices.length !== 1 ? "s" : ""}
        {" · "}{formatBytes(total)} total
      </p>

      {view === "donut" ? (
        <div className={styles.donutWrap}>
          {/* Chart + centre label share one relative container */}
          <div className={styles.donutChartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="bytes"
                  onMouseEnter={(_, i) => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  stroke="none"
                >
                  {slices.map((s, i) => (
                    <Cell
                      key={s.name}
                      fill={langColour(s.name)}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                      style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre label — absolutely positioned inside the chart wrapper */}
            <div className={styles.donutCenter} aria-hidden="true">
              {activeIndex !== null ? (
                <>
                  <span className={styles.donutCenterName}>{slices[activeIndex].name}</span>
                  <span className={styles.donutCenterPct}>{slices[activeIndex].pct.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <span className={styles.donutCenterName}>Languages</span>
                  <span className={styles.donutCenterPct}>{slices.length}</span>
                </>
              )}
            </div>
          </div>

          <ChartLegend slices={slices} activeIndex={activeIndex} onHover={setActive} />
        </div>
      ) : (
        <div className={styles.barWrap}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={slices}
              layout="vertical"
              margin={{ top: 4, right: 48, bottom: 4, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                domain={[0, "dataMax"]}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={78}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text)",
                }}
                cursor={{ fill: "var(--surface-hover)" }}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {slices.map((s) => (
                  <Cell key={s.name} fill={langColour(s.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function ChartSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skelTitle} />
      <div className={styles.skelDonut} />
      <div className={styles.skelLegend}>
        {[90, 70, 80, 55, 65].map((w, i) => (
          <div key={i} className={styles.skelLegendItem} style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(b) {
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

function DonutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8Z"/>
    </svg>
  );
}

function BarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1 1.75A.75.75 0 0 1 1.75 1h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 1.75ZM1 5.75A.75.75 0 0 1 1.75 5h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 1 5.75ZM1.75 9a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5ZM1 13.75A.75.75 0 0 1 1.75 13h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 1 13.75Z"/>
    </svg>
  );
}