import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  User,
  ChevronRight,
  ChevronDown,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { getUserProfile, setUserProfile, changePassword, getSessionSettings, setSessionSettings, getNotificationThresholds, setNotificationThresholds, getEmailNotifications, setEmailNotifications, getSmsAlerts, setSmsAlerts } from '../utils/sessionManager';

// ─── Reusable form field components ───────────────────────────────────────────

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-8 py-5 border-b border-bg-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary font-medium">{label}</p>
        {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
      </div>
      <div className="flex-shrink-0 w-72">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue/60 transition-colors font-mono"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/60 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-sm text-text-secondary">{label}</span>}
      <button
        onClick={() => onChange?.(!checked)}
        className={`relative w-11 h-6 rounded-full border transition-all duration-200 flex-shrink-0 ${
          checked ? 'bg-accent-blue border-accent-blue' : 'bg-bg-border border-bg-border'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? 'left-[calc(100%-22px)]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/20"
    >
      <Save className="w-4 h-4" />
      Save Changes
    </button>
  );
}

function SliderInput({ value, onChange, min = 0, max = 100 }) {
  return (
    <div className="w-full flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="flex-1 h-2 bg-bg-border rounded-lg appearance-none cursor-pointer accent-accent-blue"
      />
      <span className="text-sm font-mono text-text-primary font-semibold w-12 text-right">{value}%</span>
    </div>
  );
}

// ─── Sub-panel content for each settings item ─────────────────────────────────

function ProfileSettingsPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const profile = getUserProfile();
    setName(profile.name);
    setEmail(profile.email);
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    
    setUserProfile({ name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <FieldRow label="Full Name" hint="Your display name across the dashboard">
        <TextInput value={name} onChange={setName} placeholder="Enter full name" />
      </FieldRow>
      <FieldRow label="Email Address" hint="Used for system notifications">
        <TextInput value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${saved ? 'text-accent-green' : 'text-transparent'}`}>
          ✓ Saved successfully!
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

function ChangePasswordPanel() {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSave = () => {
    setMessage({ text: '', type: '' });

    if (next !== confirm) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    const result = changePassword(current, next);
    
    if (result.success) {
      setMessage({ text: '✓ Password changed successfully!', type: 'success' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } else {
      setMessage({ text: result.error, type: 'error' });
    }
    
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div>
      <FieldRow label="Current Password">
        <div className="relative">
          <TextInput value={current} onChange={setCurrent} type={show ? 'text' : 'password'} placeholder="••••••••" />
          <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </FieldRow>
      <FieldRow label="New Password" hint="Minimum 8 characters">
        <TextInput value={next} onChange={setNext} type={show ? 'text' : 'password'} placeholder="••••••••" />
      </FieldRow>
      <FieldRow label="Confirm New Password">
        <TextInput value={confirm} onChange={setConfirm} type={show ? 'text' : 'password'} placeholder="••••••••" />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${message.type === 'error' ? 'text-accent-red' : message.type === 'success' ? 'text-accent-green' : 'text-transparent'}`}>
          {message.text || 'Placeholder'}
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

function SessionPanel() {
  const [timeout, setTimeout] = useState('30');
  const [concurrent, setConcurrent] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load session settings on mount
  useEffect(() => {
    const settings = getSessionSettings();
    setTimeout(settings.timeout);
    setConcurrent(settings.concurrent);
  }, []);

  const handleSave = () => {
    setSessionSettings({ timeout, concurrent });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <FieldRow label="Session Timeout" hint="Auto-logout after inactivity">
        <SelectInput
          value={timeout}
          onChange={setTimeout}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '240', label: '4 hours' },
          ]}
        />
      </FieldRow>
      <FieldRow label="Allow Concurrent Sessions" hint="Allow multiple logins at the same time">
        <Toggle checked={concurrent} onChange={setConcurrent} />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${saved ? 'text-accent-green' : 'text-transparent'}`}>
          ✓ Saved successfully!
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

function AlertThresholdsPanel({ onValueChange }) {
  const [high, setHigh] = useState(90);
  const [med, setMed] = useState(60);
  const [saved, setSaved] = useState(false);

  // Load thresholds on mount
  useEffect(() => {
    const thresholds = getNotificationThresholds();
    setHigh(thresholds.high);
    setMed(thresholds.medium);
  }, []);

  // Update preview value in real-time
  useEffect(() => {
    if (onValueChange) {
      onValueChange(`H:${high}% M:${med}%`);
    }
  }, [high, med, onValueChange]);

  const handleSave = () => {
    setNotificationThresholds({ high, medium: med });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <FieldRow label="High Risk Threshold" hint="Score above this triggers a High alert">
        <SliderInput value={high} onChange={setHigh} />
      </FieldRow>
      <FieldRow label="Medium Risk Threshold" hint="Score above this triggers a Medium alert">
        <SliderInput value={med} onChange={setMed} />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${saved ? 'text-accent-green' : 'text-transparent'}`}>
          ✓ Saved successfully!
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

function EmailNotifPanel({ onValueChange }) {
  const [enabled, setEnabled] = useState(true);
  const [addr, setAddr] = useState('alerts@sentinelai.net');
  const [onHigh, setOnHigh] = useState(true);
  const [onMed, setOnMed] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load email settings on mount
  useEffect(() => {
    const settings = getEmailNotifications();
    setEnabled(settings.enabled);
    setAddr(settings.address);
    setOnHigh(settings.onHigh);
    setOnMed(settings.onMedium);
  }, []);

  // Update preview value in real-time
  useEffect(() => {
    if (onValueChange) {
      onValueChange(enabled ? 'Enabled' : 'Disabled');
    }
  }, [enabled, onValueChange]);

  const handleSave = () => {
    setEmailNotifications({ enabled, address: addr, onHigh, onMedium: onMed });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <FieldRow label="Enable Email Alerts">
        <Toggle checked={enabled} onChange={setEnabled} />
      </FieldRow>
      <FieldRow label="Recipient Address">
        <TextInput value={addr} onChange={setAddr} type="email" placeholder="email@example.com" />
      </FieldRow>
      <FieldRow label="Notify on High Risk">
        <Toggle checked={onHigh} onChange={setOnHigh} />
      </FieldRow>
      <FieldRow label="Notify on Medium Risk">
        <Toggle checked={onMed} onChange={setOnMed} />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${saved ? 'text-accent-green' : 'text-transparent'}`}>
          ✓ Saved successfully!
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

function SmsAlertsPanel({ onValueChange }) {
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  // Load SMS settings on mount
  useEffect(() => {
    const settings = getSmsAlerts();
    setEnabled(settings.enabled);
    setPhone(settings.phone);
  }, []);

  // Update preview value in real-time
  useEffect(() => {
    if (onValueChange) {
      onValueChange(enabled ? 'Enabled' : 'Disabled');
    }
  }, [enabled, onValueChange]);

  const handleSave = () => {
    setSmsAlerts({ enabled, phone });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <FieldRow label="Enable SMS Alerts">
        <Toggle checked={enabled} onChange={setEnabled} />
      </FieldRow>
      <FieldRow label="Phone Number" hint="Include country code e.g. +1 555 000 0000">
        <TextInput value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
      </FieldRow>
      <div className="flex items-center justify-between pt-3">
        <p className={`text-xs ${saved ? 'text-accent-green' : 'text-transparent'}`}>
          ✓ Saved successfully!
        </p>
        <SaveButton onClick={handleSave} />
      </div>
    </div>
  );
}

// ─── Settings section definitions ──────────────────────────────────────────────

const SECTIONS = [
  {
    title: 'Account & Security',
    icon: User,
    items: [
      { label: 'Profile Settings', panel: ProfileSettingsPanel, valuePreview: 'Officer James' },
      { label: 'Change Password', panel: ChangePasswordPanel, valuePreview: '••••••••' },
      { label: 'Session Management', panel: SessionPanel, valuePreview: '30 min' },
    ],
  },
  {
    title: 'Notification Preferences',
    icon: Bell,
    items: [
      { label: 'Alert Thresholds', panel: AlertThresholdsPanel, valuePreview: 'H:90% M:60%' },
      { label: 'Email Notifications', panel: EmailNotifPanel, valuePreview: 'Enabled' },
      { label: 'SMS Alerts', panel: SmsAlertsPanel, valuePreview: 'Disabled' },
    ],
  },
];

// ─── Accordion item ────────────────────────────────────────────────────────────

function AccordionItem({ item, isOpen, onToggle, onValueChange }) {
  const Panel = item.panel;
  return (
    <div className={`border-b border-bg-border/50 last:border-0 transition-colors duration-150 ${isOpen ? 'bg-bg-hover/30' : 'hover:bg-bg-hover/20'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <span className={`text-sm font-medium transition-colors duration-150 ${isOpen ? 'text-accent-blue' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {item.label}
        </span>
        <div className="flex items-center gap-3">
          {item.valuePreview && (
            <span className="text-xs text-text-muted font-mono">{item.valuePreview}</span>
          )}
          <span className="flex-shrink-0 ml-4">
            {isOpen
              ? <ChevronDown className="w-4 h-4 text-accent-blue" />
              : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary" />
            }
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 animate-fade-up">
          <div className="border-t border-bg-border/50 pt-4">
            <Panel onValueChange={onValueChange} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings page ────────────────────────────────────────────────────────

export default function Settings() {
  // Track which item is open: "sectionIndex-itemIndex" or null
  const [openKey, setOpenKey] = useState(null);
  // Track preview values for items that support real-time updates
  const [previewValues, setPreviewValues] = useState({});

  const toggle = (key) => setOpenKey((prev) => (prev === key ? null : key));

  // Handler to update preview value for a specific item
  const handleValueChange = (itemKey, value) => {
    setPreviewValues((prev) => ({ ...prev, [itemKey]: value }));
  };

  return (
    <>
      <Topbar title="Settings" subtitle="System configuration & preferences" />
      <main className="flex-1 overflow-y-auto p-6 bg-grid">
        <div className="max-w-4xl mx-auto space-y-6">
          {SECTIONS.map((section, si) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="bg-bg-card border border-bg-border rounded-xl overflow-hidden card-glow">
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-bg-border">
                  <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-text-primary tracking-wide">{section.title}</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure {section.title.toLowerCase()}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-bg-border/40">
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}`;
                    const previewValue = previewValues[key] !== undefined ? previewValues[key] : item.valuePreview;
                    return (
                      <AccordionItem
                        key={key}
                        item={{ ...item, valuePreview: previewValue }}
                        isOpen={openKey === key}
                        onToggle={() => toggle(key)}
                        onValueChange={(value) => handleValueChange(key, value)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
