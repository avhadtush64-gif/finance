// frontend/pages/Categories.jsx
import { useState } from 'react';
import { html } from 'htm/react';
import { useFetch } from '../hooks/useFetch.js';
import CategoryBadge from '../components/CategoryBadge.jsx';
import Modal from '../components/Modal.jsx';
import Alert from '../components/Alert.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { CATEGORY_ICONS } from '../utils/constants.js';

export default function Categories() {
  const { data, loading, error, execute } = useFetch('/categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'expense', color: '#10b981', icon: '📁' });

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormData({ name: '', type: 'expense', color: '#10b981', icon: '📁' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    if (cat.is_system) return;
    setEditingCat(cat);
    setFormData({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      const { fetchApi } = await import('../utils/api.js');
      if (editingCat) {
        await fetchApi(`/categories/${editingCat.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi('/categories', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      execute();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id, isSystem) => {
    if (isSystem) return;
    const force = window.confirm('Delete category? Any transactions will be reassigned to Uncategorized. Press OK to force delete, or Cancel.');
    if (!force) return;
    
    try {
      const { fetchApi } = await import('../utils/api.js');
      await fetchApi(`/categories/${id}?force=true`, { method: 'DELETE' });
      execute();
    } catch (err) {
      alert(err.message);
    }
  };

  const categories = data?.categories || [];
  const expenses = categories.filter(c => c.type === 'expense');
  const incomes = categories.filter(c => c.type === 'income');

  return html`
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Categories</h1>
          <p className="text-gray-400">Manage transaction categories.</p>
        </div>
        <button 
          onClick=${handleOpenAdd}
          className="bg-accent hover:bg-emerald-400 text-white font-medium py-2 px-4 rounded-xl transition-colors whitespace-nowrap"
        >
          + Add Category
        </button>
      </header>

      <${Alert} message=${error} />
      ${loading && !data ? html`<${LoadingSpinner} />` : null}

      ${!loading && categories.length === 0 ? html`<${EmptyState} />` : html`
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4 text-rose-400 border-b border-border pb-2">Expense Categories</h3>
            <div className="flex flex-col gap-2">
              ${expenses.map(cat => html`
                <div key=${cat.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:bg-surfaceHover group">
                  <${CategoryBadge} name=${cat.name} icon=${cat.icon} color=${cat.color} />
                  
                  ${!cat.is_system && html`
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick=${() => handleOpenEdit(cat)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                      <button onClick=${() => handleDelete(cat.id, cat.is_system)} className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  `}
                  ${cat.is_system && html`<span className="text-xs text-gray-500 italic">System</span>`}
                </div>
              `)}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 text-emerald-400 border-b border-border pb-2">Income Categories</h3>
            <div className="flex flex-col gap-2">
              ${incomes.map(cat => html`
                <div key=${cat.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg hover:bg-surfaceHover group">
                  <${CategoryBadge} name=${cat.name} icon=${cat.icon} color=${cat.color} />
                  
                  ${!cat.is_system && html`
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick=${() => handleOpenEdit(cat)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                      <button onClick=${() => handleDelete(cat.id, cat.is_system)} className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
                    </div>
                  `}
                  ${cat.is_system && html`<span className="text-xs text-gray-500 italic">System</span>`}
                </div>
              `)}
            </div>
          </div>
        </div>
      `}

      <${Modal} 
        isOpen=${isModalOpen} 
        onClose=${() => setIsModalOpen(false)} 
        title=${editingCat ? 'Edit Category' : 'Add Category'}
      >
        <${Alert} message=${actionError} />
        <form onSubmit=${handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Name</label>
            <input 
              type="text" required
              value=${formData.name}
              onChange=${(e) => setFormData({...formData, name: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Type</label>
            <select 
              value=${formData.type}
              onChange=${(e) => setFormData({...formData, type: e.target.value})}
              className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Color (Hex)</label>
              <input 
                type="color" 
                value=${formData.color}
                onChange=${(e) => setFormData({...formData, color: e.target.value})}
                className="bg-bg border border-border rounded-lg h-10 w-full cursor-pointer p-1"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">Icon (Emoji)</label>
              <input 
                type="text" maxLength="2" required
                value=${formData.icon}
                onChange=${(e) => setFormData({...formData, icon: e.target.value})}
                className="bg-bg border border-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-accent text-center text-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <button type="button" onClick=${() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-emerald-400">
              ${editingCat ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </${Modal}>
    </div>
  `;
}
