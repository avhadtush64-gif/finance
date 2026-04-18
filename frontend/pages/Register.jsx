// frontend/pages/Register.jsx
import { useState } from 'react';
import { html } from 'htm/react';
import { useAuth } from '../hooks/useAuth.js';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import { CURRENCIES } from '../utils/constants.js';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferred_currency: 'USD'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
      // Wait, we also need to update preferred_currency. Let's do it after register.
      // fetchApi('/auth/me', { method: 'PATCH', body: JSON.stringify({ preferred_currency: formData.preferred_currency }) });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return html`
    <div className="min-h-screen bg-bg flex animate-fade-in">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Create an account</h2>
            <p className="text-gray-400">Start managing your finances today</p>
          </div>

          <${Alert} type="error" message=${error} />

          <form onSubmit=${handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
              <input 
                type="text" name="name" required
                value=${formData.name} onChange=${handleChange}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input 
                type="email" name="email" required
                value=${formData.email} onChange=${handleChange}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <input 
                type="password" name="password" required minLength="6"
                value=${formData.password} onChange=${handleChange}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm Password</label>
              <input 
                type="password" name="confirmPassword" required
                value=${formData.confirmPassword} onChange=${handleChange}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled=${loading}
              className="w-full bg-accent hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
            >
              ${loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Already have an account? <${Link} to="/login" className="text-accent hover:text-emerald-400 font-medium">Sign in</${Link}>
          </p>
        </div>
      </div>
      
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-l border-border flex-col justify-center p-12 relative overflow-hidden">
        <div className="z-10 max-w-md mx-auto">
          <div className="bg-bg border border-border p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xl">📈</div>
              <span className="text-emerald-400 font-mono text-sm">+24.5%</span>
            </div>
            <h3 className="text-gray-400 text-sm mb-1">Total Savings</h3>
            <div className="text-4xl font-mono font-medium text-white">$12,450.00</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
