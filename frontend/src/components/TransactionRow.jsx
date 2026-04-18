import React from 'react';
import CategoryBadge from './CategoryBadge.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export default function TransactionRow({ transaction, onEdit, onDelete }) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? 'text-emerald-400' : 'text-rose-400';
  const sign = isIncome ? '+' : '-';

  return (
    <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:bg-surfaceHover transition-colors group">
      <div className="flex items-center gap-4">
        <CategoryBadge 
          name={transaction.category_name || 'Uncategorized'} 
          icon={transaction.category_icon} 
          color={transaction.category_color} 
        />
        <div className="flex flex-col">
          <span className="font-medium text-gray-200">
            {transaction.description || transaction.category_name}
            {transaction.is_refund && <span className="ml-2 text-xs text-emerald-500 font-normal px-1.5 py-0.5 bg-emerald-500/10 rounded">Refund</span>}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(transaction.date)} &middot; {transaction.currency} 
            {transaction.is_future ? ' (Upcoming)' : ''}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-1">
        <span className={`font-mono font-medium ${amountColor}`}>
          {sign}{formatCurrency(transaction.amount, transaction.currency)}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={() => onEdit(transaction)} className="text-xs text-gray-400 hover:text-white transition-colors">Edit</button>
          <button onClick={() => onDelete(transaction.id)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}
