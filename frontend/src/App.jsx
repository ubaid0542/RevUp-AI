import React, { useState, useCallback, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import ReviewScreen from './components/ReviewScreen';
import AdminLogin from './components/AdminLogin';
import { updateFavicon } from './utils/favicon';

const STORAGE_KEY = 'review_app_business';
const PASSWORD_KEY = 'review_app_admin_pw';

/**
 * Load saved business data from localStorage.
 */
function loadSavedBusiness() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data && data.name) return data;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Save business data to localStorage.
 */
function saveBusiness(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: data.name,
      type: data.type,
      logoUrl: data.logoUrl,
      id: data.id,
    }));
  } catch { /* ignore */ }
}

/**
 * App — Main application component
 * 
 * Flow:
 * 1. First visit (no saved data) → Setup page directly
 * 2. After setup → Review screen
 * 3. Page refresh (data exists) → Review screen
 * 4. Edit button → Admin password required → Setup page
 */
export default function App() {
  const savedBusiness = loadSavedBusiness();

  const [screen, setScreen] = useState(savedBusiness ? 'review' : 'setup');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [businessData, setBusinessData] = useState(savedBusiness || {
    name: '',
    type: '',
    logoUrl: '',
    logoFile: null,
    id: null,
  });

  // Set favicon on mount if business data exists
  useEffect(() => {
    if (savedBusiness) {
      updateFavicon(savedBusiness.logoUrl, savedBusiness.name);
      document.title = `${savedBusiness.name} — Write Review`;
    }
  }, []);

  // ── Setup completed → save data + password, go to review ──
  const handleSetupComplete = useCallback((data) => {
    setBusinessData(data);
    saveBusiness(data);

    // Save admin password if provided
    if (data.adminPassword) {
      localStorage.setItem(PASSWORD_KEY, btoa(data.adminPassword));
    }

    setScreen('review');
    updateFavicon(data.logoUrl, data.name);
    document.title = `${data.name} — Write Review`;
    sessionStorage.removeItem('admin_authenticated');
  }, []);

  // ── "Edit" clicked → check admin auth ──
  const handleEditRequest = useCallback(() => {
    const isAdmin = sessionStorage.getItem('admin_authenticated') === 'true';
    if (isAdmin) {
      setScreen('setup');
    } else {
      setShowAdminLogin(true);
    }
  }, []);

  // ── Admin login success → go to setup ──
  const handleAdminSuccess = useCallback(() => {
    setShowAdminLogin(false);
    setScreen('setup');
  }, []);

  // ── Admin login cancelled ──
  const handleAdminCancel = useCallback(() => {
    setShowAdminLogin(false);
  }, []);

  return (
    <>
      {/* Setup Screen — shown on first visit or after admin auth */}
      {screen === 'setup' && (
        <SetupScreen
          initialData={businessData}
          onComplete={handleSetupComplete}
        />
      )}

      {/* Review Screen — public */}
      {screen === 'review' && (
        <ReviewScreen
          businessData={businessData}
          onEdit={handleEditRequest}
        />
      )}

      {/* Admin Login Modal — overlay on review screen */}
      {showAdminLogin && (
        <AdminLogin
          onSuccess={handleAdminSuccess}
          onCancel={handleAdminCancel}
        />
      )}
    </>
  );
}
