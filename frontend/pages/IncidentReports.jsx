import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, FileText } from 'lucide-react';
import Topbar from '../components/Topbar';
import IncidentCard from '../components/IncidentCard';
import { incidentApi } from '../services/api';

const RISK_LEVELS = [
  { id: 'high', label: 'High', color: 'bg-accent-orange' },
  { id: 'medium', label: 'Medium', color: 'bg-accent-yellow' },
  { id: 'low', label: 'Low', color: 'bg-accent-green' },
];

const CLASSIFICATIONS = [
  { id: 'all', label: 'All Classifications' },
  { id: 'suspicious', label: 'Suspicious Activity', color: 'text-accent-orange' },
  { id: 'normal', label: 'Normal Activity', color: 'text-accent-green' },
];

export default function IncidentReports() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisks, setSelectedRisks] = useState(['high', 'medium', 'low']);
  const [selectedClassification, setSelectedClassification] = useState('all');

  useEffect(() => {
    loadIncidents();
    // Refresh incidents every 30 seconds (optimized from 10s for better performance)
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadIncidents() {
    try {
      const data = await incidentApi.getAllIncidents();

      // Transform backend data to match IncidentCard format
      const transformed = Array.isArray(data)
        ? data.map((incident) => ({
            id: incident.id,
            fileName: incident.fileName || null,
            riskLevel: incident.riskLevel || 'Medium',
            date: incident.createdAt
              ? new Date(incident.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A',
            title: incident.classification || 'Unknown Incident',
            description: incident.summary || incident.fullReport || 'No description available.',
            color: getIncidentColor(incident.riskLevel),
          }))
        : [];

      setIncidents(transformed);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  function getIncidentColor(riskLevel) {
    if (!riskLevel) return 'yellow';
    const risk = riskLevel.toLowerCase();
    if (risk.includes('critical')) return 'red';
    if (risk.includes('high')) return 'orange';
    if (risk.includes('medium') || risk.includes('moderate')) return 'yellow';
    if (risk.includes('low')) return 'green';
    return 'yellow';
  }

  const toggleRisk = (id) =>
    setSelectedRisks((r) =>
      r.includes(id) ? r.filter((x) => x !== id) : [...r, id]
    );

  const handleCardClick = (incidentId) => {
    navigate(`/incident/${incidentId}`);
  };

  async function handleDeleteIncident(incidentId) {
    try {
      await incidentApi.deleteIncident(incidentId);
      // Reload incidents to refresh displayIds
      loadIncidents();
    } catch (error) {
      console.error('Failed to delete incident:', error);
      alert('Failed to delete incident: ' + error.message);
    }
  }

  // Filter incidents based on risk level and classification (memoized for performance)
  const filteredIncidents = useMemo(() => {
    // Safety check: ensure incidents is an array
    if (!Array.isArray(incidents) || incidents.length === 0) {
      return [];
    }

    try {
      return incidents.filter((incident) => {
        // Safety check: ensure incident exists
        if (!incident) return false;

        // Risk level filter
        const riskLevelLower = (incident.riskLevel || '').toLowerCase();
        const matchesRisk = selectedRisks.some(risk => riskLevelLower.includes(risk));
        
        // Classification filter
        let matchesClassification = true;
        if (selectedClassification !== 'all') {
          const titleLower = (incident.title || '').toLowerCase();
          if (selectedClassification === 'suspicious' && !titleLower.includes('suspicious')) {
            matchesClassification = false;
          }
          if (selectedClassification === 'normal' && !titleLower.includes('normal')) {
            matchesClassification = false;
          }
        }

        // If all risk levels are unchecked, only filter by classification
        if (selectedRisks.length === 0) {
          return matchesClassification;
        }

        // Otherwise, must match both risk and classification
        return matchesRisk && matchesClassification;
      });
    } catch (error) {
      console.error('Filter error:', error);
      return []; // Return empty array on error instead of crashing
    }
  }, [incidents, selectedRisks, selectedClassification]);

  return (
    <>
      <Topbar title="Incident Reports" subtitle="Incident archive · AI-detected events" />

      <main className="flex-1 flex overflow-hidden bg-grid">
        {/* ── Filter Sidebar ──────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 border-r border-bg-border bg-bg-secondary overflow-y-auto p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">Filters</h3>
            </div>
          </div>

          {/* Risk Level - Pill Toggles */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase">Risk Level</p>
            <div className="space-y-2">
              {RISK_LEVELS.map(({ id, label, color }) => (
                <button
                  key={id}
                  onClick={() => toggleRisk(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${
                    selectedRisks.includes(id)
                      ? 'bg-accent-blue/10 border-accent-blue/30'
                      : 'bg-bg-card border-bg-border hover:border-accent-blue/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-text-secondary">{label}</span>
                  </div>
                  {selectedRisks.includes(id) && (
                    <svg className="w-3.5 h-3.5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-3 pt-4 border-t border-bg-border">
            <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase">Classification</p>
            <div className="space-y-2">
              {CLASSIFICATIONS.map(({ id, label, color }) => (
                <button
                  key={id}
                  onClick={() => setSelectedClassification(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${
                    selectedClassification === id
                      ? 'bg-accent-blue/10 border-accent-blue/30'
                      : 'bg-bg-card border-bg-border hover:border-accent-blue/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {color && <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />}
                    <span className={`text-xs ${selectedClassification === id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{label}</span>
                  </div>
                  {selectedClassification === id && (
                    <svg className="w-3.5 h-3.5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-bg-border" />
        </aside>

        {/* ── Archive Grid ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Top Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-base text-text-primary tracking-wide">
                Incident Reports
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {filteredIncidents.length} report{filteredIncidents.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 xl:grid-cols-2 gap-4">
            {loading ? (
              // Loading skeletons
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-bg-card border border-bg-border rounded-xl p-4 animate-pulse">
                  <div className="h-40 bg-bg-primary/50 rounded-lg mb-4" />
                  <div className="h-4 bg-bg-primary/50 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-bg-primary/50 rounded w-full mb-1" />
                  <div className="h-3 bg-bg-primary/50 rounded w-2/3" />
                </div>
              ))
            ) : filteredIncidents && filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <div key={incident.id} onClick={() => handleCardClick(incident.id)} className="cursor-pointer">
                  <IncidentCard incident={incident} onDelete={handleDeleteIncident} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-bg-hover border border-bg-border flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-text-muted opacity-50" />
                </div>
                <p className="text-sm text-text-primary font-medium mb-1">No reports found</p>
                <p className="text-xs text-text-muted">
                  {selectedRisks.length === 0 && selectedClassification !== 'all'
                    ? 'Select a risk level or adjust classification filter.'
                    : 'Try adjusting your filters or search criteria.'}
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      </main>
    </>
  );
}
