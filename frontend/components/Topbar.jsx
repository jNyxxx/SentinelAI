import { Bell, Clock, X, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SESSION_KEYS, getUnreadAlertsCount } from '../utils/sessionManager';

export default function Topbar({ title, subtitle, rightContent }) {
  const [time, setTime] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load alerts and update count
  const updateAlerts = () => {
    const saved = localStorage.getItem(SESSION_KEYS.ALERTS);
    const allAlerts = saved ? JSON.parse(saved) : [];
    setAlerts(allAlerts);
    setAlertCount(getUnreadAlertsCount());
  };

  // Load alerts on mount and update in real-time
  useEffect(() => {
    updateAlerts();

    // Listen for localStorage changes (cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === SESSION_KEYS.ALERTS) {
        updateAlerts();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also poll every 5 seconds for updates in same tab
    const interval = setInterval(updateAlerts, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Dismiss single alert
  const dismissAlert = (alertId) => {
    const updated = alerts.map(a =>
      a.id === alertId ? { ...a, dismissed: true } : a
    );
    localStorage.setItem(SESSION_KEYS.ALERTS, JSON.stringify(updated));
    updateAlerts();
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    localStorage.setItem(SESSION_KEYS.ALERTS, '[]');
    updateAlerts();
  };

  // Get relative time string
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-bg-border bg-bg-secondary/80 backdrop-blur-sm flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-lg text-text-primary tracking-wide leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-text-muted font-mono mt-1">{subtitle}</p>
          )}
        </div>

        {/* Live badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-green/10 border border-accent-green/25">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green pulse-dot" />
          <span className="text-[10px] font-mono font-medium text-accent-green tracking-wider uppercase">
            Live
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 relative">
        {rightContent}

        {/* Alerts bell */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative w-9 h-9 rounded-lg border border-bg-border bg-bg-card flex items-center justify-center text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all duration-200"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />

            {/* Dropdown panel */}
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-bg-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent-blue" />
                  <span className="text-sm font-semibold text-text-primary">Notifications</span>
                  {alertCount > 0 && (
                    <span className="text-[10px] font-mono text-text-muted">({alertCount} new)</span>
                  )}
                </div>
                {alertCount > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    className="text-[10px] text-accent-blue hover:text-accent-blue/70 font-medium transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Alert list */}
              <div className="max-h-80 overflow-y-auto">
                {alerts.filter(a => !a.dismissed).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-bg-hover border border-bg-border flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6 text-text-muted opacity-40" />
                    </div>
                    <p className="text-sm text-text-primary font-medium">No notifications</p>
                    <p className="text-xs text-text-muted mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-bg-border/40">
                    {alerts.filter(a => !a.dismissed).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-bg-hover/50 transition-colors group"
                      >
                        {/* Risk indicator */}
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            alert.riskLevel === 'High' ? 'bg-accent-red' :
                            alert.riskLevel === 'Medium' ? 'bg-accent-orange' :
                            'bg-accent-blue'
                          }`}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-primary font-medium truncate">{alert.title}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{alert.camera || 'System'}</p>
                          <p className="text-[9px] font-mono text-text-muted mt-1">{getRelativeTime(alert.timestamp)}</p>
                        </div>

                        {/* Dismiss button */}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-red transition-all"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-bg-border bg-bg-hover/30">
                <a
                  href="/live-monitor"
                  className="flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <span>View on Live Monitor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card border border-bg-border">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-mono text-text-primary">
            {time}
          </span>
        </div>
      </div>
    </header>
  );
}
