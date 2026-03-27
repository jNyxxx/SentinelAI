/**
 * ChartContainer — Wrapper card for the Recharts-based Risk Trend chart.
 */
export default function ChartContainer({ title, subtitle, legend, rightContent, children }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 card-glow">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-base text-text-primary tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {rightContent}
          {legend && (
            <div className="flex items-center gap-4">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-text-muted">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
