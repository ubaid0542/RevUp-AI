import React, { useState } from 'react';
import { loginUser } from '../services/authService';
import './AuthPages.css';

export default function LoginPage({ onLoginSuccess, onGoToSignup, onToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      onToast('Please enter your email and password! ❌');
      return;
    }

    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      onToast('Login successful! 🎉');
      onLoginSuccess(result.user);
    } else {
      onToast(result.message);
    }
  };

  return (
    <div className="auth-page screen">
      <div className="auth-container glass-card">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h2 className="auth-title gradient-text">Welcome Back!</h2>
          <p className="auth-sub">Log in to access your dashboard</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label>Password *</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? '⏳ Logging in...' : '🚀 Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button className="auth-link" onClick={onGoToSignup}>
              Sign up →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
