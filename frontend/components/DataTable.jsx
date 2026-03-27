import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const riskVariantMap = {
  'High': 'orange',
  'Medium': 'yellow',
  'Low': 'green',
};

const classVariantMap = {
  'Suspicious Activity': 'orange',
  'Normal Activity': 'green',
  'Normal Movement': 'green',
  'Unrecognized Vehicle': 'yellow',
  'Unauthorized Access': 'red',
  'Object Detected': 'blue',
};

/**
 * DataTable — Recent incidents table for Dashboard.
 */
export default function DataTable({ incidents }) {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/incident/${id}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-border">
            {['Timestamp', 'File Name', 'Classification', 'Risk Level'].map((col) => (
              <th
                key={col}
                className="text-left py-3 px-4 text-[10px] font-mono font-semibold text-text-muted tracking-widest uppercase first:pl-0 last:pr-0 last:text-center"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border/50">
          {incidents.map((row) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row.id)}
              className="group hover:bg-bg-hover/50 transition-colors duration-150 cursor-pointer"
            >
              <td className="py-3.5 px-4 pl-0 font-mono text-xs text-text-secondary whitespace-nowrap">
                {row.timestamp}
              </td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/60 flex-shrink-0" />
                  <span className="text-xs text-text-primary truncate max-w-xs">{row.filename}</span>
                </div>
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge label={row.classification} variant={classVariantMap[row.classification] || 'blue'} />
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge label={row.riskLevel === 'high' ? 'High' : row.riskLevel === 'low' ? 'Low' : 'Medium'} variant={riskVariantMap[row.riskLevel === 'high' ? 'High' : row.riskLevel === 'low' ? 'Low' : 'Medium'] || 'blue'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
