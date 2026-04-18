import { useState, useCallback } from 'react';
import { fetchApi } from '../utils/api.js';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams(filters).toString();
      const data = await fetchApi(`/transactions?${query}`);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = async (formData) => {
    return fetchApi('/transactions', { method: 'POST', body: formData });
  };

  const updateTransaction = async (id, data) => {
    return fetchApi(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  };

  const deleteTransaction = async (id) => {
    return fetchApi(`/transactions/${id}`, { method: 'DELETE' });
  };

  return { transactions, pagination, loading, error, fetchTransactions, addTransaction, updateTransaction, deleteTransaction };
}
