// frontend/components/CategoryBadge.jsx
import { html } from 'htm/react';

export default function CategoryBadge({ name, icon, color }) {
  const badgeStyle = {
    backgroundColor: `${color}15`, // 15% opacity hex
    color: color || '#9ca3af',
    borderColor: `${color}30`
  };

  return html`
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
      style=${badgeStyle}
    >
      <span>${icon || '📁'}</span>
      ${name}
    </span>
  `;
}
