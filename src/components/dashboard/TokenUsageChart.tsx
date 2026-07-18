import { useState } from 'react';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// ── Types ──

interface TokenDay {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreation: number;
  cacheRead: number;
  sessions: number;
}

interface TokenByModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  sessions: number;
}

export interface TokenUsageData {
  daily: TokenDay[];
  byModel: TokenByModel[];
  totals: TokenTotals;
  estimatedCost: number;
}

interface Props {
  data: TokenDay[];
  totals: TokenTotals;
  byModel: TokenByModel[];
  estimatedCost: number;
  isPending: boolean;
}

// ── Colors ──

const CHART_COLORS = {
  input: 'rgba(168,130,255,0.85)',
  output: 'rgba(99,102,241,0.85)',
  cacheCreation: 'rgba(52,211,153,0.7)',
  cacheRead: 'rgba(251,191,36,0.7)',
};

const MODEL_PIE_COLORS = ['#a882ff', '#6366f1', '#34d399', '#fbbf24', '#f472b6', '#fb923c'];

// ── Helpers ──

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Component ──

export function TokenUsageChart({ data, totals, byModel, estimatedCost, isPending }: Props) {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [barTab, setBarTab] = useState<'tokens' | 'cache'>('tokens');

  // Filter data based on selected range
  const now = Date.now();
  const dayMs = 86400000;
  const filtered = data.filter((d) => {
    const ts = new Date(d.date).getTime();
    if (range === '7d') return ts >= now - 7 * dayMs;
    if (range === '30d') return ts >= now - 30 * dayMs;
    return true;
  });

  // Prepare bar chart data
  const barData = filtered.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  // Prepare pie data
  const pieData = byModel.map((m) => ({
    name: m.model.includes('claude-') ? m.model.replace('claude-', '') : m.model,
    value: m.inputTokens + m.outputTokens,
    inputTokens: m.inputTokens,
    outputTokens: m.outputTokens,
  }));

  const totalTokens = totals.inputTokens + totals.outputTokens;

  if (isPending) {
    return (
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
        <div className="h-6 w-40 rounded bg-claude-800 animate-pulse mb-4" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-claude-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-claude-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Token Usage</h3>
        {/* Range toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-claude-800 bg-claude-950 p-0.5">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === r
                  ? 'bg-accent/20 text-accent'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <div className="rounded-lg border border-claude-800 bg-claude-950/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Total Tokens</p>
          <p className="mt-1 text-lg font-bold text-gray-100">{formatNumber(totalTokens)}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            {formatNumber(totals.inputTokens)} in / {formatNumber(totals.outputTokens)} out
          </p>
        </div>
        <div className="rounded-lg border border-claude-800 bg-claude-950/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Cache</p>
          <p className="mt-1 text-lg font-bold text-gray-100">{formatNumber(totals.cacheCreationTokens + totals.cacheReadTokens)}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            +{formatNumber(totals.cacheCreationTokens)} creation / +{formatNumber(totals.cacheReadTokens)} read
          </p>
        </div>
        <div className="rounded-lg border border-claude-800 bg-claude-950/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Sessions</p>
          <p className="mt-1 text-lg font-bold text-gray-100">{totals.sessions}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            ~{totalTokens > 0 ? Math.round(totalTokens / totals.sessions).toLocaleString() : 0} avg tokens/session
          </p>
        </div>
        <div className="rounded-lg border border-claude-800 bg-claude-950/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Est. Cost</p>
          <p className="mt-1 text-lg font-bold text-green-400">${estimatedCost.toFixed(2)}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            ~${totals.sessions > 0 ? (estimatedCost / totals.sessions).toFixed(4) : '0'} / session
          </p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bar chart: daily token usage */}
        <div className="lg:col-span-2">
          {/* Tab toggle inside bar area */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">Daily Usage</span>
            <div className="flex items-center gap-1 rounded-md border border-claude-800 bg-claude-950 p-0.5">
              <button
                onClick={() => setBarTab('tokens')}
                className={clsx(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                  barTab === 'tokens' ? 'bg-accent/20 text-accent' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                Tokens
              </button>
              <button
                onClick={() => setBarTab('cache')}
                className={clsx(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                  barTab === 'cache' ? 'bg-accent/20 text-accent' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                Cache
              </button>
            </div>
          </div>

          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#1f2937' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid #2d2d4e',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e5e7eb',
                  }}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                {barTab === 'tokens' ? (
                  <>
                    <Bar dataKey="inputTokens" name="Input Tokens" stackId="a" fill={CHART_COLORS.input} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="outputTokens" name="Output Tokens" stackId="a" fill={CHART_COLORS.output} radius={[2, 2, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="cacheCreation" name="Cache Creation" stackId="a" fill={CHART_COLORS.cacheCreation} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cacheRead" name="Cache Read" stackId="a" fill={CHART_COLORS.cacheRead} radius={[2, 2, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-gray-600">No token data available</div>
          )}
        </div>

        {/* Pie chart: cost by model */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-3">Cost by Model</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_entry, idx) => (
                    <Cell key={idx} fill={MODEL_PIE_COLORS[idx % MODEL_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1a1a2e',
                    border: '1px solid #2d2d4e',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e5e7eb',
                  }}
                  formatter={(_value: number, _name: string, props: any) => [
                    `${formatNumber(props.payload.inputTokens)} in / ${formatNumber(props.payload.outputTokens)} out`,
                    props.payload.name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
                  formatter={(value: string) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-gray-600">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
