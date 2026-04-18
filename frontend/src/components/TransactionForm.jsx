import React, { useState, useEffect } from 'react';
import { CURRENCIES } from '../utils/constants.js';

export default function TransactionForm({ initialData, categories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    type: 'expense',
    category_id: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    description: '',
    is_refund: false
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        category_id: initialData.category_id,
        amount: initialData.amount,
        currency: initialData.currency,
        date: initialData.date.split('T')[0],
        description: initialData.description,
        is_refund: initialData.is_refund
      });
    } else if (categories && categories.length > 0) {
      setFormData(prev => ({ ...prev, category_id: categories.find(c => c.type === 'expense')?.id || categories[0].id }));
    }
  }, [initialData, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (file) data.append('receipt', file);
    onSubmit(data);
  };

  const filteredCategories = categories?.filter(c => c.type === formData.type) || [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-400">Type</label>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value, category_id: categories.find(c => c.type === e.target.value)?.id || ''})}
            className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-400">Category</label>
          <select 
            value={formData.category_id}
            onChange={(e) => setFormData({...formData, category_id: e.target.value})}
            className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors"
            required
          >
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-400">Amount</label>
          <input 
            type="number" step="0.01" min="0.01" required
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors font-mono"
            placeholder="0.00"
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-400">Currency</label>
          <select 
            value={formData.currency}
            onChange={(e) => setFormData({...formData, currency: e.target.value})}
            className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors"
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-400">Date</label>
        <input 
          type="date" required
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-gray-400">Description (optional)</label>
        <input 
          type="text" 
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent transition-colors"
          placeholder="What was this for?"
        />
      </div>

      {!initialData && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-gray-400">Receipt (optional)</label>
          <input 
            type="file" accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="bg-bg border border-border rounded-lg p-2 text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-surfaceHover file:text-gray-200 hover:file:bg-border transition-colors"
          />
        </div>
      )}

      {formData.type === 'expense' && (
        <label className="flex items-center gap-2 text-sm text-gray-300 mt-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.is_refund}
            onChange={(e) => setFormData({...formData, is_refund: e.target.checked})}
            className="accent-accent w-4 h-4"
          />
          This is a refund (adds to your budget/balance)
        </label>
      )}

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-emerald-400 transition-colors">
          {initialData ? 'Update Transaction' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
}
