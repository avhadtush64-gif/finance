import React, { useState, useRef, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';
import { formatCurrency } from '../utils/formatters.js';
import Chart from 'chart.js/auto';

export default function Reports() {
  const date = new Date();
  const [year, setYear] = useState(date.getFullYear());
  const [month, setMonth] = useState(date.getMonth() + 1);
  
  const { data, loading, error } = useFetch(`/reports/monthly?year=${year}&month=${month}`);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (data?.transactions && chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();

      const trendMap = {};
      data.transactions.forEach(tx => {
        const d = tx.date.split('T')[0];
        if (!trendMap[d]) trendMap[d] = { income: 0, expense: 0 };
        if (tx.type === 'income') trendMap[d].income += parseFloat(tx.amount_in_preferred);
        if (tx.type === 'expense' && !tx.is_refund) trendMap[d].expense += parseFloat(tx.amount_in_preferred);
        if (tx.type === 'expense' && tx.is_refund) trendMap[d].expense -= parseFloat(tx.amount_in_preferred);
      });

      const sortedDates = Object.keys(trendMap).sort();
      const labels = sortedDates;
      const incomes = sortedDates.map(d => trendMap[d].income);
      const expenses = sortedDates.map(d => trendMap[d].expense);

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Income',
              data: incomes,
              borderColor: '#10b981',
              backgroundColor: '#10b98120',
              fill: true,
              tension: 0.4
            },
            {
              label: 'Expense',
              data: expenses,
              borderColor: '#f43f5e',
              backgroundColor: '#f43f5e20',
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af', font: { family: 'DM Mono' } } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 10 } }
          },
          plugins: {
            legend: { labels: { color: '#e5e7eb', font: { family: 'Outfit' } } }
          }
        }
      });
    }

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data]);

  const handleExport = async () => {
    try {
      const { fetchApi } = await import('../utils/api.js');
      const res = await fetchApi(`/reports/export?format=csv&year=${year}&month=${month}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${year}-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports</h1>
          <p className="text-gray-400">Analyze your monthly trends.</p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-surface border border-border hover:bg-surfaceHover text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
        >
          <span>📥</span> Export CSV
        </button>
      </header>

      <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
        <select 
          value={year} onChange={(e) => setYear(e.target.value)}
          className="bg-bg border border-border rounded-lg p-2 text-gray-200 outline-none focus:border-accent"
        >
          {[year-2, year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select 
          value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-bg border border-border rounded-lg p-2 text-gray-200 outline-none focus:border-accent"
        >
          {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m}</option>)}
        </select>
      </div>

      <Alert message={error} />
      {loading && !data ? <LoadingSpinner /> : null}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Total Income</h3>
              <p className="text-2xl font-mono text-emerald-400">{formatCurrency(data.summary.total_income)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Total Expenses</h3>
              <p className="text-2xl font-mono text-rose-400">{formatCurrency(data.summary.total_expenses)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Net Balance</h3>
              <p className={`text-2xl font-mono ${data.summary.net_savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.summary.net_savings)}</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium mb-6">Daily Trend</h3>
            <div className="h-80 relative">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
