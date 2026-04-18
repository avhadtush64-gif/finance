import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { NavLink } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border shadow-sm h-16 flex items-center justify-between px-6">
      <div className="flex-1"></div>

      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm font-bold text-white tracking-wide">{user?.name || 'User'}</span>
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{user?.preferred_currency || 'USD'}</span>
          </div>
          
          <div className="w-9 h-9 rounded-full bg-surfaceHover border border-border flex items-center justify-center text-sm font-medium text-white overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-accent transition-all">
            {user?.avatar_url 
              ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span>{user?.name?.charAt(0) || '?'}</span>
            }
          </div>
          
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
            <div className="py-1">
              <NavLink to="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surfaceHover hover:text-white">Profile Settings</NavLink>
              <button onClick={logout} className="w-full text-left block px-4 py-2 text-sm text-rose-400 hover:bg-surfaceHover hover:text-rose-300">Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
