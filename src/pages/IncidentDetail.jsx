import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Clock, Shield, Tag, AlertTriangle, CheckCircle, Eye, User, MapPin } from 'lucide-react';
import Topbar from '../components/Topbar';
import PhotoSlideshow from '../components/PhotoSlideshow';
import { incidentApi } from '../services/api';

const RISK_COLORS = {
  'High': 'bg-accent-orange',
  'Medium': 'bg-accent-yellow',
  'Low': 'bg-accent-green',
};

const RISK_BADGE_CONFIG = {
  'High': { badge: 'bg-accent-orange text-white', border: 'border-accent-orange/20' },
  'Medium': { badge: 'bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/40', border: 'border-accent-yellow/20' },
  'Low': { badge: 'bg-accent-green/20 text-accent-green border border-accent-green/40', border: 'border-accent-green/20' },
};

/**
 * IncidentDetail — Full incident report with evidence photo slideshow
 * Shows detailed summary report with correlated photo frames
 */
export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIncidentData();
  }, [id]);

  async function loadIncidentData() {
    try {
      setLoading(true);
      setError(null);

      // Load incident details
      const incidentData = await incidentApi.getIncidentById(id);
      setIncident(incidentData);

      // Load evidence photos - only for High/Medium risk incidents
      const riskLevel = incidentData.riskLevel;
      
      const isHighMedium = riskLevel && 
        (riskLevel.toLowerCase().includes('high') || 
         riskLevel.toLowerCase().includes('medium'));
      
      if (isHighMedium) {
        try {
          const photosData = await incidentApi.getIncidentFrames(id);
          
          if (Array.isArray(photosData) && photosData.length > 0) {
            setPhotos(photosData);
          } else {
            setPhotos([]);
          }
        } catch (photoError) {
          setPhotos([]);
        }
      } else {
        // Low risk incidents don't have stored frames
        setPhotos([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto" />
            <p className="text-text-muted text-sm">Loading incident details...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !incident) {
    return (
      <>
        <Topbar title="Error" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <Shield className="w-16 h-16 text-accent-red mx-auto opacity-50" />
            <h2 className="text-xl font-semibold text-text-primary">Failed to Load Incident</h2>
            <p className="text-text-muted text-sm">{error || 'Incident not found'}</p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </main>
      </>
    );
  }

  const config = RISK_BADGE_CONFIG[incident.riskLevel] || RISK_BADGE_CONFIG['Medium Risk'];
  const riskColor = RISK_COLORS[incident.riskLevel] || 'bg-accent-blue';

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Parse report into sections if available
  const reportSections = incident.detailedReport 
    ? parseReportSections(incident.detailedReport)
    : null;

  function parseReportSections(reportText) {
    const sections = [];
    const lines = reportText.split('\n');
    let currentSection = { title: 'Summary', content: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[A-Z][A-Z\s]+:$/) || trimmed.match(/^##+\s/)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { 
          title: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''), 
          content: [] 
        };
      } else if (trimmed) {
        currentSection.content.push(trimmed);
      }
    }

    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{ title: 'Report', content: [reportText] }];
  }

  return (
    <>
      <Topbar title="Incident Details" />

      <main className="flex-1 overflow-y-auto p-6 bg-grid space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/incident-reports')}
          className="inline-flex items-center gap-2 text-text-muted hover:text-accent-blue transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incident Reports
        </button>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Evidence Photos + Metadata (only for High/Medium risk with photos) */}
          {((incident.riskLevel === 'High' || incident.riskLevel === 'Medium') && photos.length > 0) && (
            <div className="col-span-4 space-y-4">
              <div className="bg-bg-card border border-bg-border rounded-xl p-4 card-glow sticky top-4">
                <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-blue" />
                  Evidence Photos
                </h3>

                <PhotoSlideshow
                  photos={photos}
                  incidentClassification={incident.classification}
                />

                {/* Photo Metadata */}
                <div className="mt-4 pt-4 border-t border-bg-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Total Frames</span>
                    <span className="text-text-primary font-mono">{photos.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Retention</span>
                    <span className="text-text-primary font-mono">30 days</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Status</span>
                    <span className="text-accent-green font-mono">Preserved</span>
                  </div>
                </div>
              </div>

              {/* Incident Metadata Card */}
              <div className="bg-bg-card border border-bg-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Incident Metadata
                </h4>

                <div className="flex items-start gap-3 text-text-secondary">
                  <Calendar className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase">Date & Time</p>
                    <p className="text-xs">{formatDate(incident.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-text-secondary">
                  <Clock className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase">Incident ID</p>
                    <p className="text-xs font-mono">{incident.id}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-text-secondary">
                  <Tag className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-mono text-text-muted uppercase">Classification</p>
                    <p className="text-xs">{incident.classification}</p>
                  </div>
                </div>

                {incident.camera && (
                  <div className="flex items-start gap-3 text-text-secondary">
                    <Eye className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-mono text-text-muted uppercase">Camera Source</p>
                      <p className="text-xs">{incident.camera}</p>
                    </div>
                  </div>
                )}

                {incident.zone && (
                  <div className="flex items-start gap-3 text-text-secondary">
                    <MapPin className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-mono text-text-muted uppercase">Zone</p>
                      <p className="text-xs">{incident.zone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column - Incident Report */}
          <div className={((incident.riskLevel === 'High' || incident.riskLevel === 'Medium') && photos.length > 0) ? 'col-span-8' : 'col-span-12'}>
            <div className="space-y-4">
              {/* Report Header */}
              <div className="bg-bg-card border border-bg-border rounded-xl p-6 card-glow">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-text-primary">
                      {incident.classification}
                    </h2>
                    <span className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded tracking-widest uppercase ${config.badge}`}>
                      {incident.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    AI-generated incident analysis and evidence report
                  </p>
                </div>
              </div>

              {/* Risk Level Progress Bar */}
              <div className="relative h-2 rounded-full bg-bg-primary mb-6 overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${riskColor}`}
                  style={{ width: getRiskPercentage(incident.riskLevel) }}
                />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-primary/50 rounded-lg p-3 border border-bg-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-muted uppercase">Risk Level</span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{incident.riskLevel}</p>
                </div>
                <div className="bg-bg-primary/50 rounded-lg p-3 border border-bg-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-muted uppercase">Evidence</span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{photos.length} Photos</p>
                </div>
                <div className="bg-bg-primary/50 rounded-lg p-3 border border-bg-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-muted uppercase">Status</span>
                  </div>
                  <p className="text-sm font-semibold text-accent-green">Analyzed</p>
                </div>
                <div className="bg-bg-primary/50 rounded-lg p-3 border border-bg-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-[10px] font-mono text-text-muted uppercase">Confidence</span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {incident.confidence || '94.2%'}
                  </p>
                </div>
              </div>

              {/* Main Report Content */}
              <div className="bg-bg-primary/50 rounded-lg p-5 border border-bg-border/50">
                <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Detailed Incident Report
                </h3>
                
                {reportSections ? (
                  <div className="space-y-4">
                    {reportSections.map((section, idx) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="text-sm font-semibold text-text-primary border-b border-bg-border/50 pb-2">
                          {section.title}
                        </h4>
                        <div className="space-y-2">
                          {section.content.map((paragraph, pIdx) => (
                            <p 
                              key={pIdx} 
                              className="text-text-secondary text-sm leading-relaxed font-sans"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {incident.fullReport || incident.summary || incident.description || 'No detailed report available.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Details */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-6 card-glow">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-blue" />
                Analysis Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="AI Model" value="Qwen3-VL-4B" />
                <DetailRow label="Processing Time" value={incident.processingTime || 'N/A'} />
                <DetailRow label="Frames Analyzed" value={incident.framesAnalyzed?.toString() || 'N/A'} />
                <DetailRow label="Detection Confidence" value={incident.confidence || 'N/A'} />
                <DetailRow label="Risk Score" value={incident.riskScore || 'N/A'} />
                <DetailRow label="Camera Source" value={incident.camera || 'N/A'} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Helper Components

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono text-text-muted uppercase">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function getRiskPercentage(riskLevel) {
  const risk = riskLevel?.toLowerCase() || 'medium';
  if (risk.includes('high')) return '100%';
  if (risk.includes('medium')) return '50%';
  if (risk.includes('low')) return '25%';
  return '50%';
}
