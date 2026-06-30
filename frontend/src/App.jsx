import React, { useState, useCallback, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import ReviewScreen from './components/ReviewScreen';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import { LegalPages } from './components/LegalPages';
import { updateFavicon } from './utils/favicon';
import { trackEvent, EVENT_TYPES } from './services/analyticsService';
import { isLoggedIn, getUser, logoutUser, fetchMe, createBusinessAPI, updateBusinessAPI, uploadBusinessLogoAPI, createPublicBusinessAPI, uploadPublicBusinessLogoAPI, fetchPublicBusinessAPI } from './services/authService';

const STORAGE_KEY = 'review_app_business';
const BUSINESSES_KEY = 'rai_businesses';
const REVIEWS_KEY = 'rai_reviews';

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
      gmb: data.gmb,
      emoji: data.emoji,
      subcategory: data.subcategory,
      extras: data.extras,
      plan: data.plan,
      city: data.city,
      keywords: data.keywords,
    }));
  } catch { /* ignore */ }
}

function loadBusinesses() {
  try {
    return JSON.parse(localStorage.getItem(BUSINESSES_KEY) || '[]');
  } catch { return []; }
}

function loadReviews() {
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
  } catch { return []; }
}

/**
 * App — Main application component
 *
 * Pages:
 * - landing: Landing page (hero, how it works, pricing)
 * - register: Business registration / edit form
 * - dashboard: QR code, stats, review history
 * - review: Customer-facing review flow
 * - login: Business owner login screen
 * - signup: Business owner registration screen
 */
export default function App() {
  const savedBusiness = loadSavedBusiness();

  // Check URL params for QR scan
  const params = new URLSearchParams(window.location.search);
  const bizIdFromUrl = params.get('biz');

  const [user, setUser] = useState(() => getUser());
  const [authChecked, setAuthChecked] = useState(false);

  const [page, setPage] = useState(() => {
    if (bizIdFromUrl) return 'review';
    if (isLoggedIn()) return 'dashboard';
    return 'landing';
  });

  const [selectedPlan, setSelectedPlan] = useState('Starter');
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [toast, setToast] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Theme state: 'light' or 'dark', persisted in localStorage
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('rai_theme') || 'light';
    } catch { return 'light'; }
  });

  // Apply / remove dark class on body whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    try { localStorage.setItem('rai_theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [businessData, setBusinessData] = useState(() => {
    if (bizIdFromUrl) {
      const businesses = loadBusinesses();
      const found = businesses.find(b => String(b.id) === String(bizIdFromUrl));
      if (found) return found;
      return { name: '', type: '', logoUrl: '', logoFile: null, id: bizIdFromUrl };
    }
    return savedBusiness || {
      name: '', type: '', logoUrl: '', logoFile: null, id: null,
    };
  });

  const [reviews, setReviews] = useState(loadReviews);

  // Sync auth state with backend on mount
  useEffect(() => {
    if (isLoggedIn()) {
      fetchMe().then(data => {
        if (data) {
          setUser(data.user);
          // Set business details if owner has one registered on the backend
          if (data.businesses && data.businesses.length > 0) {
            const biz = data.businesses[0];
            const formattedBiz = {
              id: biz.id,
              name: biz.name,
              type: biz.type,
              gmb: biz.gmb_link,
              emoji: biz.emoji,
              subcategory: biz.subcategory,
              plan: biz.plan,
              city: biz.city,
              keywords: biz.keywords || '',
              logoUrl: biz.logo_path ? `/storage/${biz.logo_path}` : (loadSavedBusiness()?.logoUrl || ''),
              extras: biz.extras ? (typeof biz.extras === 'string' ? JSON.parse(biz.extras) : biz.extras) : {},
            };
            setBusinessData(formattedBiz);
            saveBusiness(formattedBiz);
          }
        } else {
          // Token invalid or expired
          setUser(null);
          setPage('landing');
        }
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Fetch public business info if customer scans QR code (bizId in URL)
  useEffect(() => {
    if (bizIdFromUrl) {
      fetchPublicBusinessAPI(bizIdFromUrl)
        .then(data => {
          if (data.success && data.data) {
            const biz = data.data;
            const formatted = {
              id: biz.id,
              name: biz.name,
              type: biz.type,
              emoji: biz.emoji || '⭐',
              gmb: biz.gmb_link,
              subcategory: biz.subcategory,
              city: biz.city,
              keywords: biz.keywords || '',
              extras: biz.extras ? (typeof biz.extras === 'string' ? JSON.parse(biz.extras) : biz.extras) : {},
              logoUrl: biz.logo_url ? biz.logo_url : '',
              plan: biz.plan || 'Starter',
            };
            setBusinessData(formatted);
            saveBusiness(formatted);
          }
        })
        .catch(err => console.error("Failed to fetch public business details:", err));
    }
  }, [bizIdFromUrl]);

  // Set favicon + tab title on mount
  useEffect(() => {
    if (bizIdFromUrl && businessData && businessData.name) {
      updateFavicon(businessData.logoUrl, businessData.name);
      document.title = `RevUp AI — ${businessData.name}`;
    } else if (savedBusiness && !bizIdFromUrl) {
      updateFavicon(savedBusiness.logoUrl, savedBusiness.name);
      document.title = `${savedBusiness.name} — RevUp AI Dashboard`;
    }
  }, [businessData, bizIdFromUrl]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Navigation
  const handleNavigate = useCallback((target) => {
    if (target === 'demo') {
      const biz = savedBusiness || {
        id: 'demo',
        name: 'Demo Business',
        type: 'Restaurant/Cafe',
        emoji: '🍽️',
        gmb: 'https://maps.google.com/?q=review',
      };
      setBusinessData(biz);
      setPage('review');
      return;
    }
    setPage(target);
    window.scrollTo(0, 0);
  }, [savedBusiness]);

  // Landing page plan selection → go to signup/register
  const handleSelectPlan = useCallback((plan) => {
    setSelectedPlan(plan);
    setIsNewRegistration(true);
    if (user) {
      setPage('register');
    } else {
      setPage('signup');
    }
    trackEvent(EVENT_TYPES.PLAN_SELECTED, { plan });
    window.scrollTo(0, 0);
  }, [user]);

  // Handle successful login
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    setPage('dashboard');
    fetchMe().then(data => {
      if (data?.businesses && data.businesses.length > 0) {
        const biz = data.businesses[0];
        const formattedBiz = {
          id: biz.id,
          name: biz.name,
          type: biz.type,
          gmb: biz.gmb_link,
          emoji: biz.emoji,
          subcategory: biz.subcategory,
          plan: biz.plan,
          city: biz.city,
          keywords: biz.keywords || '',
          logoUrl: biz.logo_path ? `/storage/${biz.logo_path}` : (loadSavedBusiness()?.logoUrl || ''),
          extras: biz.extras ? (typeof biz.extras === 'string' ? JSON.parse(biz.extras) : biz.extras) : {},
        };
        setBusinessData(formattedBiz);
        saveBusiness(formattedBiz);
      } else {
        // Logged in but no business registered -> go to register
        setPage('register');
        setBusinessData({ name: '', type: '', logoUrl: '', logoFile: null, id: null });
      }
    });
  }, []);

  // Handle successful signup
  const handleSignupSuccess = useCallback((userData) => {
    setUser(userData);
    setPage('register'); // Go straight to register business
    setBusinessData({ name: '', type: '', logoUrl: '', logoFile: null, id: null });
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setBusinessData({ name: '', type: '', logoUrl: '', id: null });
    localStorage.removeItem(STORAGE_KEY);
    setPage('landing');
    showToast('Logged out! 👋');
  }, []);

  // Registration complete (also used for editing)
  const handleRegister = useCallback(async (data) => {
    let finalData = { ...data };

    if (isLoggedIn()) {
      let result;
      if (!isNewRegistration && businessData && businessData.id) {
        result = await updateBusinessAPI(businessData.id, data);
      } else {
        result = await createBusinessAPI(data);
      }

      if (result.success) {
        finalData.id = result.business.id;
        
        // Upload logo if selected
        if (data.logoFile) {
          const uploadRes = await uploadBusinessLogoAPI(result.business.id, data.logoFile);
          if (uploadRes.success) {
            finalData.logoUrl = uploadRes.logoUrl;
          } else {
            finalData.logoUrl = data.logoUrl || '';
          }
        } else {
          finalData.logoUrl = result.business.logo_path 
            ? `/storage/${result.business.logo_path}` 
            : (data.logoUrl || '');
        }
      } else {
        showToast(`❌ Error: ${result.message}`);
        return;
      }
    } else {
      // Offline fallback / Standalone flow if not logged in -> save to DB as public business
      const result = await createPublicBusinessAPI(data);
      if (result.success) {
        finalData.id = result.business.id;

        // Upload logo if selected
        if (data.logoFile) {
          const uploadRes = await uploadPublicBusinessLogoAPI(result.business.id, data.logoFile);
          if (uploadRes.success) {
            finalData.logoUrl = uploadRes.logoUrl;
          } else {
            finalData.logoUrl = data.logoUrl || '';
          }
        } else {
          finalData.logoUrl = result.business.logo_path 
            ? `/storage/${result.business.logo_path}` 
            : (data.logoUrl || '');
        }
      } else {
        // Fallback to local storage only if backend public creation fails
        if (!finalData.id) {
          finalData.id = `biz_${Date.now()}`;
        }
      }
    }

    setBusinessData(finalData);
    saveBusiness(finalData);

    // Update local storage list of businesses
    const businesses = loadBusinesses();
    const existingIdx = businesses.findIndex(b => b.id === finalData.id);
    if (existingIdx >= 0) {
      businesses[existingIdx] = finalData;
    } else {
      businesses.push(finalData);
    }
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(businesses));

    updateFavicon(finalData.logoUrl, finalData.name);
    document.title = `${finalData.name} — RevUp AI Dashboard`;

    // Track registration
    trackEvent(EVENT_TYPES.BUSINESS_REGISTERED, {
      id: finalData.id,
      name: finalData.name,
      type: finalData.type,
      emoji: finalData.emoji,
      plan: finalData.plan || selectedPlan,
      city: finalData.city || 'N/A',
      ownerName: user ? user.name : 'Guest',
      ownerEmail: user ? user.email : 'N/A',
      ownerPhone: user ? user.phone : 'N/A',
    });

    setIsNewRegistration(false);
    setPage('dashboard');
    showToast('🎉 Registration complete! Your QR code is ready!');
  }, [isNewRegistration, businessData, selectedPlan, user]);

  // Edit clicked → go directly to register page with existing data
  const handleEditRequest = useCallback(() => {
    setIsNewRegistration(false);
    setPage('register');
    window.scrollTo(0, 0);
  }, []);

  // New business from dashboard → fresh register page
  const handleNewBusiness = useCallback(() => {
    setIsNewRegistration(true);
    setPage('register');
    window.scrollTo(0, 0);
  }, []);

  // Preview from dashboard → go to review flow
  const handlePreview = useCallback(() => {
    setPage('review');
  }, []);

  // Admin panel access — relies on in-memory token (not sessionStorage)
  // After page refresh, token is gone → re-login required (intentional)
  const handleAdminAccess = useCallback(() => {
    setShowAdminLogin(true);
  }, []);

  const handleAdminLoginSuccess = useCallback(() => {
    setShowAdminLogin(false);
    setPage('admin');
  }, []);

  // Save a review (from review flow)
  const handleSaveReview = useCallback((review) => {
    setReviews(prev => {
      const updated = [...prev, review];
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isReviewFlow = page === 'review';
  const hasBusiness = !!(businessData && businessData.id);

  // Review flow uses a centered narrow container
  const useNarrowLayout = isReviewFlow;

  if (!authChecked) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--accent, #6c63ff)', fontSize: '20px', fontWeight: 'bold' }}>⏳ Loading RevUp AI...</div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${useNarrowLayout ? 'app-shell--narrow' : ''}`}>
      {/* Navbar (hidden during review flow) */}
      {!useNarrowLayout && (
        <Navbar
          currentPage={page}
          onNavigate={handleNavigate}
          hasBusiness={hasBusiness}
          onAdminAccess={handleAdminAccess}
          user={user}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      <main className={`app-main ${useNarrowLayout ? 'app-main--narrow' : ''}`}>
        {/* Landing Page */}
        {page === 'landing' && (
          <LandingPage onNavigate={handleNavigate} onSelectPlan={handleSelectPlan} />
        )}

        {/* Register / Edit Page */}
        {page === 'register' && (
          <RegisterPage
            selectedPlan={selectedPlan}
            initialData={(!isNewRegistration && hasBusiness) ? businessData : null}
            onRegister={handleRegister}
            onToast={showToast}
          />
        )}

        {/* Dashboard */}
        {page === 'dashboard' && hasBusiness && (
          <Dashboard
            business={businessData}
            reviews={reviews}
            onPreview={handlePreview}
            onNewBusiness={handleNewBusiness}
            onEdit={handleEditRequest}
            onToast={showToast}
          />
        )}

        {/* Review Screen (customer-facing — narrow centered) */}
        {page === 'review' && (
          <ReviewScreen
            businessData={businessData}
            onEdit={handleEditRequest}
            onSaveReview={handleSaveReview}
          />
        )}

        {/* LoginPage */}
        {page === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGoToSignup={() => setPage('signup')}
            onGoToForgot={() => setPage('forgot-password')}
            onToast={showToast}
          />
        )}

        {/* Forgot Password Page */}
        {page === 'forgot-password' && (
          <ForgotPasswordPage
            onGoToLogin={() => setPage('login')}
          />
        )}

        {/* Legal Pages */}
        {page === 'legal' && (
          <LegalPages />
        )}

        {/* SignupPage */}
        {page === 'signup' && (
          <SignupPage
            onSignupSuccess={handleSignupSuccess}
            onGoToLogin={() => setPage('login')}
            onToast={showToast}
          />
        )}

        {/* Admin Panel */}
        {page === 'admin' && (
          <AdminPanel onBack={() => setPage(hasBusiness ? 'dashboard' : 'landing')} />
        )}
      </main>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin
          onSuccess={handleAdminLoginSuccess}
          onCancel={() => setShowAdminLogin(false)}
        />
      )}

      {/* Global Toast */}
      <div
        className="global-toast"
        style={{
          opacity: toast ? 1 : 0,
          transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        }}
      >
        {toast}
      </div>
    </div>
  );
}
