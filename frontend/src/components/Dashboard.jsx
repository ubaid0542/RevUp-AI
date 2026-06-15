import React, { useEffect, useRef, useState } from 'react';
import { fetchBusinessStatsAPI } from '../services/authService';
import './Dashboard.css';

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + ' min ago';
  if (d < 86400000) return Math.floor(d / 3600000) + ' hours ago';
  return Math.floor(d / 86400000) + ' days ago';
}

/**
 * Draw the business emoji in the center of a QR canvas.
 * Uses high error-correction (H = 30%) so up to ~30% of the QR can be covered.
 */
function overlayEmojiOnCanvas(canvas, emoji) {
  if (!canvas || !emoji) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const emojiSize = Math.round(size * 0.22); // emoji covers ~22% of QR width
  const padding = Math.round(emojiSize * 0.22);
  const bgSize = emojiSize + padding * 2;

  const cx = (size - bgSize) / 2;
  const cy = (size - bgSize) / 2;

  // White circle background so QR behind emoji stays scannable
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, bgSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(108, 99, 255, 0.25)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  // Accent ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, bgSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw emoji text
  ctx.save();
  ctx.font = `${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 2);
  ctx.restore();
}

/**
 * Dashboard — Stats, QR Code, Review History
 */
export default function Dashboard({ business, reviews, onPreview, onNewBusiness, onToast }) {
  const qrRef = useRef(null);
  const [qrReady, setQrReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const isRealDbId = business.id && !business.id.toString().startsWith('biz_') && !business.id.toString().startsWith('demo');

  // Fetch real statistics and reviews from backend on mount/id change
  useEffect(() => {
    if (isRealDbId) {
      setLoading(true);
      fetchBusinessStatsAPI(business.id)
      .then(resData => {
        if (resData.success && resData.data) {
          setStats(resData.data.stats);
          setRecentReviews(resData.data.recentReviews);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch business stats:", err);
        setLoading(false);
      });
    }
  }, [business.id]);

  // Build review-page URL that customers land on when they scan the QR
  const reviewPageUrl = `${window.location.origin}${window.location.pathname}?biz=${encodeURIComponent(business.id)}`;
  const gmbLink = business.gmb || '';
  const bizEmoji = business.emoji || '⭐';

  // Fallback local calculations
  const bizReviews = reviews.filter((r) => r.bizId === business.id);
  const displayTotalReviews = stats ? stats.totalReviews : bizReviews.length;
  const displayAvgRating = stats 
    ? (stats.avgRating > 0 ? stats.avgRating : '—') 
    : (bizReviews.length > 0 ? (bizReviews.reduce((s, r) => s + r.stars, 0) / bizReviews.length).toFixed(1) : '—');
  const displayThisMonth = stats ? stats.thisMonth : bizReviews.filter((r) => Date.now() - r.time < 30 * 86400000).length;
  const displayScans = stats ? stats.scans : (bizReviews.length + Math.floor(bizReviews.length * 0.3));

  // Format reviews list
  const displayReviewsList = stats 
    ? recentReviews.map(r => ({
        stars: r.stars,
        text: r.generated_text,
        time: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        photos: r.photos,
      }))
    : bizReviews.slice().reverse().slice(0, 10);

  useEffect(() => {
    if (!business.id || !qrRef.current) return;

    const renderQR = () => {
      if (!qrRef.current || !window.QRCode) return;
      qrRef.current.innerHTML = '';

      // QR encodes the review-page URL (not GMB directly)
      new window.QRCode(qrRef.current, {
        text: reviewPageUrl,
        width: 180,
        height: 180,
        colorDark: '#6c63ff',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.H,
      });

      // After QR renders, overlay the business emoji in the center
      // Use a slightly longer delay + retry to ensure canvas is fully painted
      const applyOverlay = (retries = 3) => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (canvas && canvas.width > 0) {
          overlayEmojiOnCanvas(canvas, bizEmoji);
          setQrReady(true);
        } else if (retries > 0) {
          setTimeout(() => applyOverlay(retries - 1), 200);
        }
      };
      setTimeout(() => applyOverlay(), 300);
    };

    // Dynamically load QRCode library if not loaded
    if (!window.QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = renderQR;
      document.head.appendChild(script);
    } else {
      renderQR();
    }
  }, [reviewPageUrl, bizEmoji]);

  /**
   * Download a branded QR image:
   * - QR code with emoji overlay
   * - Business name + category printed below
   * - "Scan to Review" label
   */
  const downloadQR = () => {
    const srcCanvas = qrRef.current?.querySelector('canvas');
    if (!srcCanvas) { onToast('QR is being generated...'); return; }

    // Create an enlarged canvas with branding
    const qrSize = 400;
    const padding = 40;
    const textAreaHeight = 90;
    const totalW = qrSize + padding * 2;
    const totalH = qrSize + padding * 2 + textAreaHeight;

    const dlCanvas = document.createElement('canvas');
    dlCanvas.width = totalW;
    dlCanvas.height = totalH;
    const ctx = dlCanvas.getContext('2d');

    // White background with rounded feel
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw QR scaled up
    ctx.drawImage(srcCanvas, padding, padding, qrSize, qrSize);

    // Re-overlay emoji at higher resolution
    const emojiSize = Math.round(qrSize * 0.22);
    const bgPad = Math.round(emojiSize * 0.22);
    const bgDiam = emojiSize + bgPad * 2;
    const centerX = padding + qrSize / 2;
    const centerY = padding + qrSize / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, bgDiam / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(108, 99, 255, 0.3)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, bgDiam / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bizEmoji, centerX, centerY + 2);
    ctx.restore();

    // "Scan to Review" label
    const labelY = padding + qrSize + 28;
    ctx.save();
    ctx.font = 'bold 18px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#6c63ff';
    ctx.textAlign = 'center';
    ctx.fillText('📱 Scan to Review', totalW / 2, labelY);
    ctx.restore();

    // Business name
    ctx.save();
    ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(business.name, totalW / 2, labelY + 28);
    ctx.restore();

    // Category (+ City if available)
    ctx.save();
    ctx.font = '12px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    const subLabel = [
      business.type,
      business.city ? `(${business.city})` : ''
    ].filter(Boolean).join(' ');
    ctx.fillText(subLabel, totalW / 2, labelY + 48);
    ctx.restore();

    dlCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${business.name.replace(/\s+/g, '_')}_Review.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onToast('QR downloaded! Customers scan → Review page → Google 📥');
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(reviewPageUrl)
      .then(() => onToast('Review page link copied! 📋'))
      .catch(() => onToast('Link: ' + reviewPageUrl));
  };

  return (
    <div className="dashboard screen">
      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-welcome gradient-text">
            {business.emoji || '⭐'} {business.name}
          </div>
          <div className="dash-category">
            {business.type}
            {business.subcategory && business.subcategory !== 'All' && ` • ${business.subcategory}`}
            {business.city && ` • 📍 ${business.city}`}
          </div>
        </div>
        <div className="dash-header-actions">
          <button className="btn-new-biz" onClick={onNewBusiness}>
            + New Business
          </button>
          <div className="dash-plan-badge">{business.plan} Plan</div>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        {[
          { num: displayTotalReviews, label: 'Total Reviews' },
          { num: displayAvgRating + (displayAvgRating !== '—' ? ' ⭐' : ''), label: 'Average Rating' },
          { num: displayThisMonth, label: 'This Month' },
          { num: displayScans, label: 'QR Scans' },
        ].map((s, i) => (
          <div className="dash-stat glass-card" key={i}>
            <div className="dash-stat-num">{s.num}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* QR Section */}
      <div className="qr-section glass-card">
        <div className="qr-section-title">📱 Your QR Code</div>
        <div className="qr-section-sub">
          Print this QR code and place it at your counter — customers scan it, answer quick questions, and get a ready-to-post Google review!
        </div>
        <div className="qr-box">
          <div className="qr-code-wrap">
            <div ref={qrRef} id="qr-code" />
          </div>
          <div className="qr-info">
            <div className="qr-info-label">Review Page Link:</div>
            <div className="qr-link">{reviewPageUrl}</div>
            {gmbLink && (
              <>
                <div className="qr-info-label" style={{ marginTop: 10 }}>Google Review Link:</div>
                <div className="qr-link">{gmbLink}</div>
              </>
            )}
            <div className="qr-actions">
              <button className="qr-btn primary" onClick={downloadQR}>⬇️ Download QR</button>
              <button className="qr-btn" onClick={copyLink}>📋 Copy Link</button>
              <button className="qr-btn" onClick={onPreview}>👁️ Preview</button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="reviews-section glass-card">
        <div className="reviews-section-header">
          <div className="qr-section-title">⭐ Recent Reviews</div>
          <div className="reviews-count">{displayTotalReviews} reviews</div>
        </div>
        <div className="reviews-list">
          {displayReviewsList.length === 0 ? (
            <div className="reviews-empty">
              No reviews yet — share your QR code to get started! 🚀
            </div>
          ) : (
            displayReviewsList.map((r, i) => (
              <div className="review-item glass-card" key={i}>
                <div className="review-item-top">
                  <span className="review-item-stars">
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </span>
                  <span className="review-item-time">{timeAgo(r.time)}</span>
                </div>
                <div className="review-item-text">{r.text}</div>
                {r.photos && r.photos.length > 0 && (
                  <div className="review-item-photos" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {r.photos.map((photo, pIdx) => (
                      <img key={pIdx} src={photo.startsWith('data:') || photo.startsWith('http') || photo.startsWith('/storage') ? photo : `/storage/${photo}`} alt="Customer upload" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                    ))}
                  </div>
                )}
                <span className="review-item-status status-posted">✅ Posted on Google</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
