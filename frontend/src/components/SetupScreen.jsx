import React, { useState, useRef } from 'react';
import './SetupScreen.css';

const PASSWORD_KEY = 'review_app_admin_pw';

/**
 * SetupScreen — Business profile setup
 * 
 * Admin enters business name, type, uploads a logo,
 * and sets an admin password to protect these settings.
 */
export default function SetupScreen({ initialData, onComplete }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || '');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [logoFile, setLogoFile] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const fileInputRef = useRef(null);

  // Check if a password already exists (editing mode)
  const hasExistingPassword = !!localStorage.getItem(PASSWORD_KEY);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      setTimeout(() => setNameError(false), 1200);
      return;
    }

    // Password validation (required on first setup, optional when editing)
    if (!hasExistingPassword) {
      if (!adminPassword || adminPassword.length < 4) {
        setPasswordError('Password must be at least 4 characters');
        setTimeout(() => setPasswordError(''), 2000);
        return;
      }
      if (adminPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        setConfirmPassword('');
        setTimeout(() => setPasswordError(''), 2000);
        return;
      }
    }

    // If editing and new password provided, validate it
    if (hasExistingPassword && adminPassword) {
      if (adminPassword.length < 4) {
        setPasswordError('Password must be at least 4 characters');
        setTimeout(() => setPasswordError(''), 2000);
        return;
      }
      if (adminPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        setConfirmPassword('');
        setTimeout(() => setPasswordError(''), 2000);
        return;
      }
    }

    onComplete({
      name: trimmed,
      type: type.trim(),
      logoUrl,
      logoFile,
      id: initialData?.id || null,
      adminPassword: adminPassword || null,
    });
  };

  return (
    <div className="screen" id="setup-screen">
      {/* App Header */}
      <div className="app-header">
        <div className="app-logo-mark">⭐</div>
        <div className="app-name">RevUp AI</div>
      </div>

      {/* Setup Card */}
      <form className="setup-card glass-card" onSubmit={handleSubmit}>
        <div>
          <p className="setup-title gradient-text">Setup Your Business</p>
          <p className="setup-sub">Add your logo & name to get personalised reviews</p>
        </div>

        {/* Logo Upload */}
        <div className="logo-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            style={{ display: 'none' }}
          />
          <div
            className="logo-drop"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload logo"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="logo-preview-img" />
            ) : (
              <span className="plus">+</span>
            )}
          </div>
          <p className="logo-hint">Click to upload company logo</p>
        </div>

        {/* Business Name */}
        <div className={`field ${nameError ? 'error' : ''}`}>
          <label htmlFor="biz-name-input">Company / Business Name</label>
          <input
            id="biz-name-input"
            type="text"
            placeholder="Enter your business name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="organization"
          />
        </div>

        {/* Business Type */}
        <div className="field">
          <label htmlFor="biz-type-input">Business Type</label>
          <select
            id="biz-type-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">— Select Business Type —</option>
            <option value="Hospital/Clinic">Hospital / Clinic</option>
            <option value="Restaurant/Cafe">Restaurant / Cafe</option>
            <option value="Jewellery Shop">Jewellery Shop</option>
            <option value="Hotel/Restro">Hotel / Restro</option>
            <option value="Salon/Spa">Salon / Spa</option>
            <option value="School/Coaching">School / Coaching</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Divider */}
        <div className="setup-divider" />

        {/* Admin Password Section */}
        <div className="setup-password-section">
          <p className="setup-password-title">
            🔒 {hasExistingPassword ? 'Change Admin Password' : 'Set Admin Password'}
          </p>
          <p className="setup-password-hint">
            {hasExistingPassword
              ? 'Leave empty to keep current password'
              : 'This password is required to edit settings later'}
          </p>
        </div>

        <div className={`field ${passwordError ? 'error' : ''}`}>
          <label htmlFor="admin-pw">
            {hasExistingPassword ? 'New Password (optional)' : 'Admin Password'}
          </label>
          <input
            id="admin-pw"
            type="password"
            placeholder={hasExistingPassword ? 'Enter new password' : 'Create a password (min 4 chars)'}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {adminPassword && (
          <div className={`field ${passwordError ? 'error' : ''}`}>
            <label htmlFor="admin-pw-confirm">Confirm Password</label>
            <input
              id="admin-pw-confirm"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}

        {passwordError && <p className="setup-pw-error">{passwordError}</p>}

        <button type="submit" className="btn-primary" id="btn-start">
          {hasExistingPassword ? 'Save Changes →' : 'Save & Start →'}
        </button>
      </form>
    </div>
  );
}
