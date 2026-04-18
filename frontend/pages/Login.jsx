// frontend/pages/Login.jsx
import { useState } from 'react';
import { html } from 'htm/react';
import { useAuth } from '../hooks/useAuth.js';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return html`
    <div className="min-h-screen bg-bg flex animate-fade-in">
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent rounded-full opacity-10 blur-3xl"></div>
        
        <div className="z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-2xl shadow-lg shadow-accent/20">💰</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Finance</h1>
          </div>
          <h2 className="text-5xl font-bold leading-tight text-white mb-6">Master your money<br />with precision.</h2>
          <p className="text-lg text-gray-400 max-w-md">Track expenses, set budgets, and achieve your financial goals with our Bloomberg-inspired dashboard.</p>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          <${Alert} type="error" message=${error} />

          <button 
            onClick=${handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl text-gray-200 hover:bg-surfaceHover transition-colors font-medium mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bg text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit=${handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input 
                type="email" required
                value=${email}
                onChange=${(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <input 
                type="password" required
                value=${password}
                onChange=${(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled=${loading}
              className="w-full bg-accent hover:bg-emerald-400 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
            >
              ${loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm">
            Don't have an account? <${Link} to="/register" className="text-accent hover:text-emerald-400 font-medium">Create one</${Link}>
          </p>
        </div>
      </div>
    </div>
  `;
}
