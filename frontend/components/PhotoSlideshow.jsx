import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Shield } from 'lucide-react';

/**
 * PhotoSlideshow Component
 * Displays evidence photos with navigation, thumbnails, and zoom functionality
 *
 * Props:
 * - photos: Array of frame objects from backend { frameIndex, base64, createdAt }
 *           or array of base64 strings
 *           or array of placeholder objects with gradient
 * - incidentClassification: Classification string for placeholder generation
 * - showLabels: Boolean to show Before/During/Aftermath labels
 */
export default function PhotoSlideshow({ photos, incidentClassification, showLabels = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  // Normalize photos to handle different formats
  const getPhotos = () => {
    if (!photos || photos.length === 0) {
      return generatePlaceholderPhotos(incidentClassification);
    }
    
    // Normalize backend response format to usable photo objects
    return photos.map((photo, index) => {
      // Backend format: { frameIndex, base64, createdAt }
      if (typeof photo === 'object' && photo.base64) {
        return {
          id: photo.frameIndex || index,
          base64: photo.base64,
          timestamp: photo.createdAt ? new Date(photo.createdAt).toLocaleTimeString('en-US', { hour12: false }) : null,
          isBackend: true,
        };
      }
      // Base64 string format
      if (typeof photo === 'string') {
        return {
          id: index,
          base64: photo,
          timestamp: null,
          isBackend: true,
        };
      }
      // Placeholder format with gradient
      return photo;
    });
  };

  const slideshowPhotos = getPhotos();

  // Get label for each photo based on position
  const getPhotoLabel = (index, total) => {
    if (!showLabels || total !== 3) return null;
    
    const labels = ['Before Incident', 'Incident Occurred', 'Aftermath'];
    return labels[index] || `Evidence Photo ${index + 1}`;
  };

  const currentLabel = getPhotoLabel(currentIndex, slideshowPhotos.length);

  function generatePlaceholderPhotos(classification) {
    const gradients = {
      'Unauthorized Access': ['from-red-900 to-slate-900', 'from-slate-900 to-red-950', 'from-red-950 to-slate-800'],
      'Loitering': ['from-amber-900 to-slate-900', 'from-slate-900 to-amber-950', 'from-amber-950 to-slate-800'],
      'Object Detected': ['from-blue-900 to-slate-900', 'from-slate-900 to-blue-950', 'from-blue-950 to-slate-800'],
      'Suspicious Activity': ['from-orange-900 to-slate-900', 'from-slate-900 to-orange-950', 'from-orange-950 to-slate-800'],
      'Normal Movement': ['from-emerald-900 to-slate-900', 'from-slate-900 to-emerald-950', 'from-emerald-950 to-slate-800'],
    };

    const selectedGradients = gradients[classification] || ['from-slate-900 to-slate-800', 'from-slate-800 to-slate-900', 'from-slate-900 to-slate-950'];

    return [
      { id: 1, gradient: selectedGradients[0], label: 'Evidence Photo 1', timestamp: '14:23:11' },
      { id: 2, gradient: selectedGradients[1], label: 'Evidence Photo 2', timestamp: '14:23:15' },
      { id: 3, gradient: selectedGradients[2], label: 'Evidence Photo 3', timestamp: '14:23:22' },
    ];
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'Escape' && isZoomed) {
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed]);

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isAutoPlaying && slideshowPhotos.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideshowPhotos.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, slideshowPhotos.length]);

  const nextPhoto = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slideshowPhotos.length);
  }, [slideshowPhotos.length]);

  const prevPhoto = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slideshowPhotos.length) % slideshowPhotos.length);
  }, [slideshowPhotos.length]);

  const handleMouseMove = (e) => {
    if (isZoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
    }
  };

  const currentPhoto = slideshowPhotos[currentIndex];
  const hasBase64 = currentPhoto?.base64 || typeof currentPhoto === 'string';

  return (
    <div className="space-y-3">
      {/* Main Photo Viewer */}
      <div
        className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 group"
        onMouseEnter={() => setIsAutoPlaying(true)}
        onMouseLeave={() => setIsAutoPlaying(false)}
      >
        {/* Photo Content */}
        <div
          className={`w-full h-full transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-grabbing' : 'scale-100 cursor-grab'}`}
          style={isZoomed ? {
            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
          } : {}}
          onMouseMove={handleMouseMove}
        >
          {hasBase64 ? (
            <img
              src={currentPhoto.base64 || currentPhoto}
              alt={`Evidence ${currentIndex + 1}`}
              className="w-full h-full object-cover"
              onDoubleClick={() => setIsZoomed(!isZoomed)}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${currentPhoto.gradient} flex items-center justify-center`}
              onDoubleClick={() => setIsZoomed(!isZoomed)}
            >
              <div className="text-center space-y-2">
                <Shield className="w-16 h-16 text-text-muted/30 mx-auto" />
                <p className="text-[10px] font-mono text-text-muted/50">{currentPhoto.label}</p>
                {currentPhoto.timestamp && (
                  <p className="text-[9px] font-mono text-text-muted/30">{currentPhoto.timestamp}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grid Overlay Effect */}
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

        {/* Navigation Arrows */}
        {slideshowPhotos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-primary/90 border border-bg-border/50 flex items-center justify-center text-text-secondary hover:text-accent-blue hover:border-accent-blue/50 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-primary/90 border border-bg-border/50 flex items-center justify-center text-text-secondary hover:text-accent-blue hover:border-accent-blue/50 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="w-7 h-7 rounded-md bg-bg-primary/90 border border-bg-border/50 flex items-center justify-center text-text-secondary hover:text-accent-blue transition-colors"
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Photo Counter Badge */}
        {slideshowPhotos.length > 1 && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-bg-primary/90 border border-bg-border/50">
            <span className="text-[10px] font-mono text-text-secondary">
              {currentIndex + 1} / {slideshowPhotos.length}
            </span>
          </div>
        )}

        {/* Dot Indicators */}
        {slideshowPhotos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {slideshowPhotos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? 'bg-accent-blue w-4'
                    : 'bg-text-muted/40 w-1.5 hover:bg-text-muted/60'
                }`}
                aria-label={`Go to photo ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Auto-play indicator */}
        {isAutoPlaying && slideshowPhotos.length > 1 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            <span className="text-[9px] font-mono text-text-muted/70">AUTO</span>
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {slideshowPhotos.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-bg-border scrollbar-track-transparent">
          {slideshowPhotos.map((photo, idx) => {
            const photoHasBase64 = photo?.base64 || typeof photo === 'string';
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                  idx === currentIndex
                    ? 'border-accent-blue ring-2 ring-accent-blue/20'
                    : 'border-bg-border/50 hover:border-accent-blue/50'
                }`}
              >
                {photoHasBase64 ? (
                  <img src={photo.base64 || photo} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${photo.gradient}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Photo Info */}
      <div className="text-center">
        <p className="text-[10px] font-mono text-text-muted">
          {currentLabel || (hasBase64 ? 'Evidence Photo' : currentPhoto.label)} • {currentPhoto.timestamp || currentPhoto?.createdAt || 'N/A'}
        </p>
      </div>
    </div>
  );
}
