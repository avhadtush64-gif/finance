import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Alert from '../components/Alert.jsx';
import { CURRENCIES } from '../utils/constants.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    preferred_currency: user?.preferred_currency || 'USD'
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const { fetchApi } = await import('../utils/api.js');
      const data = await fetchApi('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      setUser(data.user);
      setMsg('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('WARNING: This will permanently delete your account and ALL data. Proceed?')) return;
    try {
      const { fetchApi } = await import('../utils/api.js');
      await fetchApi('/auth/me', { method: 'DELETE' });
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Profile Settings</h1>
        <p className="text-gray-400">Manage your account and preferences.</p>
      </header>

      <Alert type="success" message={msg} />
      <Alert type="error" message={error} />

      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Full Name</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Email</label>
            <input 
              type="email" disabled
              value={user?.email || ''}
              className="bg-bg/50 border border-border rounded-lg p-2.5 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Preferred Currency</label>
            <select 
              value={formData.preferred_currency}
              onChange={(e) => setFormData({...formData, preferred_currency: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">All dashboard numbers will be converted to this currency.</p>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button 
              type="submit" disabled={loading}
              className="bg-accent hover:bg-emerald-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6">
        <h3 className="text-lg font-medium text-rose-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          onClick={handleDelete}
          className="bg-rose-500/20 hover:bg-rose-500 hover:text-white border border-rose-500/50 text-rose-400 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
