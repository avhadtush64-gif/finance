// frontend/components/StatCard.jsx
import { html } from 'htm/react';

export default function StatCard({ label, value, isPositive = null, icon }) {
  let valueColor = 'text-gray-200';
  if (isPositive === true) valueColor = 'text-emerald-400';
  if (isPositive === false) valueColor = 'text-rose-400';

  return html`
    <div className="bg-surface border border-border rounded-xl p-6 transition-transform hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">${label}</h3>
        <span className="text-xl opacity-80">${icon}</span>
      </div>
      <div className=${`text-2xl font-mono font-medium ${valueColor} text-right`}>
        ${value}
      </div>
    </div>
  `;
}
