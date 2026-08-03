import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupUser } from '../api';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signupUser(username, email, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <main className="glass-card auth-card">
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h1 className="auth-title">Welcome, {username}!</h1>
          <p className="auth-subtitle">Your account has been created.</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Redirecting to login...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <main className="glass-card auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join TaskFlow today</p>
        
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner__icon">⚠</span>
            <span className="error-banner__text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              className="task-input auth-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="johndoe"
              minLength={2}
            />
          </div>

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
              placeholder="Min. 6 characters"
              minLength={6}
            />
          </div>

          <button type="submit" className="task-input-btn auth-submit-btn" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </main>
    </div>
  );
}
