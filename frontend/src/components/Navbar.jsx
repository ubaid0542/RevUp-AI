import React from 'react';
import './Navbar.css';

/**
 * Navbar — Top navigation bar
 * Adapts based on current page, user auth state, and business presence.
 * Includes a light/dark theme toggle.
 */
export default function Navbar({ currentPage, onNavigate, hasBusiness, onAdminAccess, user, onLogout, theme, onToggleTheme }) {
  const isDark = theme === 'dark';

  return (
    <nav className="navbar" id="navbar">
      <div className="nav-logo" onClick={() => onNavigate('landing')}>
        🚀 <span className="nav-logo-text">RevUp AI</span>
      </div>
      <div className="nav-btns">
        {/* Theme Toggle */}
        <button
          className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
          id="theme-toggle-btn"
        >
          <span className="theme-toggle-icon">{isDark ? '☀️' : '🌙'}</span>
        </button>

        <button
          className={`nav-btn ${currentPage === 'landing' ? 'active' : ''}`}
          onClick={() => onNavigate('landing')}
        >
          Home
        </button>

        {user ? (
          <>
            {hasBusiness && (
              <button
                className={`nav-btn primary ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('dashboard')}
              >
                Dashboard
              </button>
            )}
            <button
              className={`nav-btn ${currentPage === 'register' ? 'active' : ''}`}
              onClick={() => onNavigate('register')}
            >
              + Business
            </button>
            <span className="nav-user-badge" style={{ color: 'var(--accent, #6c63ff)', fontWeight: '600', padding: '0 8px' }}>
              👤 {user.name.split(' ')[0]}
            </span>
            <button className="nav-btn" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className={`nav-btn ${currentPage === 'login' ? 'active' : ''}`}
              onClick={() => onNavigate('login')}
            >
              Login
            </button>
            <button
              className={`nav-btn primary ${currentPage === 'signup' ? 'active' : ''}`}
              onClick={() => onNavigate('signup')}
            >
              Signup
            </button>
          </>
        )}

        {!user && currentPage === 'landing' && (
          <button
            className={`nav-btn nav-admin-btn ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={onAdminAccess}
            title="Admin Panel"
          >
            ⚙️
          </button>
        )}
      </div>
    </nav>
  );
}
