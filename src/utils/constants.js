/**
 * @module utils/constants
 * @description Application-wide constants.
 */

/** Supported currency codes (ISO 4217). */
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN',
  'BRL', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'RUB',
  'TRY', 'PLN', 'THB', 'IDR', 'MYR', 'PHP', 'CZK', 'ILS', 'CLP', 'ARS',
  'TWD', 'SAR', 'AED', 'COP', 'EGP', 'NGN', 'PKR', 'BDT', 'VND', 'HUF',
  'RON', 'BGN', 'HRK', 'ISK', 'LKR', 'KES'
];

/** Default system categories seeded for every new user */
const DEFAULT_CATEGORIES = [
  // Expenses
  { name: 'Food & Dining', type: 'expense', color: '#FF6384', icon: '🍔' },
  { name: 'Transportation', type: 'expense', color: '#36A2EB', icon: '🚗' },
  { name: 'Housing', type: 'expense', color: '#FFCE56', icon: '🏠' },
  { name: 'Utilities', type: 'expense', color: '#4BC0C0', icon: '💡' },
  { name: 'Healthcare', type: 'expense', color: '#9966FF', icon: '🏥' },
  { name: 'Entertainment', type: 'expense', color: '#FF9F40', icon: '🎬' },
  { name: 'Shopping', type: 'expense', color: '#E7E9ED', icon: '🛍️' },
  { name: 'Education', type: 'expense', color: '#7BC8A4', icon: '📚' },
  { name: 'Personal Care', type: 'expense', color: '#F7DC6F', icon: '💇' },
  { name: 'Uncategorized', type: 'expense', color: '#BDC3C7', icon: '📁' },
  // Income
  { name: 'Salary', type: 'income', color: '#2ECC71', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#1ABC9C', icon: '💻' },
  { name: 'Investments', type: 'income', color: '#3498DB', icon: '📈' },
  { name: 'Gifts', type: 'income', color: '#E74C3C', icon: '🎁' },
  { name: 'Other Income', type: 'income', color: '#95A5A6', icon: '💵' },
];

module.exports = { SUPPORTED_CURRENCIES, DEFAULT_CATEGORIES };
