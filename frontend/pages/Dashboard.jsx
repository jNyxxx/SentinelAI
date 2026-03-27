import { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import ChartContainer from '../components/ChartContainer';
import DataTable from '../components/DataTable';
import { incidentApi } from '../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg px-3 py-2.5 text-xs font-mono shadow-card">
      <p className="text-text-primary font-semibold mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-text-secondary capitalize">{entry.dataKey}:</span>
          <span className="text-text-primary font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function normalizeRisk(riskLevel) {
  if (!riskLevel) return 'medium';
  const r = String(riskLevel).toLowerCase();
  if (r.includes('high')) return 'high';
  if (r.includes('low')) return 'low';
  if (r.includes('medium')) return 'medium';
  return 'medium';
}

function buildRiskTrend(incidents, hours = 24) {
  // Create 24-hour buckets from 12 AM to 11 PM
  const buckets = [];
  for (let hour = 0; hour < hours; hour += 1) {
    // Create a date for this hour
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    buckets.push({
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      hour: hour,
      high: 0,
      medium: 0,
      low: 0
    });
  }

  // Count incidents in each hour bucket
  (incidents || []).forEach((incident) => {
    if (!incident?.createdAt) return;

    let incidentDate;
    if (typeof incident.createdAt === 'string') {
      incidentDate = new Date(incident.createdAt);
    } else {
      incidentDate = incident.createdAt;
    }

    if (Number.isNaN(incidentDate.getTime())) return;

    // Get the hour of this incident (0-23)
    const incidentHour = incidentDate.getHours();

    // Find matching bucket
    const bucket = buckets[incidentHour];
    if (!bucket) return;

    // Normalize risk level
    const risk = normalizeRisk(incident.riskLevelRaw || incident.riskLevel);
    bucket[risk] += 1;
  });

  return buckets;
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24H'); // Default to 24 hours

  useEffect(() => {
    loadIncidents();
    // Refresh incidents every 30 seconds
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadIncidents() {
    try {
      const data = await incidentApi.getAllIncidents();
      // Transform backend data to match table format
      const transformed = Array.isArray(data)
        ? data.map((incident) => ({
            id: incident.id,
            timestamp: incident.createdAt
              ? new Date(incident.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'N/A',
            filename: incident.fileName || 'Unknown',
            classification: incident.classification || 'Unknown',
            riskLevel: normalizeRisk(incident.riskLevelRaw || incident.riskLevel),
            riskLevelRaw: incident.riskLevel || 'Medium',
            createdAt: incident.createdAt,
          }))
        : [];
      setIncidents(transformed);

      // Calculate active alerts (high risk incidents in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const highRiskAlerts = transformed.filter((incident) => {
        if (incident.riskLevel !== 'high') return false;
        if (!incident.createdAt || incident.createdAt === 'N/A') return false;
        const incidentDate = new Date(incident.createdAt);
        return incidentDate >= oneHourAgo;
      }).length;
      setActiveAlerts(highRiskAlerts);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      setIncidents([]);
      setActiveAlerts(0);
    } finally {
      setLoading(false);
    }
  }

  // Helper to get time range in milliseconds
  function getTimeRangeMs(range) {
    switch (range) {
      case '1H': return 60 * 60 * 1000; // 1 hour
      case '24H': return 24 * 60 * 60 * 1000; // 24 hours
      case '7D': return 7 * 24 * 60 * 60 * 1000; // 7 days
      default: return 24 * 60 * 60 * 1000;
    }
  }

  // Filter incidents by selected time range
  const filteredIncidents = useMemo(() => {
    if (timeRange === '24H') return incidents; // Show all for 24H (default)

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - getTimeRangeMs(timeRange));

    return incidents.filter((incident) => {
      if (!incident.createdAt || incident.createdAt === 'N/A') return false;
      const incidentDate = new Date(incident.createdAt);
      return incidentDate >= cutoffTime;
    });
  }, [incidents, timeRange]);

  const riskTrendData = useMemo(() => buildRiskTrend(filteredIncidents, 24), [filteredIncidents]);

  // Calculate insight from data
  const chartInsight = useMemo(() => {
    if (!incidents.length) return null;
    
    // Find peak hour
    const peakHour = riskTrendData.reduce((max, bucket) => {
      const total = bucket.high + bucket.medium + bucket.low;
      const maxTotal = max.high + max.medium + max.low;
      return total > maxTotal ? bucket : max;
    }, riskTrendData[0]);
    
    const totalInPeak = peakHour.high + peakHour.medium + peakHour.low;
    if (totalInPeak === 0) return null;
    
    return `Peak activity at ${peakHour.time} with ${totalInPeak} incident${totalInPeak > 1 ? 's' : ''}`;
  }, [riskTrendData, incidents]);

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="flex-1 overflow-y-auto p-6 bg-grid space-y-6">
        {/* ── Stat Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={BarChart2}
            label="Total Incidents"
            value={incidents.length}
            badge={incidents.length ? 'Live' : 'No data'}
            badgeColor={incidents.length ? 'teal' : 'yellow'}
          />
          <StatCard
            icon={AlertTriangle}
            label="Active Alerts"
            value={activeAlerts}
            sub="Last 60 minutes"
            badge={activeAlerts > 0 ? 'Live' : 'Normal'}
            badgeColor={activeAlerts > 0 ? 'red' : 'green'}
          />
        </div>

        {/* ── Risk Level Trend Chart ────────────────────────────────── */}
        <ChartContainer
          title="Risk Level Trends"
          subtitle="Hourly anomaly analysis per security zone"
          legend={[
            { label: 'High', color: '#ef4444' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#10b981' },
          ]}
          rightContent={
            <div className="flex items-center gap-1.5">
              {['1H', '24H', '7D'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-semibold rounded-md transition-all duration-200 ${
                    timeRange === range
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          }
        >
          {chartInsight && (
            <div className="mb-3 px-3 py-2 bg-accent-blue/5 border border-accent-blue/10 rounded-lg">
              <p className="text-[10px] font-mono text-accent-blue">{chartInsight}</p>
            </div>
          )}
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={riskTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e2d4a" strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'transparent' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} fill="url(#gradHigh)" dot={false} />
              <Area type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gradMedium)" dot={false} />
              <Area type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} fill="url(#gradLow)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ── Recent Incidents Table ────────────────────────────────── */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5 card-glow">
          <div className="mb-5">
            <h2 className="font-display font-bold text-base text-text-primary tracking-wide">
              Recent Detected Incidents
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
            </div>
          ) : incidents.length > 0 ? (
            <DataTable incidents={incidents} />
          ) : (
            <div className="text-center py-8 text-text-muted text-xs">
              No incidents detected yet. Upload a video to start analysis.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
