import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAnalyticsDashboard, getBusinessStats, EVENT_TYPES } from '../services/analyticsService';
import { isLoggedIn, fetchAdminBusinesses, fetchAdminUsers, getAdminToken, adminDeleteUserAPI } from '../services/authService';
import './AdminPanel.css';

const EVENT_LABELS = {
  [EVENT_TYPES.BUSINESS_REGISTERED]: { icon: '🏢', label: 'Business Registered', color: '#6366f1' },
  [EVENT_TYPES.REVIEW_GENERATED]: { icon: '✍️', label: 'Review Generated', color: '#10b981' },
  [EVENT_TYPES.REVIEW_REGENERATED]: { icon: '🔄', label: 'Review Regenerated', color: '#06b6d4' },
  [EVENT_TYPES.REVIEW_COPIED]: { icon: '📋', label: 'Review Copied', color: '#8b5cf6' },
  [EVENT_TYPES.REVIEW_POSTED]: { icon: '📤', label: 'Posted on Google', color: '#ef4444' },
  [EVENT_TYPES.QR_SCANNED]: { icon: '📱', label: 'QR Code Scanned', color: '#f59e0b' },
  [EVENT_TYPES.PAGE_VIEW]: { icon: '👁️', label: 'Page Viewed', color: '#64748b' },
  [EVENT_TYPES.PLAN_SELECTED]: { icon: '💎', label: 'Plan Selected', color: '#ec4899' },
};

// ── Animated Counter Hook ──
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.round(start + diff * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevTarget.current = target;
  }, [target, duration]);

  return count;
}

// ── Stat Card with animated count ──
function StatCard({ icon, label, value, sub, color, trend }) {
  const animatedValue = useCountUp(value);
  return (
    <div className="admin-stat-card" style={{ '--stat-color': color }}>
      <div className="stat-icon-wrap" style={{ background: `${color}15` }}>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-info">
        <div className="stat-value">{animatedValue}</div>
        <div className="stat-label">{label}</div>
        {sub && (
          <div className={`stat-sub ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : ''}`}>
            {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bar Chart ──
function BarChart({ data }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="chart-bars">
      {Object.entries(data).map(([date, count]) => {
        const pct = (count / max) * 100;
        return (
          <div className="chart-bar-wrap" key={date}>
            <div className="chart-bar" style={{ height: `${pct}%` }} title={`${date}: ${count}`}>
              {count > 0 && <span className="bar-count">{count}</span>}
            </div>
            <div className="chart-date">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Conversion Funnel ──
function ConversionFunnel({ scans, reviews, copied, posted }) {
  const steps = [
    { label: 'QR Scans', value: scans, icon: '📱', color: '#f59e0b' },
    { label: 'Reviews', value: reviews, icon: '✍️', color: '#6366f1' },
    { label: 'Copied', value: copied, icon: '📋', color: '#8b5cf6' },
    { label: 'Posted', value: posted, icon: '📤', color: '#10b981' },
  ];
  const maxVal = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="funnel-container">
      {steps.map((step, i) => {
        const pct = Math.max((step.value / maxVal) * 100, 8);
        const convRate = i > 0 && steps[i - 1].value > 0
          ? Math.round((step.value / steps[i - 1].value) * 100)
          : null;
        return (
          <React.Fragment key={step.label}>
            {i > 0 && (
              <div className="funnel-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                {convRate !== null && <span className="funnel-rate">{convRate}%</span>}
              </div>
            )}
            <div className="funnel-step">
              <div className="funnel-bar-wrap">
                <div className="funnel-bar" style={{ width: `${pct}%`, background: step.color }} />
              </div>
              <div className="funnel-info">
                <span className="funnel-icon">{step.icon}</span>
                <span className="funnel-val">{step.value}</span>
                <span className="funnel-lbl">{step.label}</span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── CSV Export ──
function exportToCSV(businesses) {
  if (!businesses.length) return;
  const headers = ['Name', 'Category', 'Plan', 'Owner Name', 'Owner Email', 'Owner Phone', 'Reviews', 'QR Scans', 'Registered Date', 'Last Active'];
  const rows = businesses.map(b => [
    b.name || '',
    b.type || '',
    b.plan || 'Free',
    b.ownerName || 'N/A',
    b.ownerEmail || 'N/A',
    b.ownerPhone || 'N/A',
    b.reviews,
    b.scans,
    new Date(b.registeredAt).toLocaleDateString('en-IN'),
    new Date(b.lastActive).toLocaleDateString('en-IN'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `review-app-businesses-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Users CSV Export ──
function exportUsersToCSV(userRows) {
  if (!userRows.length) return;
  const headers = ['Business Name', 'Category', 'Plan', 'Owner Name', 'Owner Email', 'Owner Phone', 'Reviews', 'QR Scans', 'User Registered Date', 'Last Active'];
  const rows = userRows.map(r => [
    r.bizName || '—',
    r.bizType || '—',
    r.bizPlan || '—',
    r.userName || '',
    r.userEmail || '',
    r.userPhone || 'N/A',
    r.bizReviews || 0,
    r.bizScans || 0,
    r.userRegisteredAt ? new Date(r.userRegisteredAt).toLocaleDateString('en-IN') : 'N/A',
    r.bizLastActive ? new Date(r.bizLastActive).toLocaleDateString('en-IN') : 'N/A',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `review-app-user-logins-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPanel({ onBack }) {
  const [data, setData] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Load local storage fallback first
    const dashboard = getAnalyticsDashboard();
    const localBiz = getBusinessStats();

    setData(dashboard);
    setBusinesses(localBiz);

    // Fetch from backend — getAdminToken() returns non-null if admin just logged in
    if (isLoggedIn() || getAdminToken()) {
      fetchAdminBusinesses().then(backendBiz => {
        if (backendBiz) {
          setBusinesses(backendBiz);
          setData(prev => prev ? {
            ...prev,
            totalBusinesses: backendBiz.length
          } : null);
        }
      });

      fetchAdminUsers().then(backendUsers => {
        if (backendUsers) {
          setUsers(backendUsers);
        }
      });
    }
  }, [refreshKey]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const handleDeleteUser = useCallback(async (userId, userName) => {
    if (!window.confirm(`Kya aap sach me "${userName}" ka account delete karna chahte hain? \nUser ke sabhi businesses, reviews aur scans permanently delete ho jayenge.`)) {
      return;
    }
    const res = await adminDeleteUserAPI(userId);
    if (res.success) {
      alert(res.message || 'User deleted successfully.');
      setRefreshKey(k => k + 1);
    } else {
      alert(res.message || 'Deletion failed.');
    }
  }, []);


  if (!data) return null;

  const sourceEntries = Object.entries(data.sourceBreakdown);

  // Date range filtered values
  const rangeLabel = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }[dateRange];
  const rangeReviews = dateRange === 'today' ? data.todayReviews
    : dateRange === 'week' ? data.weekReviews
    : dateRange === 'month' ? data.monthReviews
    : data.totalReviews;
  const rangeScans = dateRange === 'today' ? data.todayScans
    : dateRange === 'week' ? data.weekScans
    : data.totalQRScans;

  // Filtered businesses
  const filteredBiz = searchQuery
    ? businesses.filter(b =>
        (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.ownerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.ownerPhone || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : businesses;

  // Build detailed user rows (mapping users and their businesses)
  const userRows = [];
  users.forEach(u => {
    if (!u.businesses || u.businesses.length === 0) {
      userRows.push({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userPhone: u.phone,
        userRegisteredAt: u.registeredAt,
        bizId: null,
        bizName: null,
        bizType: null,
        bizEmoji: null,
        bizPlan: null,
        bizRegisteredAt: null,
        bizReviews: 0,
        bizScans: 0,
        bizLastActive: null,
      });
    } else {
      u.businesses.forEach(biz => {
        userRows.push({
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userPhone: u.phone,
          userRegisteredAt: u.registeredAt,
          bizId: biz.id,
          bizName: biz.name,
          bizType: biz.type,
          bizEmoji: biz.emoji,
          bizPlan: biz.plan,
          bizRegisteredAt: biz.registeredAt,
          bizReviews: biz.reviews,
          bizScans: biz.scans,
          bizLastActive: biz.lastActive,
        });
      });
    }
  });

  // Filtered users
  const filteredUserRows = searchQuery
    ? userRows.filter(r =>
        (r.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.userPhone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.bizName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.bizType || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : userRows;

  // Conversion rate
  const conversionRate = data.totalQRScans > 0
    ? Math.round((data.totalPosted / data.totalQRScans) * 100)
    : 0;

  return (
    <div className="admin-panel">
      {/* ── Header ── */}
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={onBack} title="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="admin-title">📊 Admin Panel</h1>
            <p className="admin-subtitle">
              Real-time analytics & user tracking
              {data.lastActivity && (
                <span className="last-active"> • Last: {new Date(data.lastActivity).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
              )}
            </p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Welcome Banner ── */}
      <div className="admin-welcome-banner">
        <div className="welcome-left">
          <div className="welcome-status">
            <span className="status-dot" />
            <span>System Active</span>
          </div>
          <div className="welcome-stat-row">
            <div className="welcome-stat">
              <span className="ws-val">{data.totalBusinesses}</span>
              <span className="ws-lbl">Businesses</span>
            </div>
            <div className="welcome-divider" />
            <div className="welcome-stat">
              <span className="ws-val">{data.totalReviews}</span>
              <span className="ws-lbl">Reviews</span>
            </div>
            <div className="welcome-divider" />
            <div className="welcome-stat">
              <span className="ws-val">{conversionRate}%</span>
              <span className="ws-lbl">Conversion</span>
            </div>
            <div className="welcome-divider" />
            <div className="welcome-stat">
              <span className="ws-val">{data.todayReviews}</span>
              <span className="ws-lbl">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {[
          { id: 'overview', label: '📈 Overview' },
          { id: 'funnel', label: '🔄 Funnel' },
          { id: 'users', label: '👥 User/Account' },
          { id: 'activity', label: '📋 Activity' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ Overview Tab ═══════════ */}
      {activeTab === 'overview' && (
        <div className="admin-content">
          {/* Date Range Filter */}
          <div className="date-range-bar">
            <span className="range-label">📅 Showing: <strong>{rangeLabel}</strong></span>
            <div className="range-btns">
              {['today', 'week', 'month', 'all'].map(r => (
                <button key={r} className={`range-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>
                  {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="admin-stats-grid">
            <StatCard icon="🏢" label="Businesses" value={data.totalBusinesses} sub={data.todayRegistrations > 0 ? `+${data.todayRegistrations} today` : 'registered'} color="#6366f1" trend={data.todayRegistrations > 0 ? 'up' : null} />
            <StatCard icon="✍️" label="Reviews" value={rangeReviews} sub={dateRange === 'all' ? `+${data.todayReviews} today` : `${rangeLabel}`} color="#10b981" trend={data.todayReviews > 0 ? 'up' : null} />
            <StatCard icon="📱" label="QR Scans" value={rangeScans} sub={dateRange === 'all' ? `+${data.todayScans} today` : `${rangeLabel}`} color="#f59e0b" trend={data.todayScans > 0 ? 'up' : null} />
            <StatCard icon="📋" label="Copied" value={data.totalCopied} sub="to clipboard" color="#8b5cf6" />
            <StatCard icon="📤" label="Posted" value={data.totalPosted} sub="on Google" color="#ef4444" />
            <StatCard icon="🎯" label="Conversion" value={conversionRate} sub="scan → post %" color="#06b6d4" />
          </div>

          {/* 7-Day Chart */}
          {Object.keys(data.dailyReviews).length > 0 && (
            <div className="admin-section">
              <div className="section-header">
                <h3 className="section-title">📊 Last 7 Days — Reviews</h3>
                <span className="section-badge">{data.weekReviews} total</span>
              </div>
              <BarChart data={data.dailyReviews} />
            </div>
          )}

          {/* Source Breakdown */}
          {sourceEntries.length > 0 && (
            <div className="admin-section">
              <div className="section-header">
                <h3 className="section-title">🤖 Review Sources</h3>
                <span className="section-badge">{sourceEntries.length} sources</span>
              </div>
              <div className="source-grid">
                {sourceEntries.sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                  const pct = Math.round((count / Math.max(data.totalReviews, 1)) * 100);
                  return (
                    <div className="source-item" key={source}>
                      <div className="source-name">{source}</div>
                      <div className="source-bar-wrap">
                        <div className="source-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="source-count">{count}</div>
                      <div className="source-pct">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Funnel Tab ═══════════ */}
      {activeTab === 'funnel' && (
        <div className="admin-content">
          <div className="admin-section">
            <div className="section-header">
              <h3 className="section-title">🔄 Conversion Funnel</h3>
              <span className="section-badge">QR Scan → Google Post</span>
            </div>
            <p className="funnel-desc">Track how customers move from scanning your QR code to posting a review on Google.</p>
            <ConversionFunnel
              scans={data.totalQRScans}
              reviews={data.totalReviews}
              copied={data.totalCopied}
              posted={data.totalPosted}
            />
          </div>

          {/* Funnel Stats */}
          <div className="funnel-stats-grid">
            <div className="funnel-stat-card">
              <div className="fs-icon" style={{ color: '#f59e0b' }}>📱→✍️</div>
              <div className="fs-label">Scan → Review</div>
              <div className="fs-value">{data.totalQRScans > 0 ? Math.round((data.totalReviews / data.totalQRScans) * 100) : 0}%</div>
            </div>
            <div className="funnel-stat-card">
              <div className="fs-icon" style={{ color: '#8b5cf6' }}>✍️→📋</div>
              <div className="fs-label">Review → Copy</div>
              <div className="fs-value">{data.totalReviews > 0 ? Math.round((data.totalCopied / data.totalReviews) * 100) : 0}%</div>
            </div>
            <div className="funnel-stat-card">
              <div className="fs-icon" style={{ color: '#10b981' }}>📋→📤</div>
              <div className="fs-label">Copy → Post</div>
              <div className="fs-value">{data.totalCopied > 0 ? Math.round((data.totalPosted / data.totalCopied) * 100) : 0}%</div>
            </div>
            <div className="funnel-stat-card highlight">
              <div className="fs-icon" style={{ color: '#ef4444' }}>📱→📤</div>
              <div className="fs-label">Overall Conversion</div>
              <div className="fs-value">{conversionRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Businesses Tab ═══════════ */}
      {activeTab === 'businesses' && (
        <div className="admin-content">
          {/* Search & Export Bar */}
          <div className="biz-toolbar">
            <div className="biz-search-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="biz-search"
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            <div className="biz-toolbar-right">
              <span className="biz-count">{filteredBiz.length} of {businesses.length}</span>
              <button className="export-btn" onClick={() => exportToCSV(businesses)} disabled={!businesses.length}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {filteredBiz.length === 0 ? (
            <div className="admin-empty">
              <div className="empty-icon">{searchQuery ? '🔍' : '🏢'}</div>
              <p>{searchQuery ? `No results for "${searchQuery}"` : 'No businesses registered yet'}</p>
              {searchQuery && <button className="empty-clear-btn" onClick={() => setSearchQuery('')}>Clear Search</button>}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Category</th>
                    <th>Plan</th>
                    <th>Owner Name</th>
                    <th>Owner Email</th>
                    <th>Owner Phone</th>
                    <th>Reviews</th>
                    <th>QR Scans</th>
                    <th>Registered</th>
                    <th>Last Active</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBiz.map((biz, i) => {
                    const daysSinceActive = Math.floor((Date.now() - biz.lastActive) / 86400000);
                    const status = daysSinceActive <= 1 ? 'active' : daysSinceActive <= 7 ? 'recent' : 'inactive';
                    return (
                      <tr key={biz.id || i}>
                        <td>
                          <div className="biz-cell">
                            <span className="biz-emoji">{biz.emoji || '⭐'}</span>
                            <span className="biz-name">{biz.name || '—'}</span>
                          </div>
                        </td>
                        <td><span className="biz-type-badge">{biz.type || '—'}</span></td>
                        <td><span className={`plan-badge plan-${(biz.plan || 'free').toLowerCase()}`}>{biz.plan || 'Free'}</span></td>
                        <td><span className="owner-name-txt">{biz.ownerName || 'N/A'}</span></td>
                        <td><span className="owner-email-txt">{biz.ownerEmail || 'N/A'}</span></td>
                        <td><span className="owner-phone-txt">{biz.ownerPhone || 'N/A'}</span></td>
                        <td className="num-cell">{biz.reviews}</td>
                        <td className="num-cell">{biz.scans}</td>
                        <td className="date-cell">{biz.registeredAt ? new Date(biz.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="date-cell">{biz.lastActive ? new Date(biz.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {status === 'active' ? '🟢 Active' : status === 'recent' ? '🟡 Recent' : '⚪ Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Users Tab ═══════════ */}
      {activeTab === 'users' && (
        <div className="admin-content">
          {/* Search & Export Bar */}
          <div className="biz-toolbar">
            <div className="biz-search-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="biz-search"
                placeholder="Search user accounts/businesses..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            <div className="biz-toolbar-right">
              <span className="biz-count">{filteredUserRows.length} of {userRows.length}</span>
              <button className="export-btn" onClick={() => exportUsersToCSV(userRows)} disabled={!userRows.length}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {filteredUserRows.length === 0 ? (
            <div className="admin-empty">
              <div className="empty-icon">{searchQuery ? '🔍' : '👥'}</div>
              <p>{searchQuery ? `No results for "${searchQuery}"` : 'No registered user accounts yet'}</p>
              {searchQuery && <button className="empty-clear-btn" onClick={() => setSearchQuery('')}>Clear Search</button>}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Category</th>
                    <th>Plan</th>
                    <th>Owner Name</th>
                    <th>Owner Email</th>
                    <th>Owner Phone</th>
                    <th>Reviews</th>
                    <th>QR Scans</th>
                    <th>Registered Date</th>
                    <th>Last Active</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserRows.map((row, i) => {
                    const daysSinceActive = row.bizLastActive ? Math.floor((Date.now() - row.bizLastActive) / 86400000) : 999;
                    const status = daysSinceActive <= 1 ? 'active' : daysSinceActive <= 7 ? 'recent' : 'inactive';
                    return (
                      <tr key={(row.bizId || 'nobiz') + '_' + row.userId + '_' + i}>
                        <td>
                          <div className="biz-cell">
                            <span className="biz-emoji">{row.bizEmoji || '👤'}</span>
                            <span className="biz-name">{row.bizName || '— No Business —'}</span>
                          </div>
                        </td>
                        <td>
                          {row.bizType ? (
                            <span className="biz-type-badge">{row.bizType}</span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td>
                          {row.bizPlan ? (
                            <span className={`plan-badge plan-${row.bizPlan.toLowerCase()}`}>{row.bizPlan}</span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td><span className="owner-name-txt">{row.userName || '—'}</span></td>
                        <td><span className="owner-email-txt">{row.userEmail || '—'}</span></td>
                        <td><span className="owner-phone-txt">{row.userPhone || 'N/A'}</span></td>
                        <td className="num-cell">{row.bizReviews}</td>
                        <td className="num-cell">{row.bizScans}</td>
                        <td className="date-cell">
                          {row.userRegisteredAt ? new Date(row.userRegisteredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="date-cell">
                          {row.bizLastActive ? new Date(row.bizLastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td>
                          {row.bizId ? (
                            <span className={`status-badge status-${status}`}>
                              {status === 'active' ? '🟢 Active' : status === 'recent' ? '🟡 Recent' : '⚪ Inactive'}
                            </span>
                          ) : (
                            <span className="status-badge status-inactive">⚪ N/A</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="delete-user-btn"
                            onClick={() => handleDeleteUser(row.userId, row.userName)}
                            title="Delete User Account"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Activity Log Tab ═══════════ */}
      {activeTab === 'activity' && (
        <div className="admin-content">
          <div className="activity-header">
            <h3 className="section-title">📋 Recent Activity</h3>
            <span className="section-badge">{data.recentActivity.length} events</span>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="admin-empty">
              <div className="empty-icon">📋</div>
              <p>No activity recorded yet</p>
              <p className="empty-hint">Events will appear here when users interact with the app</p>
            </div>
          ) : (
            <div className="activity-list">
              {data.recentActivity.map((evt, i) => {
                const info = EVENT_LABELS[evt.type] || { icon: '📌', label: evt.type, color: '#64748b' };
                return (
                  <div className="activity-item" key={i} style={{ '--evt-color': info.color, animationDelay: `${i * 0.04}s` }}>
                    <div className="activity-timeline">
                      <div className="timeline-dot" style={{ background: info.color }} />
                      {i < data.recentActivity.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div className="activity-icon" style={{ background: `${info.color}12` }}>{info.icon}</div>
                    <div className="activity-info">
                      <div className="activity-label">{info.label}</div>
                      <div className="activity-detail">
                        {evt.data?.businessName && <span className="act-biz">{evt.data.businessName}</span>}
                        {evt.data?.source && <span className="act-source">{evt.data.source}</span>}
                        {evt.data?.plan && <span className="act-plan">{evt.data.plan}</span>}
                      </div>
                    </div>
                    <div className="activity-time">{evt.timeAgo}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
