import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg flex text-gray-200 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
