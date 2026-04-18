import React from 'react';

export default function EmptyState({ message = 'No data available', icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <span className="text-4xl mb-4 opacity-50">{icon}</span>
      <p className="text-gray-400 font-medium">{message}</p>
    </div>
  );
}
