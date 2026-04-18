// frontend/components/Topbar.jsx
import { html } from 'htm/react';
import { useAuth } from '../hooks/useAuth.js';
import { NavLink } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();

  return html`
    <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6 md:ml-64">
      <div className="flex-1">
        {/* Mobile menu button could go here */}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">${user?.name || 'User'}</span>
            <span className="text-xs text-gray-500">${user?.preferred_currency || 'USD'}</span>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-surfaceHover border border-border flex items-center justify-center text-sm font-medium overflow-hidden">
              ${user?.avatar_url 
                ? html`<img src=${user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />`
                : html`<span>${user?.name?.charAt(0) || '?'}</span>`
              }
            </div>
            
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
              <div className="py-1">
                <${NavLink} to="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surfaceHover hover:text-white">Profile Settings</${NavLink}>
                <button onClick=${logout} className="w-full text-left block px-4 py-2 text-sm text-rose-400 hover:bg-surfaceHover hover:text-rose-300">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}
