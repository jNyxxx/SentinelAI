import { useState, useEffect } from 'react';
import { Clock, Zap, CheckCircle, X, AlertTriangle, Info } from 'lucide-react';
import Topbar from '../components/Topbar';
import UploadZone from '../components/UploadZone';
import { incidentApi } from '../services/api';
import { SESSION_KEYS } from '../utils/sessionManager';

const stageConfig = {
  UPLOADING: { color: 'text-text-muted', bg: 'bg-bg-secondary/40 border-bg-border', barColor: 'bg-text-muted' },
  'FRAME EXTRACTION': { color: 'text-accent-cyan', bg: 'bg-accent-cyan/10 border-accent-cyan/30', barColor: 'bg-accent-cyan' },
  'AI INFERENCE': { color: 'text-accent-blue', bg: 'bg-accent-blue/10 border-accent-blue/30', barColor: 'bg-accent-blue' },
  'COMPLETE': { color: 'text-accent-green', bg: 'bg-accent-green/10 border-accent-green/30', barColor: 'bg-accent-green' },
  ERROR: { color: 'text-accent-red', bg: 'bg-accent-red/10 border-accent-red/30', barColor: 'bg-accent-red' },
};

function Toast({ message, type, onClose }) {
  const icons = {
    error: <X className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  const colors = {
    error: 'bg-accent-red/20 border-accent-red/40 text-accent-red',
    success: 'bg-accent-green/20 border-accent-green/40 text-accent-green',
    info: 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[type]} card-glow`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function QueueItem({ item, onCancel }) {
  const cfg = stageConfig[item.stage] || stageConfig['FRAME EXTRACTION'];

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-4 card-glow flex gap-4 hover:border-accent-blue/20 transition-all duration-300">
      {/* Thumbnail */}
      <div className="w-24 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 bg-grid flex-shrink-0 overflow-hidden border border-bg-border" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-text-primary truncate">{item.filename}</p>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border tracking-wider flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
            {item.stage}
          </span>
        </div>

        <p className="text-xs text-text-muted mb-3 leading-relaxed">{item.detail}</p>

        {/* Progress bar */}
        <div className="h-1.5 bg-bg-border rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${cfg.barColor} rounded-full transition-all duration-700`}
            style={{ width: `${item.progress}%` }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {item.fps && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
                <Zap className="w-3 h-3" />
                {item.fps}
              </span>
            )}
            {item.remaining && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
                <Clock className="w-3 h-3" />
                {item.remaining}
              </span>
            )}
            {item.incidents > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-accent-orange">
                <AlertTriangle className="w-3 h-3" />
                {item.incidents} Potential Incident{item.incidents > 1 ? 's' : ''} Detected
              </span>
            )}
            {item.stage === 'COMPLETE' && item.incidents === 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-accent-green">
                <CheckCircle className="w-3 h-3" />
                No Incidents
              </span>
            )}
          </div>

          {item.stage !== 'COMPLETE' && (
            <button
              onClick={() => onCancel(item.id)}
              className="text-[10px] font-mono text-accent-red border border-accent-red/30 px-2.5 py-1 rounded hover:bg-accent-red/10 transition-all duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoUpload() {
  // Load queue from localStorage on mount (session-based)
  const [queue, setQueue] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEYS.QUEUE);
    return saved ? JSON.parse(saved) : [];
  });

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Save queue to localStorage whenever it changes (session-based)
  useEffect(() => {
    localStorage.setItem(SESSION_KEYS.QUEUE, JSON.stringify(queue));
  }, [queue]);

  // Poll for completed incidents from backend
  useEffect(() => {
    async function checkCompletedIncidents() {
      try {
        const incidents = await incidentApi.getAllIncidents();
        
        setQueue(prev => prev.map(item => {
          // Skip if already complete
          if (item.stage === 'COMPLETE') return item;
          
          // Find matching incident by filename within last hour
          const match = incidents.find(inc => {
            if (!inc.fileName) return false;
            const filenameMatch = inc.fileName === item.filename;
            const timeMatch = new Date(inc.createdAt) > new Date(Date.now() - 3600000); // Last hour
            return filenameMatch && timeMatch;
          });
          
          if (match) {
            const riskLevel = match.riskLevel || 'Unknown';
            const classification = match.classification || 'Unknown';
            const incidents_count = /high|medium/i.test(riskLevel) ? 1 : 0;
            
            return {
              ...item,
              stage: 'COMPLETE',
              detail: `Complete — ${classification} (${riskLevel})`,
              progress: 100,
              remaining: null,
              incidents: incidents_count,
            };
          }
          return item;
        }));
      } catch (error) {
        console.error('Failed to check completed incidents:', error);
      }
    }
    
    // Check immediately on mount
    checkCompletedIncidents();
    
    // Poll every 5 seconds
    const interval = setInterval(checkCompletedIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateQueueItem = (id, patch) =>
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  // Clear upload history
  const clearHistory = () => {
    localStorage.removeItem(SESSION_KEYS.QUEUE);
    setQueue([]);
    addToast('Upload history cleared', 'success');
  };

  const uploadAndAnalyze = async (id, file) => {
    try {
      const fd = new FormData();
      const isVideo = file.type.startsWith('video/');
      const paramName = isVideo ? 'video' : 'files';

      fd.append(paramName, file);

      updateQueueItem(id, {
        stage: 'UPLOADING',
        detail: isVideo ? 'Uploading video...' : 'Uploading image...',
        progress: 10,
      });

      if (isVideo) {
        updateQueueItem(id, {
          stage: 'FRAME EXTRACTION',
          detail: 'Extracting frames via FFmpeg…',
          progress: 25,
          remaining: 'Processing…',
        });

        updateQueueItem(id, { stage: 'AI INFERENCE', detail: 'Running AI analysis…', progress: 60 });
        
        try {
          const result = await incidentApi.analyzeVideo(fd);

          const riskLevel = result?.riskLevel ?? 'Unknown';
          const classification = result?.classification ?? 'Unknown';
          const incidents = typeof riskLevel === 'string' && /high|medium/i.test(riskLevel) ? 1 : 0;

          updateQueueItem(id, {
            stage: 'COMPLETE',
            detail: `Complete — ${classification} (${riskLevel})`,
            progress: 100,
            remaining: null,
            incidents,
          });
          
          addToast(`Video processed: ${classification} (${riskLevel})`, 'success');
        } catch (apiError) {
          throw apiError;
        }
      } else {
        updateQueueItem(id, {
          stage: 'AI INFERENCE',
          detail: 'Analyzing image with AI…',
          progress: 50,
        });

        try {
          const result = await incidentApi.analyzeIncidents(fd);

          const riskLevel = result?.riskLevel ?? 'Unknown';
          const classification = result?.classification ?? 'Unknown';
          const incidents = typeof riskLevel === 'string' && /high|medium/i.test(riskLevel) ? 1 : 0;

          updateQueueItem(id, {
            stage: 'COMPLETE',
            detail: `Complete — ${classification} (${riskLevel})`,
            progress: 100,
            remaining: null,
            incidents,
          });

          addToast(`Analysis complete: ${classification} (${riskLevel})`, 'success');
        } catch (apiError) {
          throw apiError;
        }
      }
    } catch (e) {
      const errorMessage = e?.message || 'Failed to process file. Please try again.';

      updateQueueItem(id, {
        stage: 'ERROR',
        detail: `Failed: ${errorMessage}`,
        progress: 100,
        remaining: null,
      });

      addToast(errorMessage, 'error');
    }
  };

  const handleFilesSelected = (files) => {
    const now = Date.now();
    const selected = (files || []).filter(
      (f) => f && (f.type?.startsWith('video/') || f.type?.startsWith('image/') || /\.(mp4|mov|avi|jpg|jpeg|png|webp)$/i.test(f.name))
    );
    
    const itemsWithFiles = selected.map((file, i) => ({
      file,
      item: {
        id: now + i,
        filename: file.name,
        stage: 'UPLOADING',
        detail: 'Queued…',
        fps: null,
        remaining: 'Starting…',
        progress: 0,
        incidents: 0,
      },
    }));

    if (itemsWithFiles.length === 0) {
      return;
    }

    setQueue((q) => [...q, ...itemsWithFiles.map((x) => x.item)]);
    
    addToast(`${selected.length} file(s) added to processing queue`, 'info');

    // Start processing each file
    itemsWithFiles.forEach(({ item, file }) => {
      uploadAndAnalyze(item.id, file);
    });
  };

  const handleCancel = (id) => setQueue((q) => q.filter((item) => item.id !== id));

  const activeTasks = queue.filter((q) => q.stage !== 'COMPLETE').length;

  return (
    <>
      <Topbar title="Video Upload & Processing" subtitle="Deploy AI forensic analysis on recorded footage" />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-6 bg-grid space-y-6">
        {/* Header with Clear History button */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-text-muted max-w-lg">
              Deploy AI-powered forensic analysis on recorded surveillance footage.
              Upload MP4/AVI files for batch incident detection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearHistory}
              disabled={queue.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-accent-red/30 rounded-lg text-xs text-accent-red hover:bg-accent-red/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear History
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        <UploadZone onFilesSelected={handleFilesSelected} />

        {/* Processing Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-base text-text-primary tracking-wide">
                Processing Queue
              </h2>
              {activeTasks > 0 && (
                <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full bg-accent-blue text-white tracking-wider">
                  {activeTasks} Active Task{activeTasks > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="bg-bg-card border border-bg-border rounded-xl p-8 text-center">
              <p className="text-text-muted text-sm">Queue is empty. Upload files to begin processing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <QueueItem key={item.id} item={item} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
