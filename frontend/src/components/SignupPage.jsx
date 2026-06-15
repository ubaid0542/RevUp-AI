import React, { useState } from 'react';
import { registerUser } from '../services/authService';
import './AuthPages.css';

export default function SignupPage({ onSignupSuccess, onGoToLogin, onToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { onToast('Please enter your full name! ❌'); return; }
    if (!email.trim()) { onToast('Please enter your email address! ❌'); return; }
    if (password.length < 6) { onToast('Password must be at least 6 characters long! ❌'); return; }
    if (password !== confirmPassword) { onToast('Passwords do not match! ❌'); return; }

    setLoading(true);
    const result = await registerUser(name, email, phone, password, confirmPassword);
    setLoading(false);

    if (result.success) {
      onToast('Account created! 🎉');
      onSignupSuccess(result.user);
    } else {
      onToast(result.message);
    }
  };

  return (
    <div className="auth-page screen">
      <div className="auth-container glass-card">
        <div className="auth-header">
          <div className="auth-icon">✨</div>
          <h2 className="auth-title gradient-text">Create Account</h2>
          <p className="auth-sub">Sign up to register and manage your business</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Full Name *</label>
            <input
              type="text"
              placeholder="Your full name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

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
            <label>Phone Number (optional)</label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className="field">
            <label>Password * (min 6 chars)</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          <div className="field">
            <label>Confirm Password *</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? '⏳ Creating account...' : '✅ Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button className="auth-link" onClick={onGoToLogin}>
              Log in →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
