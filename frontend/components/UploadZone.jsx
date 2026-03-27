import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

/**
 * UploadZone — Drag-and-drop + click-to-upload area for Video Processing page.
 */
export default function UploadZone({ onFilesSelected }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected?.(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    onFilesSelected?.(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${dragging
          ? 'border-accent-blue bg-accent-blue/5 shadow-glow'
          : 'border-bg-border bg-bg-card/50 hover:border-accent-blue/50 hover:bg-bg-card'
        }
      `}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".mp4,.avi,.mov,.jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-300 ${dragging ? 'border-accent-blue bg-accent-blue/20' : 'border-bg-border bg-bg-secondary'}`}>
          <UploadCloud className={`w-7 h-7 transition-colors duration-300 ${dragging ? 'text-accent-blue' : 'text-text-muted'}`} />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            {dragging ? 'Drop files here' : 'Drag and drop video and images files here'}
          </p>
          <p className="text-xs text-text-muted">Supported formats: MP4, AVI, MOV, JPG, PNG (Max 200MB per file)</p>
        </div>

        <button
          className="px-6 py-2.5 bg-accent-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors duration-200"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Select Files
        </button>
      </div>
    </div>
  );
}
