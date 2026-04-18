// frontend/pages/Transactions.jsx
import { useState, useEffect } from 'react';
import { html } from 'htm/react';
import { useTransactions } from '../hooks/useTransactions.js';
import { useFetch } from '../hooks/useFetch.js';
import TransactionRow from '../components/TransactionRow.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';

export default function Transactions() {
  const { transactions, pagination, loading, error, fetchTransactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { data: categoriesData } = useFetch('/categories');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [filters, setFilters] = useState({ type: '', page: 1, limit: 15 });
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  const handleOpenAdd = () => {
    setEditingTx(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    setActionError(null);
    try {
      if (editingTx) {
        // FormData needs to be converted to JSON for PATCH (since we only support receipt on POST/special endpoint)
        const obj = {};
        formData.forEach((value, key) => {
          if (key !== 'receipt') obj[key] = value;
        });
        await updateTransaction(editingTx.id, obj);
      } else {
        await addTransaction(formData);
      }
      setIsModalOpen(false);
      fetchTransactions(filters);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      fetchTransactions(filters);
    } catch (err) {
      alert(err.message);
    }
  };

  const categories = categoriesData?.categories || [];

  return html`
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Transactions</h1>
          <p className="text-gray-400">Manage your income and expenses.</p>
        </div>
        <button 
          onClick=${handleOpenAdd}
          className="bg-accent hover:bg-emerald-400 text-white font-medium py-2 px-4 rounded-xl transition-colors whitespace-nowrap"
        >
          + Add Transaction
        </button>
      </header>

      <div className="flex items-center gap-4 border-b border-border pb-4">
        <select 
          value=${filters.type}
          onChange=${(e) => setFilters({...filters, type: e.target.value, page: 1})}
          className="bg-surface border border-border rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-accent transition-colors"
        >
          <option value="">All Types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        {/* Could add date filters here */}
      </div>

      <${Alert} message=${error} />

      ${loading && transactions.length === 0 ? html`<${LoadingSpinner} />` : null}

      ${!loading && transactions.length === 0 ? html`
        <${EmptyState} message="No transactions found." />
      ` : html`
        <div className="flex flex-col gap-3">
          ${transactions.map(tx => html`
            <${TransactionRow} 
              key=${tx.id} 
              transaction=${tx} 
              onEdit=${handleOpenEdit} 
              onDelete=${handleDelete} 
            />
          `)}
        </div>
      `}

      ${pagination.total_pages > 1 && html`
        <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-border">
          <button 
            disabled=${pagination.page === 1}
            onClick=${() => setFilters({...filters, page: pagination.page - 1})}
            className="px-3 py-1 bg-surface border border-border rounded disabled:opacity-50 hover:bg-surfaceHover"
          >Prev</button>
          <span className="px-3 py-1">Page ${pagination.page} of ${pagination.total_pages}</span>
          <button 
            disabled=${pagination.page === pagination.total_pages}
            onClick=${() => setFilters({...filters, page: pagination.page + 1})}
            className="px-3 py-1 bg-surface border border-border rounded disabled:opacity-50 hover:bg-surfaceHover"
          >Next</button>
        </div>
      `}

      <${Modal} 
        isOpen=${isModalOpen} 
        onClose=${() => setIsModalOpen(false)} 
        title=${editingTx ? 'Edit Transaction' : 'Add Transaction'}
      >
        <${Alert} message=${actionError} />
        <${TransactionForm} 
          initialData=${editingTx} 
          categories=${categories} 
          onSubmit=${handleSubmit} 
          onCancel=${() => setIsModalOpen(false)} 
        />
      </${Modal}>
    </div>
  `;
}
