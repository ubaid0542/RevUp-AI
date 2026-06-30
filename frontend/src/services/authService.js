/**
 * Auth Service — handles login, signup, token storage
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api';
const TOKEN_KEY = 'rai_auth_token';
const USER_KEY = 'rai_auth_user';

/**
 * Get stored auth token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user data
 */
export function getUser() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

/**
 * Save auth data after login/register
 */
function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear auth data (logout)
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('review_app_business');
  localStorage.removeItem('rai_businesses');
  localStorage.removeItem('rai_reviews');
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
  return !!getToken();
}

/**
 * Get auth headers for API calls
 */
export function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

/**
 * Register (Signup) a new user
 */
export async function registerUser(name, email, phone, password, passwordConfirmation) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      saveAuth(data.data.token, data.data.user);
      return { success: true, user: data.data.user };
    }

    // Validation errors
    const errorMsg = data.errors
      ? Object.values(data.errors).flat().join(', ')
      : data.message || 'Registration failed';
    return { success: false, message: errorMsg };
  } catch (err) {
    return { success: false, message: 'Server se connection nahi ho paya. Backend chal raha hai?' };
  }
}

/**
 * Login an existing user
 */
export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      saveAuth(data.data.token, data.data.user);
      return { success: true, user: data.data.user };
    }

    return { success: false, message: data.message || 'Login failed' };
  } catch (err) {
    return { success: false, message: 'Server se connection nahi ho paya. Backend chal raha hai?' };
  }
}

/**
 * Logout — delete token from server + clear local storage
 */
export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch { /* ignore */ }
  clearAuth();
}

/**
 * Get current user profile + businesses (from server)
 */
export async function fetchMe() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      // Token expired or invalid
      clearAuth();
      return null;
    }

    const data = await res.json();
    if (data.success) {
      // Update local cache
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
      return data.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch user's businesses from API
 */
export async function fetchBusinesses() {
  try {
    const res = await fetch(`${API_BASE}/businesses`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      clearAuth();
      return [];
    }

    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * Create a business via API (with auth token)
 */
export async function createBusinessAPI(businessData) {
  try {
    const res = await fetch(`${API_BASE}/businesses`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name:            businessData.name,
        type:            businessData.type,
        google_place_id: businessData.googlePlaceId || null,
        gmb_link:        businessData.gmb || null,
        emoji:           businessData.emoji || '⭐',
        subcategory:     businessData.subcategory || null,
        plan:            businessData.plan || 'Free',
        extras:          JSON.stringify(businessData.extras || {}),
        city:            businessData.city || null,
        keywords:        businessData.keywords || null,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return { success: true, business: data.data };
    }

    const errorMsg = data.errors
      ? Object.values(data.errors).flat().join(', ')
      : data.message || 'Business create failed';
    return { success: false, message: errorMsg };
  } catch (err) {
    return { success: false, message: 'Server connection error' };
  }
}

/**
 * Update a business via API (with auth token)
 */
export async function updateBusinessAPI(businessId, businessData) {
  try {
    const res = await fetch(`${API_BASE}/businesses/${businessId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        name:            businessData.name,
        type:            businessData.type,
        google_place_id: businessData.googlePlaceId || null,
        gmb_link:        businessData.gmb || null,
        emoji:           businessData.emoji || '⭐',
        subcategory:     businessData.subcategory || null,
        plan:            businessData.plan || 'Free',
        extras:          JSON.stringify(businessData.extras || {}),
        city:            businessData.city || null,
        keywords:        businessData.keywords || null,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return { success: true, business: data.data };
    }

    return { success: false, message: data.message || 'Update failed' };
  } catch (err) {
    return { success: false, message: 'Server connection error' };
  }
}

/**
 * Fetch all businesses and owners for admin panel
 */
export async function fetchAdminBusinesses() {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const adminToken = getAdminToken();
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(`${API_BASE}/admin/businesses`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.data : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch all registered user accounts for admin panel
 */
export async function fetchAdminUsers() {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const adminToken = getAdminToken();
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(`${API_BASE}/admin/users`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.data : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Delete a user account (Admin only)
 */
export async function adminDeleteUserAPI(userId) {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const adminToken = getAdminToken();
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    return res.ok && data.success ? { success: true, message: data.message } : { success: false, message: data.message || 'Deletion failed' };
  } catch (err) {
    return { success: false, message: 'Server connection error.' };
  }
}

/**
 * Upload logo file for a business
 */
export async function uploadBusinessLogoAPI(businessId, logoFile) {
  try {
    const formData = new FormData();
    formData.append('logo', logoFile);

    const res = await fetch(`${API_BASE}/businesses/${businessId}/logo`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: formData,
    });

    const data = await res.json();
    return res.ok && data.success ? { success: true, logoUrl: data.data.logo_url } : { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Create a public business profile (without login)
 * Returns ownership_token for subsequent logo upload.
 */
export async function createPublicBusinessAPI(businessData) {
  try {
    const res = await fetch(`${API_BASE}/public/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name:            businessData.name,
        type:            businessData.type,
        google_place_id: businessData.googlePlaceId || null,
        gmb_link:        businessData.gmb || null,
        emoji:           businessData.emoji || '⭐',
        subcategory:     businessData.subcategory || null,
        plan:            businessData.plan || 'Free',
        extras:          JSON.stringify(businessData.extras || {}),
        city:            businessData.city || null,
        keywords:        businessData.keywords || null,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        business: data.data,
        ownershipToken: data.ownership_token || null,  // store for logo upload
      };
    }
    return { success: false, message: data.message };
  } catch (err) {
    return { success: false, message: 'Server connection error' };
  }
}

/**
 * Upload logo file for a public business.
 * Requires ownershipToken issued at business creation.
 */
export async function uploadPublicBusinessLogoAPI(businessId, logoFile, ownershipToken) {
  try {
    const formData = new FormData();
    formData.append('logo', logoFile);

    const headers = { 'Accept': 'application/json' };
    if (ownershipToken) {
      headers['X-Business-Token'] = ownershipToken;
    }

    const res = await fetch(`${API_BASE}/public/businesses/${businessId}/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    return res.ok && data.success ? { success: true, logoUrl: data.data.logo_url } : { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Admin login — verify password with backend.
 * Token stored in memory only (not localStorage/sessionStorage) to prevent XSS theft.
 */

let _adminToken = null; // in-memory only

export function getAdminToken() {
  return _adminToken;
}

export function setAdminToken(token) {
  _adminToken = token;
}

export function clearAdminToken() {
  _adminToken = null;
}

export async function adminLogin(password) {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      _adminToken = data.token; // memory only — not in sessionStorage
      return { success: true, token: data.token };
    }
    return { success: false, message: data.message || 'Invalid password.' };
  } catch {
    return { success: false, message: 'Server connection error.' };
  }
}

/**
 * Generate review via backend proxy (keeps API keys on server).
 * Works for all businesses — no DB ID required.
 */
export async function generateReviewProxy(businessName, businessType, ratings, language = 'hinglish', options = {}) {
  try {
    const res = await fetch(`${API_BASE}/reviews/generate-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        business_type: businessType,
        ratings,
        language,
        subcategory: options.businessSubcategory || '',
        options: {
          regenerate:       options.regenerate || false,
          previous_text:    options.previousText || '',
          variation_seed:   options.variationSeed || '',
          customerKeywords: options.customerKeywords || '',
          city:             options.city || '',
          selectedDish:     options.selectedDish || '',
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.data.text : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch public business details by ID (without login)
 */
export async function fetchPublicBusinessAPI(businessId) {
  try {
    const res = await fetch(`${API_BASE}/public/business/${businessId}`, {
      headers: { 'Accept': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    console.error("fetchPublicBusinessAPI error:", err);
    return { success: false, message: 'Server connection error.' };
  }
}

/**
 * Fetch stats & reviews for a single business (logged-in owner)
 */
export async function fetchBusinessStatsAPI(businessId) {
  try {
    const res = await fetch(`${API_BASE}/businesses/${businessId}`, {
      headers: authHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error("fetchBusinessStatsAPI error:", err);
    return { success: false, message: 'Server connection error.' };
  }
}

/**
 * Fetch admin dashboard stats from database
 */
export async function fetchAdminStats() {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const adminToken = getAdminToken();
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(`${API_BASE}/admin/stats`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.success ? data.data : null;
    }
    return null;
  } catch {
    return null;
  }
}

