import React, { useState, useRef, useEffect } from 'react';
import { adminLogin, setAdminToken } from '../services/authService';
import './AdminLogin.css';

/**
 * AdminLogin — Secure admin authentication modal
 * Token stored in memory only — never in sessionStorage/localStorage.
 */
export default function AdminLogin({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await adminLogin(password);
      if (result.success) {
        // Token stored in memory via setAdminToken — NOT in sessionStorage
        setAdminToken(result.token);
        onSuccess();
      } else {
        setError(result.message || 'Invalid password.');
        setShake(true);
        setPassword('');
        setTimeout(() => {
          setShake(false);
          setError('');
        }, 3000);
      }
    } catch {
      setError('Server connection error. Please try again.');
      setShake(true);
      setTimeout(() => { setShake(false); setError(''); }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-overlay" onClick={onCancel}>
      <div
        className={`admin-modal glass-card ${shake ? 'shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lock Icon */}
        <div className="admin-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1"/>
          </svg>
        </div>

        <h2 className="admin-title">Admin Access</h2>
        <p className="admin-sub">Enter your admin password to continue</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className={`field ${error ? 'error' : ''}`}>
            <label htmlFor="admin-password">Password</label>
            <input
              ref={inputRef}
              id="admin-password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <p className="admin-error">{error}</p>}

          <button type="submit" className="btn-primary" id="btn-admin-login" disabled={loading}>
            {loading ? '⏳ Verifying...' : '🔓 Unlock Settings'}
          </button>

          <button
            type="button"
            className="admin-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
