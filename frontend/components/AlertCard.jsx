/**
 * AlertCard — Used in Live Monitor for immediate alerts panel.
 * Shows "View Report" for High/Medium risk, "Dismiss" for Low risk.
 */
export default function AlertCard({ alert, onViewCapture, onDismiss, onViewReport }) {
  const riskLevel = alert.riskLevel || 'Unknown';
  const isHighRisk = riskLevel === 'High' || riskLevel === 'Medium';

  const getRiskColor = () => {
    if (riskLevel === 'High') return 'bg-accent-red text-white border-accent-red/30';
    if (riskLevel === 'Medium') return 'bg-accent-orange text-white border-accent-orange/30';
    return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
  };

  const getRiskLabel = () => {
    if (riskLevel === 'High') return 'HIGH RISK';
    if (riskLevel === 'Medium') return 'MEDIUM RISK';
    return alert.type || 'ALERT';
  };

  return (
    <div
      className={`
        flex-shrink-0 w-72 rounded-xl border p-4 card-glow
        ${isHighRisk
          ? 'bg-accent-red/10 border-accent-red/30'
          : 'bg-bg-card border-bg-border'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`
            text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-widest uppercase
            ${getRiskColor()}
          `}
        >
          {getRiskLabel()}
        </span>
        <span className="text-[10px] font-mono text-text-muted">{alert.time}</span>
      </div>

      <h4 className="text-sm font-semibold text-text-primary mb-0.5">{alert.title}</h4>
      <p className="text-[11px] text-text-muted mb-3">{alert.zone || alert.camera}</p>

      {isHighRisk ? (
        <button
          onClick={() => onViewReport?.(alert)}
          className="w-full py-2 rounded-lg bg-accent-red text-white text-xs font-bold tracking-wider uppercase hover:bg-red-600 transition-colors duration-200"
        >
          View Report
        </button>
      ) : (
        <button
          onClick={() => onDismiss?.(alert)}
          className="w-full py-2 rounded-lg border border-bg-border text-text-secondary text-xs font-medium hover:bg-bg-hover hover:text-text-primary transition-all duration-200"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
