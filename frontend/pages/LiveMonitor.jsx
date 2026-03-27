import { useState, useEffect, useRef } from 'react';
import { Activity, Camera, Play, Square, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import AlertCard from '../components/AlertCard';
import { incidentApi, cameraApi } from '../services/api';
import { SESSION_KEYS } from '../utils/sessionManager';

/**
 * LiveMonitor - Real webcam monitoring with AI analysis
 */
export default function LiveMonitor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanInterval = useRef(null);
  const heartbeatInterval = useRef(null);
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  
  // Load alerts from localStorage on mount (session-based)
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEYS.ALERTS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [realTimeFrames, setRealTimeFrames] = useState([]);
  const [scanCount, setScanCount] = useState(0);

  // Save alerts to localStorage whenever they change (session-based)
  useEffect(() => {
    localStorage.setItem(SESSION_KEYS.ALERTS, JSON.stringify(alerts));
  }, [alerts]);

  // Poll for recent high-risk incidents to populate alerts
  useEffect(() => {
    async function fetchRecentAlerts() {
      try {
        const incidents = await incidentApi.getAllIncidents();
        
        // Get high/medium risk incidents from last 30 minutes
        const recentAlerts = incidents
          .filter(inc => {
            const riskLevel = (inc.riskLevel || '').toLowerCase();
            const isHighRisk = riskLevel.includes('high') || riskLevel.includes('medium');
            const isRecent = new Date(inc.createdAt) > new Date(Date.now() - 1800000); // 30 min
            return isHighRisk && isRecent;
          })
          .slice(0, 5) // Keep only 5 most recent
          .map(inc => ({
            id: `incident-${inc.id}`,
            title: inc.classification || 'Suspicious Activity',
            riskLevel: inc.riskLevel || 'High',
            camera: inc.camera || 'Live Feed',
            timestamp: inc.createdAt,
            confidence: inc.confidence,
            incidentId: inc.id
          }));
        
        // Merge with existing alerts, avoid duplicates
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newAlerts = recentAlerts.filter(a => !existingIds.has(a.id));
          return [...newAlerts, ...prev].slice(0, 10); // Keep max 10 alerts
        });
      } catch (error) {
        console.error('Failed to fetch recent alerts:', error);
      }
    }
    
    // Fetch immediately
    fetchRecentAlerts();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchRecentAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Start webcam
  const startWebcam = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080, facingMode: 'user' }
      });

      setStream(mediaStream);

      // Attach stream to video element after React renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              console.log('Video playing successfully');
            }).catch(err => {
              console.error('Video play error:', err);
            });
          };
        }
      }, 100);

      // Register webcam as active camera in backend
      try {
        await cameraApi.registerWebcam();
        console.log('Webcam registered as active camera');
      } catch (regError) {
        console.warn('Failed to register webcam:', regError);
      }

      setIsScanning(true);
      setScanCount(0);
      setRealTimeFrames([]);
      // Don't clear alerts - keep them persistent

      // Start auto-scan every 10 seconds
      startAutoScan();
      
      // Send heartbeat every 5 seconds to keep camera active
      startHeartbeat();
    } catch (err) {
      setError('Failed to access webcam: ' + err.message);
      console.error('Webcam error:', err);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
    }

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    // Unregister webcam from backend
    cameraApi.unregisterWebcam().catch(err => {
      console.warn('Failed to unregister webcam:', err);
    });

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  // Capture 3 frames from video stream and analyze
  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Capture failed: video or canvas ref is null');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      // Check if video is ready and has valid dimensions
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('Video not ready for capture - readyState:', video.readyState, 'dimensions:', video.videoWidth, 'x', video.videoHeight);
        return; // Skip this capture, will retry on next interval
      }

      // Set canvas size to match video (1920x1080)
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      const ctx = canvas.getContext('2d');
      const frames = [];

      // Capture 3 frames in rapid succession (2 seconds apart)
      // Frame 0: Before incident, Frame 1: During incident, Frame 2: Aftermath
      for (let i = 0; i < 3; i++) {
        // Re-check video readiness before each frame
        if (video.readyState < 2) {
          console.warn('Video became unready during capture at frame', i);
          break;
        }

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (blob) {
          frames.push(blob);
        } else {
          console.error('Failed to create blob from canvas');
        }

        // Wait 2 seconds between frames (except after last frame)
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (frames.length === 0) {
        console.warn('No frames captured - video may not be ready yet');
        return;
      }

      // Create FormData with all 3 frames
      const formData = new FormData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      frames.forEach((blob, i) => {
        const label = i === 0 ? 'before' : i === 1 ? 'during' : 'after';
        formData.append('files', blob, `frame_${timestamp}_${label}_${i}.jpg`);
      });

      // Send to AI analysis
      const analysis = await incidentApi.analyzeIncidents(formData);

      // Update scan count
      setScanCount(prev => prev + 1);

      // Add to Real-Time Analysis panel with thumbnail for flagged incidents
      const frameData = {
        id: Date.now(),
        flagged: analysis?.riskLevel === 'High' || analysis?.riskLevel === 'Medium',
        timestamp: new Date().toISOString(),
        riskLevel: analysis?.riskLevel || 'Unknown',
        classification: analysis?.classification || 'Unknown',
        confidence: analysis?.confidence || 'N/A',
        framesCaptured: frames.length,
        incidentId: analysis?.id || null,
        // Store first frame as thumbnail for High/Medium risk
        thumbnail: (analysis?.riskLevel === 'High' || analysis?.riskLevel === 'Medium') 
          ? URL.createObjectURL(frames[0]) 
          : null
      };

      setRealTimeFrames(prev => [frameData, ...prev.slice(0, 3)]);

      // Create alert if suspicious (Medium or High risk)
      if (frameData.flagged) {
        const newAlert = {
          id: Date.now(),
          title: analysis?.classification || 'Suspicious Activity',
          riskLevel: analysis?.riskLevel || 'High',
          camera: 'Webcam (Live)',
          timestamp: new Date().toISOString(),
          confidence: analysis?.confidence,
          incidentId: analysis?.id
        };
        setAlerts(prev => [newAlert, ...prev]);
      }
    } catch (err) {
      console.error('Error capturing frame - FULL ERROR:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      // Determine error type and show appropriate message
      let errorMessage = 'Failed to capture frame';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Backend server not running - Start the backend on port 8082';
      } else if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ERR_NETWORK')) {
        errorMessage = 'Cannot connect to backend (port 8082) - Is the server running?';
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Backend unreachable - Start Spring Boot server on port 8082';
      } else if (err.message?.includes('HTTP 500')) {
        errorMessage = 'Backend error (500) - Check backend console for details';
      } else if (err.message?.includes('HTTP 4')) {
        errorMessage = 'Backend error: ' + err.message;
      } else if (err.message) {
        errorMessage = 'Error: ' + err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Start auto-scan every 10 seconds
  const startAutoScan = () => {
    // Capture immediately
    captureAndAnalyzeFrame();

    // Then every 10 seconds
    scanInterval.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 10000);
  };

  // Send heartbeat to backend every 5 seconds to keep camera active
  const startHeartbeat = () => {
    heartbeatInterval.current = setInterval(async () => {
      try {
        await cameraApi.webcamHeartbeat();
      } catch (err) {
        console.warn('Heartbeat failed:', err);
      }
    }, 5000);
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setAlerts([]);
    localStorage.removeItem('liveMonitorAlerts');
  };

  // Dismiss single alert
  const dismissAlert = (alert) => {
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
  };

  // Check camera permissions
  const checkCameraPermissions = async () => {
    try {
      // Check if browser supports permissions API
      if (!navigator.permissions) {
        setError('Permissions API not supported. Please check browser settings manually.');
        return;
      }

      // Query camera permission status
      const result = await navigator.permissions.query({ name: 'camera' });
      
      let message = '';
      if (result.state === 'granted') {
        message = 'Camera permission granted. If webcam still does not work, try refreshing the page.';
      } else if (result.state === 'denied') {
        message = 'Camera permission denied. Please allow camera access in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Find "Camera" permission\n3. Change to "Allow"\n4. Refresh this page';
      } else {
        message = 'Camera permission not yet requested. Click "Start Webcam" to grant permission.';
      }

      // Show permission status in a more user-friendly way
      alert('Camera Permission Status\n\n' + message);
      
      // If denied, try to request permission again
      if (result.state === 'denied') {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
          // Permission still denied, user needs to manually change in browser
          console.log('User needs to manually allow camera in browser settings');
        }
      }
    } catch (err) {
      console.error('Failed to check camera permissions:', err);
      setError('Could not check permissions: ' + err.message);
    }
  };

  // View incident report for alert
  const viewReportForAlert = (alert) => {
    if (alert.incidentId) {
      navigate(`/incident/${alert.incidentId}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <>
      <Topbar
        title="Live Scanning Interface"
        subtitle="Real-time AI monitoring via webcam"
      />

      <main className="flex-1 overflow-y-auto p-6 bg-grid">
        <div className="grid grid-cols-12 gap-6">

          {/* ── Left Column: Webcam Feed + Alerts ─────── */}
          <div className="col-span-9 flex flex-col gap-6">

            {/* Webcam Feed - 16:9 aspect ratio */}
            <div className="w-full" style={{ aspectRatio: '16/9', minHeight: '480px' }}>
              <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-bg-border card-glow">
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Video element */}
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    preload="auto"
                    onLoadedMetadata={() => {
                      console.log('Video metadata loaded:', videoRef.current?.videoWidth, videoRef.current?.videoHeight);
                    }}
                    onLoadedData={() => {
                      console.log('Video data loaded, playing:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectFit: 'cover',
                      zIndex: 1,
                      backgroundColor: '#1e293b'
                    }}
                  />
                ) : (
                  /* Offline Empty State - Centered */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-text-muted">
                    <div className="w-20 h-20 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center">
                      <Camera className="w-10 h-10 opacity-40" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-semibold text-text-primary">Webcam Offline</h3>
                      <p className="text-sm text-text-muted max-w-md">
                        No active video input detected. Connect a camera or allow browser access to begin monitoring.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={startWebcam}
                        className="flex items-center gap-2 px-5 py-2.5 bg-accent-green border border-accent-green rounded-lg text-white text-sm font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg shadow-emerald-500/20"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Start Webcam
                      </button>
                      <button
                        onClick={checkCameraPermissions}
                        className="flex items-center gap-2 px-5 py-2.5 bg-bg-card border border-bg-border rounded-lg text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-accent-blue/40 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Check Permissions
                      </button>
                    </div>
                  </div>
                )}

                {/* Live badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg border border-accent-red/40 z-10">
                  <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${isScanning ? 'bg-accent-red' : 'bg-gray-500'}`} />
                  <span className="text-[10px] font-mono text-white tracking-wider font-semibold">
                    {isScanning ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Scan counter */}
                {isScanning && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg border border-bg-border z-10">
                    <span className="text-[10px] font-mono text-text-secondary">
                      Scans: {scanCount}
                    </span>
                  </div>
                )}

                {/* Controls */}
                {stream && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={stopWebcam}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-red/80 backdrop-blur-sm border border-accent-red rounded-lg text-white text-sm font-bold hover:bg-red-600 transition-all duration-200"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        Stop Scan
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted">
                      <span>1920×1080</span>
                      <span>30 FPS</span>
                    </div>
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="absolute top-16 left-4 right-4 bg-accent-red/20 border border-accent-red/40 rounded-lg px-3 py-2 z-10">
                    <p className="text-[9px] font-mono text-accent-red">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Immediate Alerts */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-5 card-glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-orange/20 border border-accent-orange/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-text-primary tracking-wide">Immediate Alerts</span>
                    {alerts.length > 0 && (
                      <span className="text-[10px] text-text-muted ml-2">{alerts.length} active</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearAllAlerts}
                  className="text-xs text-text-muted hover:text-accent-blue transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={alerts.length === 0}
                >
                  Clear All
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-bg-hover border border-bg-border flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-primary font-medium mb-1">No active alerts</p>
                  <p className="text-xs text-text-muted">Live detections will appear here when monitoring starts.</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDismiss={() => dismissAlert(alert)}
                      onViewReport={() => viewReportForAlert(alert)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Analysis Rail ───────────── */}
          <div className="col-span-3 space-y-4">
            {/* Real-Time Analysis */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-4 card-glow">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-accent-blue" />
                <p className="font-display font-bold text-sm text-text-primary tracking-wide">Real-Time Analysis</p>
              </div>
              <p className="text-[10px] font-mono text-text-muted mb-4 tracking-widest uppercase">10-Second Extractions</p>

              <div className="space-y-3">
                {realTimeFrames.length > 0 ? (
                  realTimeFrames.map((frame, i) => (
                    <FrameThumb key={frame.id} index={i} flagged={frame.flagged} frameData={frame} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-bg-hover border border-bg-border flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-6 h-6 text-text-muted opacity-40" />
                    </div>
                    <p className="text-xs text-text-muted font-mono uppercase tracking-wider">Waiting for scans...</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-4 card-glow">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-accent-blue" />
                <p className="font-display font-bold text-sm text-text-primary tracking-wide">System Status</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Engine</span>
                  <span className={`text-[10px] font-mono flex items-center gap-1.5 ${isScanning ? 'text-accent-green' : 'text-text-muted'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${isScanning ? 'bg-accent-green' : 'bg-gray-500'}`} />
                    {isScanning ? 'RUNNING' : 'STANDBY'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Backend</span>
                  <span className="text-[10px] font-mono text-accent-blue flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-accent-blue" />
                    CONNECTED
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Model</span>
                  <span className="text-[10px] font-mono text-text-secondary">Sentinel v2.5</span>
                </div>
                <div className="pt-3 border-t border-bg-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Last Scan</span>
                    <span className="text-[10px] font-mono text-text-secondary">{scanCount > 0 ? `${scanCount} scans` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}

function FrameThumb({ index, flagged, frameData }) {
  const colors = [
    'from-emerald-900 to-slate-900',
    'from-red-950 to-slate-900',
    'from-slate-900 to-slate-800',
    'from-blue-950 to-slate-900',
  ];

  // Get frame type label based on the 3-frame capture sequence
  const getFrameLabel = (data) => {
    if (!data) return null;
    if (data.framesCaptured === 3) {
      return ['Before', 'During', 'After'][index] || `Frame ${index + 1}`;
    }
    return `Scan ${index + 1}`;
  };

  const riskColors = {
    'High': 'text-accent-red',
    'Medium': 'text-accent-yellow',
    'Low': 'text-accent-green',
    'Unknown': 'text-text-muted'
  };

  const borderClass = flagged ? 'border-accent-red/50' : 'border-bg-border';
  const riskClass = riskColors[frameData?.riskLevel] || 'text-text-muted';

  return (
    <div className={`rounded-lg border overflow-hidden ${borderClass}`}>
      {/* Frame thumbnail - shows captured frame or placeholder */}
      {frameData?.thumbnail ? (
        <img src={frameData.thumbnail} alt={`Frame ${index}`} className="h-20 w-full object-cover" />
      ) : (
        <div className={`h-20 bg-gradient-to-br ${colors[index % colors.length]} bg-grid relative`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-6 h-6 text-white/20" />
          </div>
        </div>
      )}

      {/* Frame info bar */}
      <div className="px-2 py-1 bg-bg-card flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] font-mono text-text-muted truncate">
            {frameData ? getFrameLabel(frameData) : `FRAME_${3342 + index * 16}.jpg`}
          </span>
          {frameData?.classification && (
            <span className="text-[7px] text-text-secondary truncate" title={frameData.classification}>
              {frameData.classification.length > 15 ? frameData.classification.substring(0, 15) + '...' : frameData.classification}
            </span>
          )}
        </div>
        <span className={`text-[8px] font-mono font-bold ${riskClass}`}>
          {frameData ? (frameData.riskLevel || 'Unknown') : (flagged ? 'SUSPICIOUS' : 'NORMAL')}
        </span>
      </div>
    </div>
  );
}
