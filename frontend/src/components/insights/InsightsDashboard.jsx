import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ComposedChart, Line, ResponsiveContainer,
} from "recharts";
import { langColour } from "../../utils/langColours";
import { formatCount, formatDate } from "../../utils/formatters";
import { Skeleton } from "../ui/Skeleton";
import styles from "./InsightsDashboard.module.css";

const TICK = { fill: "var(--text-muted)", fontSize: 11 };
const TOOLTIP = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
  },
  cursor: { fill: "var(--surface-hover)" },
};

function StatCard({ label, value, sub }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {sub && <p className={styles.cardSub}>{sub}</p>}
      {children}
    </div>
  );
}

export function InsightsDashboard({ insights, loading, error }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={260} radius={16} />)}
      </div>
    );
  }

  if (error) {
    return <div className={styles.error} role="alert">⚠️ Insights unavailable: {error.message}</div>;
  }

  if (!insights) return null;

  const { summary, languages, growth, starDistribution, topStarred, activeRepos, activeDays } = insights;

  if (summary.original === 0) {
    return <div className={styles.empty}>No original (non-fork) repositories to analyse.</div>;
  }

  return (
    <section className={styles.wrap} aria-label="Developer insights">
      <h2 className={styles.heading}>Developer Insights</h2>

      <div className={styles.stats}>
        <StatCard label="Public repos" value={formatCount(summary.publicRepos)} />
        <StatCard label="Original" value={formatCount(summary.original)} sub={`${summary.forks} forks excluded`} />
        <StatCard label="Total stars" value={formatCount(summary.totalStars)} />
        <StatCard label="Active repos" value={activeRepos.length} sub={`commits in last ${activeDays}d`} />
      </div>

      {summary.truncated && (
        <p className={styles.note}>Only the 300 most recently pushed repositories were analysed.</p>
      )}

      <div className={styles.grid}>
        {/* 1. Languages */}
        <ChartCard title="Most popular languages" sub="Repos by primary language">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={languages} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={80} tick={{ ...TICK, fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} formatter={(v) => [v, "Repos"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {languages.map((l) => <Cell key={l.name} fill={langColour(l.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Growth */}
        <ChartCard title="Repository growth" sub="Created per year (bars) and running total (line)">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={growth} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              <Bar dataKey="created" name="Created" fill="var(--accent)" opacity={0.45} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line dataKey="total" name="Total" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Star distribution */}
        <ChartCard title="Star distribution" sub="Number of repos per star range">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={starDistribution} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} formatter={(v) => [v, "Repos"]} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
          {topStarred.length > 0 && (
            <ol className={styles.topList}>
              {topStarred.map((r) => (
                <li key={r.name}>
                  <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer">{r.name}</a>
                  <span>★ {formatCount(r.stars)}</span>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>

        {/* 4. Most active */}
        <ChartCard title="Most active repositories" sub={`Commits in the last ${activeDays} days (any author)`}>
          {activeRepos.length === 0 ? (
            <p className={styles.noData}>No commits in the last {activeDays} days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(140, activeRepos.length * 38)}>
              <BarChart data={activeRepos} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ ...TICK, fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP}
                  formatter={(v) => [v, "Commits"]}
                  labelFormatter={(name) => {
                    const r = activeRepos.find((x) => x.name === name);
                    return r ? `${name} · pushed ${formatDate(r.pushedAt)}` : name;
                  }}
                />
                <Bar dataKey="commits" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </section>
  );
}