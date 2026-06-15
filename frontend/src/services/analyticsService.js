/**
 * Analytics Service
 * 
 * Tracks all user events in localStorage + sends to Google Analytics (GA4).
 * Used by the Admin Panel to show real-time stats.
 */

const ANALYTICS_KEY = 'rai_analytics_events';
const ANALYTICS_SUMMARY_KEY = 'rai_analytics_summary';

// ── Event Types ──
export const EVENT_TYPES = {
  BUSINESS_REGISTERED: 'business_registered',
  REVIEW_GENERATED: 'review_generated',
  REVIEW_REGENERATED: 'review_regenerated',
  REVIEW_COPIED: 'review_copied',
  REVIEW_POSTED: 'review_posted',
  QR_SCANNED: 'qr_scanned',
  PAGE_VIEW: 'page_view',
  PLAN_SELECTED: 'plan_selected',
};

/**
 * Load all stored events
 */
function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
  } catch { return []; }
}

/**
 * Save events to localStorage (keep last 1000 to avoid bloat)
 */
function saveEvents(events) {
  const trimmed = events.slice(-1000);
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
}

/**
 * Load/save summary counters (fast access for dashboard)
 */
function loadSummary() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_SUMMARY_KEY) || '{}');
  } catch { return {}; }
}

function saveSummary(summary) {
  localStorage.setItem(ANALYTICS_SUMMARY_KEY, JSON.stringify(summary));
}

/**
 * Track an analytics event
 * PII (name, email, phone) is NEVER stored in analytics events.
 * @param {string} eventType - One of EVENT_TYPES
 * @param {object} data - Additional event data (no PII allowed)
 */
export function trackEvent(eventType, data = {}) {
  // Strip any PII fields before storing
  const { ownerName, ownerEmail, ownerPhone, email, phone, name, ...safeData } = data;

  const event = {
    type: eventType,
    data: safeData,   // PII-free
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
  };

  const events = loadEvents();
  events.push(event);
  saveEvents(events);

  const summary = loadSummary();
  summary[eventType] = (summary[eventType] || 0) + 1;
  summary.lastActivity = Date.now();
  saveSummary(summary);

  // Send to Google Analytics (GA4) if available — also PII-free
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventType, {
      ...safeData,
      event_category: 'app',
    });
  }

  return event;
}

/**
 * Get all analytics data for the Admin Panel
 */
export function getAnalyticsDashboard() {
  const events = loadEvents();
  const summary = loadSummary();

  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const last7days = new Date(now - 7 * 86400000).toISOString().split('T')[0];
  const last30days = new Date(now - 30 * 86400000).toISOString().split('T')[0];

  // Filter events by time
  const todayEvents = events.filter(e => e.date === today);
  const weekEvents = events.filter(e => e.date >= last7days);
  const monthEvents = events.filter(e => e.date >= last30days);

  // Count by type
  const countByType = (evts, type) => evts.filter(e => e.type === type).length;

  // Unique businesses
  const allBusinesses = events
    .filter(e => e.type === EVENT_TYPES.BUSINESS_REGISTERED)
    .map(e => e.data);

  // Reviews by source
  const reviewEvents = events.filter(e => 
    e.type === EVENT_TYPES.REVIEW_GENERATED || e.type === EVENT_TYPES.REVIEW_REGENERATED
  );
  const sourceBreakdown = {};
  reviewEvents.forEach(e => {
    const src = e.data?.source || 'Unknown';
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  });

  // Daily review counts (last 7 days)
  const dailyReviews = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().split('T')[0];
    dailyReviews[d] = countByType(events.filter(e => e.date === d), EVENT_TYPES.REVIEW_GENERATED)
      + countByType(events.filter(e => e.date === d), EVENT_TYPES.REVIEW_REGENERATED);
  }

  // Recent activity (last 20 events)
  const recentActivity = events.slice(-20).reverse().map(e => ({
    type: e.type,
    data: e.data,
    timestamp: e.timestamp,
    timeAgo: getTimeAgo(e.timestamp),
  }));

  return {
    // Totals
    totalBusinesses: allBusinesses.length,
    totalReviews: (summary[EVENT_TYPES.REVIEW_GENERATED] || 0) + (summary[EVENT_TYPES.REVIEW_REGENERATED] || 0),
    totalQRScans: summary[EVENT_TYPES.QR_SCANNED] || 0,
    totalCopied: summary[EVENT_TYPES.REVIEW_COPIED] || 0,
    totalPosted: summary[EVENT_TYPES.REVIEW_POSTED] || 0,

    // Today
    todayReviews: countByType(todayEvents, EVENT_TYPES.REVIEW_GENERATED) + countByType(todayEvents, EVENT_TYPES.REVIEW_REGENERATED),
    todayScans: countByType(todayEvents, EVENT_TYPES.QR_SCANNED),
    todayRegistrations: countByType(todayEvents, EVENT_TYPES.BUSINESS_REGISTERED),

    // This week
    weekReviews: countByType(weekEvents, EVENT_TYPES.REVIEW_GENERATED) + countByType(weekEvents, EVENT_TYPES.REVIEW_REGENERATED),
    weekScans: countByType(weekEvents, EVENT_TYPES.QR_SCANNED),

    // This month
    monthReviews: countByType(monthEvents, EVENT_TYPES.REVIEW_GENERATED) + countByType(monthEvents, EVENT_TYPES.REVIEW_REGENERATED),

    // Breakdowns
    sourceBreakdown,
    dailyReviews,
    businesses: allBusinesses,
    recentActivity,
    lastActivity: summary.lastActivity || null,
  };
}

/**
 * Get list of all registered businesses with their stats
 */
export function getBusinessStats() {
  const events = loadEvents();
  
  // Get unique businesses
  const bizMap = {};
  events
    .filter(e => e.type === EVENT_TYPES.BUSINESS_REGISTERED)
    .forEach(e => {
      const id = e.data?.id || e.data?.name;
      if (id) {
        bizMap[id] = {
          ...e.data,
          registeredAt: e.timestamp,
          reviews: 0,
          scans: 0,
          lastActive: e.timestamp,
        };
      }
    });

  // Count reviews per business
  events
    .filter(e => e.type === EVENT_TYPES.REVIEW_GENERATED || e.type === EVENT_TYPES.REVIEW_REGENERATED)
    .forEach(e => {
      const id = e.data?.bizId || e.data?.businessName;
      if (bizMap[id]) {
        bizMap[id].reviews++;
        bizMap[id].lastActive = Math.max(bizMap[id].lastActive, e.timestamp);
      }
    });

  // Count scans per business
  events
    .filter(e => e.type === EVENT_TYPES.QR_SCANNED)
    .forEach(e => {
      const id = e.data?.bizId;
      if (bizMap[id]) {
        bizMap[id].scans++;
        bizMap[id].lastActive = Math.max(bizMap[id].lastActive, e.timestamp);
      }
    });

  return Object.values(bizMap).sort((a, b) => b.registeredAt - a.registeredAt);
}

// ── Helpers ──

function getTimeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + ' min ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  if (d < 604800000) return Math.floor(d / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
