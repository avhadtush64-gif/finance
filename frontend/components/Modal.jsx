// frontend/components/Modal.jsx
import { html } from 'htm/react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick=${onClose}>
      <div 
        className="bg-surface border border-border rounded-xl w-full max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto"
        onClick=${(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">${title}</h2>
          <button 
            onClick=${onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        ${children}
      </div>
    </div>
  `;
}
