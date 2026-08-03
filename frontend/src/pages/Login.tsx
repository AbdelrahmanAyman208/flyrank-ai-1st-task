import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { loginUser } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { setToken, setUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(email, password);
      setToken(data.access_token);
      // Extract username from Supabase user_metadata
      const name = data.user?.user_metadata?.username || data.user?.email?.split('@')[0] || 'User';
      setUsername(name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <main className="glass-card auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Log in to TaskFlow</p>
        
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner__icon">⚠</span>
            <span className="error-banner__text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="task-input auth-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          
          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="task-input auth-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="task-input-btn auth-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </main>
    </div>
  );
}
