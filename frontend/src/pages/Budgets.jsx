import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import BudgetCard from '../components/BudgetCard.jsx';
import Modal from '../components/Modal.jsx';
import Alert from '../components/Alert.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CURRENCIES } from '../utils/constants.js';

export default function Budgets() {
  const { data, loading, error, execute } = useFetch('/budgets');
  const { data: catData } = useFetch('/categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  
  const categories = catData?.categories?.filter(c => c.type === 'expense') || [];
  
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    currency: 'USD',
    period: 'monthly',
    notify_at_percent: 80
  });

  const handleOpenAdd = () => {
    if (categories.length > 0) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }));
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      const { fetchApi } = await import('../utils/api.js');
      await fetchApi('/budgets', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      execute();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      const { fetchApi } = await import('../utils/api.js');
      await fetchApi(`/budgets/${id}`, { method: 'DELETE' });
      execute();
    } catch (err) {
      alert(err.message);
    }
  };

  const budgets = data?.budgets || [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Budgets</h1>
          <p className="text-gray-400">Set limits and get notified before you overspend.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-accent hover:bg-emerald-400 text-white font-medium py-2 px-4 rounded-xl transition-colors whitespace-nowrap"
        >
          + Create Budget
        </button>
      </header>

      <Alert message={error} />
      {loading && !data ? <LoadingSpinner /> : null}

      {!loading && budgets.length === 0 ? <EmptyState message="No budgets set yet." icon="🎯" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => <BudgetCard key={b.id} budget={b} onDelete={handleDelete} />)}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Budget">
        <Alert message={actionError} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Category</label>
            <select 
              required
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Amount</label>
              <input 
                type="number" step="1" min="1" required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent font-mono"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Currency</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Period</label>
            <select 
              value={formData.period}
              onChange={(e) => setFormData({...formData, period: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Alert me when I reach (%)</label>
            <input 
              type="number" min="1" max="100" required
              value={formData.notify_at_percent}
              onChange={(e) => setFormData({...formData, notify_at_percent: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-emerald-400">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
