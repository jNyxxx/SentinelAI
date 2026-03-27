import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import LiveMonitor from './pages/LiveMonitor';
import VideoUpload from './pages/VideoUpload';
import IncidentReports from './pages/IncidentReports';
import IncidentDetail from './pages/IncidentDetail';
import Settings from './pages/Settings';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
          <div className="bg-bg-card border border-accent-red/30 rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-accent-red/20 border border-accent-red/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live-monitor" element={<LiveMonitor />} />
            <Route path="/video-uploads" element={<VideoUpload />} />
            <Route path="/incident-reports" element={<IncidentReports />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
            <Route path="/settings" element={<Settings />} />
            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
