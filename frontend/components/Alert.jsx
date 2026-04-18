// frontend/components/Alert.jsx
import { html } from 'htm/react';

export default function Alert({ type = 'error', message }) {
  if (!message) return null;

  const bg = type === 'error' ? 'bg-red-500/10' : 'bg-emerald-500/10';
  const border = type === 'error' ? 'border-red-500/20' : 'border-emerald-500/20';
  const text = type === 'error' ? 'text-red-400' : 'text-emerald-400';

  return html`
    <div className=${`p-4 rounded-xl border mb-4 animate-fade-in ${bg} ${border}`}>
      <p className=${`text-sm font-medium ${text}`}>${message}</p>
    </div>
  `;
}
