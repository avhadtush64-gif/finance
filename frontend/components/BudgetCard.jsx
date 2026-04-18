// frontend/components/BudgetCard.jsx
import { html } from 'htm/react';
import { formatCurrency, formatPercent } from '../utils/formatters.js';

export default function BudgetCard({ budget, onDelete }) {
  const pct = Math.min(budget.percent_used, 100);
  let colorClass = 'bg-emerald-500';
  let textClass = 'text-emerald-400';
  let statusText = 'On track';
  
  if (budget.is_overrun) {
    colorClass = 'bg-rose-500';
    textClass = 'text-rose-400';
    statusText = 'Over budget!';
  } else if (budget.percent_used >= budget.notify_at_percent) {
    colorClass = 'bg-amber-500';
    textClass = 'text-amber-400';
    statusText = 'Warning';
  }

  return html`
    <div className="bg-surface border border-border rounded-xl p-6 transition-transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">${budget.category_icon || '📁'}</span>
          <h4 className="font-medium">${budget.category_name}</h4>
        </div>
        <button onClick=${() => onDelete(budget.id)} className="text-xs text-gray-500 hover:text-rose-400 transition-colors">Delete</button>
      </div>
      
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400 capitalize">${budget.period}</span>
        <span className="font-mono">
          ${formatCurrency(budget.spent)} / <span className="text-gray-400">${formatCurrency(budget.amount)}</span>
        </span>
      </div>

      <div className="w-full h-2.5 bg-bg rounded-full overflow-hidden mb-2 border border-border/50">
        <div className=${`h-full rounded-full transition-all duration-500 ${colorClass}`} style=${{ width: `${pct}%` }}></div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="font-mono ${textClass}">${formatPercent(budget.percent_used)} used</span>
        <span className=${textClass}>${statusText}</span>
      </div>
    </div>
  `;
}
