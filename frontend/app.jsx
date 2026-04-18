// frontend/app.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { html } from 'htm/react';
import { AuthProvider } from './hooks/useAuth.js';

// Layout
import Layout from './components/Layout.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Categories from './pages/Categories.jsx';
import Budgets from './pages/Budgets.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

function App() {
  return html`
    <${BrowserRouter}>
      <${AuthProvider} html=${html}>
        <${Routes}>
          <${Route} path="/login" element=${html`<${Login} />`} />
          <${Route} path="/register" element=${html`<${Register} />`} />
          
          <${Route} path="/" element=${html`<${Layout} />`}>
            <${Route} index element=${html`<${Dashboard} />`} />
            <${Route} path="transactions" element=${html`<${Transactions} />`} />
            <${Route} path="categories" element=${html`<${Categories} />`} />
            <${Route} path="budgets" element=${html`<${Budgets} />`} />
            <${Route} path="reports" element=${html`<${Reports} />`} />
            <${Route} path="profile" element=${html`<${Profile} />`} />
          </${Route}>
          
          <${Route} path="*" element=${html`<${Navigate} to="/" replace />`} />
        </${Routes}>
      </${AuthProvider}>
    </${BrowserRouter}>
  `;
}

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
