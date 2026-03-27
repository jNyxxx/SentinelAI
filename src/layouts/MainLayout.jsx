import Sidebar from '../components/Sidebar';

/**
 * MainLayout
 */
export default function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
