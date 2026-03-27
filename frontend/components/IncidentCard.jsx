import { useState, useEffect, memo } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { incidentApi } from '../services/api';

/**
 * IncidentCard — Used in Incident Reports Archive grid.
 */
const IncidentCard = memo(function IncidentCard({ incident, onDelete }) {
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch evidence photo for High/Medium risk incidents
  useEffect(() => {
    if (incident.riskLevel?.toLowerCase() === 'low') return;

    setLoading(true);
    incidentApi.getIncidentFrames(incident.id)
      .then(frames => {
        if (frames && frames.length > 0) {
          setEvidencePhoto(frames[0].base64);
        }
      })
      .catch(err => {
        console.error('Failed to load evidence photo:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [incident.id, incident.riskLevel]);

  const handleDeleteClick = (e) => {
    e.stopPropagation();  // Prevent card click navigation
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(incident.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const badgeConfig = {
    red: { badge: 'bg-accent-red text-white', border: 'border-accent-red/20' },
    orange: { badge: 'bg-accent-orange text-white', border: 'border-accent-orange/20' },
    blue: { badge: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40', border: 'border-accent-blue/20' },
    green: { badge: 'bg-accent-green/20 text-accent-green border border-accent-green/40', border: 'border-accent-green/20' },
  };

  const config = badgeConfig[incident.color] || badgeConfig.blue;

  const gradients = {
    red: 'from-slate-900 to-slate-800',
    orange: 'from-amber-950 to-slate-900',
    blue: 'from-slate-900 to-blue-950',
    green: 'from-slate-900 to-emerald-950',
  };

  // Get filename from incident data
  const filename = incident.fileName || incident.filename || 'Unknown';

  return (
    <div className={`bg-bg-card border ${config.border} rounded-xl overflow-hidden card-glow hover:border-opacity-50 transition-all duration-300 group`}>
      {/* Image area */}
      <div className={`relative h-40 bg-gradient-to-br ${gradients[incident.color]} overflow-hidden`}>
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-50" />

        {/* Evidence Photo or Placeholder */}
        {evidencePhoto ? (
          <img 
            src={evidencePhoto} 
            alt="Evidence" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          </div>
        ) : (
          /* Placeholder for Low risk or no photo */
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-text-muted/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded tracking-widest uppercase ${config.badge}`}>
            {incident.riskLevel}
          </span>
          <span className="text-[9px] font-mono px-2 py-1 rounded bg-bg-primary/60 text-text-muted border border-bg-border tracking-wider">
            {evidencePhoto ? '1 EVIDENCE' : 'NO EVIDENCE'}
          </span>
        </div>

        {/* Date and Filename */}
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-[10px] font-mono text-text-muted mb-1 truncate" title={filename}>
            {filename}
          </p>
          <p className="text-[10px] font-mono text-text-muted">{incident.date}</p>
        </div>

        {/* Scan-line effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-blue/5 to-transparent h-8 scan-line" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted">#{incident.id}</span>
            <h3 className="text-sm font-semibold text-text-primary leading-snug">{incident.title}</h3>
          </div>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 rounded-lg bg-accent-red/20 hover:bg-accent-red/40 border border-accent-red/30 transition-all duration-200 flex-shrink-0"
            title="Delete incident"
          >
            <Trash2 className="w-3.5 h-3.5 text-accent-red" />
          </button>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">
          {incident.description}
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-sm flex items-center justify-center z-20" onClick={handleCancelDelete}>
          <div className="bg-bg-card border border-accent-red/30 rounded-xl p-4 max-w-[280px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-accent-red" />
              <h4 className="text-sm font-semibold text-text-primary">Delete Incident</h4>
            </div>
            <p className="text-[11px] text-text-muted mb-4">
              Are you sure you want to delete incident <span className="text-text-primary font-mono">#{incident.id}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelDelete}
                className="flex-1 py-2 rounded-lg border border-bg-border text-xs text-text-muted hover:text-text-primary hover:border-accent-blue/30 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg bg-accent-red text-white text-xs font-semibold hover:bg-red-600 transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default IncidentCard;
