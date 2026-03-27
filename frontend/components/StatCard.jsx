import { memo } from 'react';

/**
 * StatCard — Used in Dashboard for top metric tiles.
 * Redesigned with better hierarchy and compact layout.
 */
const StatCard = memo(function StatCard({ icon: Icon, label, value, sub, badge, badgeColor = 'blue' }) {
  const badgeColors = {
    blue: 'text-accent-blue',
    green: 'text-accent-green',
    red: 'text-accent-red',
    orange: 'text-accent-orange',
    yellow: 'text-accent-yellow',
    teal: 'text-accent-teal',
  };

  const badgeBgColors = {
    blue: 'bg-accent-blue/10 border-accent-blue/20',
    green: 'bg-accent-green/10 border-accent-green/20',
    red: 'bg-accent-red/10 border-accent-red/20',
    orange: 'bg-accent-orange/10 border-accent-orange/20',
    yellow: 'bg-accent-yellow/10 border-accent-yellow/20',
    teal: 'bg-accent-teal/10 border-accent-teal/20',
  };

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 card-glow flex flex-col gap-3 hover:border-accent-blue/25 transition-all duration-200" style={{ minHeight: '136px' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
            {Icon && <Icon className="w-4.5 h-4.5 text-accent-blue" style={{ width: 18, height: 18 }} />}
          </div>
          <span className="text-xs text-text-secondary font-medium">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeBgColors[badgeColor]} ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-[44px] text-text-primary leading-none" style={{ fontSize: '44px' }}>
            {value}
          </span>
          {sub && (
            <span className="text-xs text-text-muted font-mono">
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default StatCard;
