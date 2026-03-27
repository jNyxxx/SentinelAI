/**
 * StatusBadge — Reusable colored badge for risk levels and classifications.
 */
export default function StatusBadge({ label, variant = 'blue' }) {
  const variants = {
    red: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    orange: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
    yellow: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30',
    green: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    blue: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    cyan: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
    critical: 'bg-accent-red/20 text-accent-red border-accent-red/40 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold border tracking-wider uppercase ${variants[variant] || variants.blue}`}
    >
      {label}
    </span>
  );
}
