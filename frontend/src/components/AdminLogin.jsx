import React, { useState, useRef, useEffect } from 'react';
import './AdminLogin.css';

const PASSWORD_KEY = 'review_app_admin_pw';

/**
 * AdminLogin — Admin authentication modal
 * 
 * Requires admin password to access the Setup page.
 * Password is stored in localStorage (set during initial setup).
 */
export default function AdminLogin({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Get stored password
    let storedPw = null;
    try {
      const encoded = localStorage.getItem(PASSWORD_KEY);
      if (encoded) storedPw = atob(encoded);
    } catch { /* ignore */ }

    if (!storedPw) {
      // No password was set — shouldn't happen, but allow access
      sessionStorage.setItem('admin_authenticated', 'true');
      onSuccess();
      return;
    }

    if (password === storedPw) {
      sessionStorage.setItem('admin_authenticated', 'true');
      onSuccess();
    } else {
      setError('Incorrect password. Try again.');
      setShake(true);
      setPassword('');
      setTimeout(() => {
        setShake(false);
        setError('');
      }, 2000);
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
        <p className="admin-sub">Enter your admin password to edit business settings</p>

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
            />
          </div>

          {error && <p className="admin-error">{error}</p>}

          <button type="submit" className="btn-primary" id="btn-admin-login">
            🔓 Unlock Settings
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
