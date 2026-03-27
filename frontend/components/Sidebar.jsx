import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  Upload,
  AlertTriangle,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { handleLogout, getUserProfile } from '../utils/sessionManager';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/live-monitor', label: 'Live Monitor', icon: Monitor },
  { to: '/video-uploads', label: 'Uploads', icon: Upload },
  { to: '/incident-reports', label: 'Incident Reports', icon: AlertTriangle },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: 'Officer James', initials: 'OJ' });
  const navigate = useNavigate();

  useEffect(() => {
    const profile = getUserProfile();
    const initials = profile.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    setUserProfile({ ...profile, initials });
  }, []);

  const handleLogoutClick = () => {
    const filename = handleLogout();
    alert(`Session data exported to:\n${filename}\n\nAll session data has been cleared.`);
    navigate('/');
    window.location.reload(); // Force reload to clear all component states
    setMenuOpen(false);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setMenuOpen(false);
  };

  return (
    <aside
      className={`
        relative flex flex-col h-full bg-bg-secondary border-r border-bg-border
        transition-all duration-300 ease-in-out z-20
        ${collapsed ? 'w-[64px]' : 'w-[220px]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-bg-border ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center">
          <Shield className="w-4 h-4 text-accent-blue" />
        </div>
        {!collapsed && (
          <div className="animate-slide-in">
            <p className="font-display font-bold text-base text-text-primary leading-none tracking-wider">SentinelAI</p>
            <p className="text-[9px] text-accent-blue/70 tracking-[0.2em] font-mono uppercase mt-0.5">Secure Network</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
              ${collapsed ? 'justify-center' : ''}
              ${
                isActive
                  ? 'bg-accent-blue/12 text-accent-blue border border-accent-blue/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent-blue rounded-r-full" />
                    <span className="absolute inset-0 bg-accent-blue/5 rounded-lg" />
                  </>
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 relative z-10 ${isActive ? 'text-accent-blue' : 'text-text-muted group-hover:text-text-secondary'}`} />
                {!collapsed && <span className="animate-slide-in relative z-10">{label}</span>}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-bg-card border border-bg-border rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <div className="h-px bg-bg-border mx-1" />
        </div>

        <p className={`px-3 py-1 text-[9px] font-mono text-text-muted tracking-[0.15em] uppercase ${collapsed ? 'hidden' : ''}`}>
          System
        </p>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
            ${collapsed ? 'justify-center' : ''}
            ${
              isActive
                ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent-blue' : 'text-text-muted group-hover:text-text-secondary'}`} />
              {!collapsed && <span>Settings</span>}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-bg-card border border-bg-border rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                  Settings
                </span>
              )}
            </>
          )}
        </NavLink>
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="border-t border-bg-border px-4 py-3.5 relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue/40 to-accent-cyan/20 border border-accent-blue/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-accent-blue">{userProfile.initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary truncate">{userProfile.name}</p>
              <p className="text-[10px] text-text-muted truncate">Station 04 Admin</p>
            </div>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-text-muted hover:text-text-primary transition-colors duration-200 relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              {/* Backdrop to close on outside click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-bg-card border border-bg-border rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={handleSettingsClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 transition-all duration-200"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                <div className="h-px bg-bg-border mx-2" />
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-accent-red hover:bg-accent-red/10 transition-all duration-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout & Export Session
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all duration-200 z-30"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
