import React, { useEffect, useRef } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';
import TransactionRow from '../components/TransactionRow.jsx';
import { formatCurrency } from '../utils/formatters.js';
import { COLOR_MAP } from '../utils/constants.js';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const { data, loading, error } = useFetch('/dashboard');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (data?.expenses_by_category && chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      const labels = data.expenses_by_category.map(c => c.category);
      const values = data.expenses_by_category.map(c => c.amount);
      const colors = data.expenses_by_category.map(c => c.color || COLOR_MAP.expense);

      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: {
              position: 'right',
              labels: { color: COLOR_MAP.text, font: { family: 'Outfit' } }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data]);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert message={error} />;
  if (!data) return null;

  const { summary, expenses_by_category, top_transactions, budget_alerts } = data;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your finances for the current month.</p>
      </header>

      {budget_alerts?.length > 0 && (
        <div className="flex flex-col gap-2">
          {budget_alerts.map(a => (
            <div key={a.category_id || a.budget_id} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center justify-between">
              <span className="font-medium">⚠️ Budget Alert: {a.category}</span>
              <span className="text-sm">Used {a.percent_used}% of {formatCurrency(a.budget)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={formatCurrency(summary.total_income)} isPositive={true} icon="💵" />
        <StatCard label="Total Expenses" value={formatCurrency(summary.total_expenses)} isPositive={false} icon="💳" />
        <StatCard label="Net Savings" value={formatCurrency(summary.net_savings)} isPositive={summary.net_savings >= 0} icon="💰" />
        <StatCard label="Savings Rate" value={`${summary.savings_rate}%`} isPositive={summary.savings_rate > 20} icon="📈" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium mb-6">Expenses by Category</h3>
          {expenses_by_category?.length > 0 ? (
            <div className="h-64 relative">
              <canvas ref={chartRef}></canvas>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">No expenses this month</div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">Recent Transactions</h3>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {top_transactions?.length > 0 
              ? top_transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} onEdit={() => {}} onDelete={() => {}} />)
              : <div className="text-gray-500 text-center py-8">No recent transactions</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
