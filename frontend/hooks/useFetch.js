// frontend/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api.js';

export function useFetch(endpoint, options = {}, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (customOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi(endpoint, { ...options, ...customOptions });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options)]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}
