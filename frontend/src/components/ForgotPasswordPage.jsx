import React, { useState } from 'react';
import './AuthPages.css';

export default function ForgotPasswordPage({ onGoToLogin }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api';

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        setStep(2);
      } else {
        setMessage({ text: data.message || 'Error sending OTP', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        setTimeout(() => {
          onGoToLogin();
        }, 2000);
      } else {
        setMessage({ text: data.message || 'Invalid OTP or error.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page screen">
      <div className="auth-container glass-card">
        <div className="auth-header">
          <div className="auth-icon">🔑</div>
          <h2 className="auth-title gradient-text">Reset Password</h2>
          <p className="auth-sub">Recover access to your RevUp AI account</p>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
              />
            </div>
            
            <button type="submit" className="btn-primary auth-btn" disabled={isLoading}>
              {isLoading ? 'Sending OTP...' : 'Send Reset OTP'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="field">
              <label>Enter 6-digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP from email"
                maxLength={6}
                required
              />
            </div>

            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new password"
                required
              />
            </div>
            
            <button type="submit" className="btn-primary auth-btn" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="text-center mt-3">
              <button type="button" className="auth-link" onClick={() => setStep(1)}>
                Change Email
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <button type="button" className="auth-link" onClick={onGoToLogin}>
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
