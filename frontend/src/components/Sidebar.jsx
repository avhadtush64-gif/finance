import React from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/transactions', label: 'Transactions', icon: '💳' },
  { path: '/budgets', label: 'Budgets', icon: '📋' },
  { path: '/categories', label: 'Categories', icon: '📁' },
  { path: '/reports', label: 'Reports', icon: '📈' }
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border hidden md:flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-xl shadow-lg shadow-accent/20">
          💰
        </div>
        <h1 className="text-xl font-bold tracking-tight">Finance</h1>
      </div>

      <nav className="flex-1 px-4 py-2 flex flex-col gap-1.5">
        {LINKS.map(link => (
          <NavLink 
            key={link.path}
            to={link.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive ? 'bg-accent/10 text-accent border-l-2 border-accent' : 'text-gray-400 hover:bg-surfaceHover hover:text-white'}
            `}
          >
            <span className="text-lg opacity-80">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
