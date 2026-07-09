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
export default function Dashboard({ business, reviews, onPreview, onNewBusiness, onEdit, onToast }) {
  const qrRef = useRef(null);
  const [qrReady, setQrReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const isRealDbId = business.id && !business.id.toString().startsWith('biz_') && !business.id.toString().startsWith('demo');

  // Fetch real statistics and reviews from backend on mount/id change
  const fetchStats = () => {
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
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh stats every 15 seconds so owner doesn't need to manually refresh
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [business.id]);

  // Build review-page URL that customers land on when they scan the QR
  const reviewPageUrl = `${window.location.origin}${window.location.pathname}?biz=${encodeURIComponent(business.id)}`;
  const gmbLink = business.gmb || '';
  const bizEmoji = business.emoji || '⭐';

  // Fallback local calculations
  const bizReviews = reviews.filter((r) => String(r.bizId) === String(business.id));
  const displayTotalReviews = stats ? stats.totalReviews : bizReviews.length;
  const displayAvgRating = stats 
    ? (stats.avgRating > 0 ? stats.avgRating : '—') 
    : (bizReviews.length > 0 ? (bizReviews.reduce((s, r) => s + r.stars, 0) / bizReviews.length).toFixed(1) : '—');
  const displayThisMonth = stats ? stats.thisMonth : bizReviews.filter((r) => Date.now() - r.time < 30 * 86400000).length;
  const displayScans = stats ? stats.scans : (bizReviews.length + Math.floor(bizReviews.length * 0.3));

  // Format reviews list
  let displayReviewsList = [];
  if (stats) {
    displayReviewsList = recentReviews.map(r => ({
      stars: r.stars,
      text: r.generated_text,
      time: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      photos: r.photos,
    }));
    
    // Add local reviews that aren't in the backend yet (for instant feedback when testing on same device)
    const backendTexts = new Set(displayReviewsList.map(r => r.text));
    const localNew = bizReviews.filter(r => !backendTexts.has(r.text));
    
    // Merge, sort by newest, and take top 15
    displayReviewsList = [...localNew, ...displayReviewsList].sort((a, b) => b.time - a.time).slice(0, 15);
  } else {
    displayReviewsList = bizReviews.slice().reverse().slice(0, 10);
  }

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
   * Download a premium Google Review QR Poster (1080×1920 PNG).
   * Black luxury design with gold accents, Google branding, and dynamic business data.
   */
  const downloadQR = async () => {
    const srcCanvas = qrRef.current?.querySelector('canvas');
    if (!srcCanvas) { onToast('QR is being generated...'); return; }

    const W = 1080, H = 1480;
    const cx = W / 2; // center X

    const dlCanvas = document.createElement('canvas');
    dlCanvas.width = W;
    dlCanvas.height = H;
    const ctx = dlCanvas.getContext('2d');

    // ── Helper: rounded rect ──
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // ── Helper: load image ──
    const loadImg = (src) => new Promise((resolve) => {
      if (src && src.startsWith('/storage/')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL 
          ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') 
          : window.location.origin;
        src = baseUrl + src;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    // ── 1. BACKGROUND ──
    // Solid black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow at top
    const topGlow = ctx.createRadialGradient(cx, 200, 50, cx, 200, 500);
    topGlow.addColorStop(0, 'rgba(255, 215, 0, 0.06)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, 700);

    // ── 2. GOOGLE COLOR BAR AT TOP ──
    const barH = 8;
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * (W / 4), 0, W / 4, barH);
    });

    // ── 3. GOOGLE "G" LOGO ──
    let curY = 110;
    
    // Draw 4-color Google G using composite operations
    const gSize = 130;
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 160; 
    gCanvas.height = 160;
    const gCtx = gCanvas.getContext('2d');
    
    gCtx.font = 'bold 130px "Product Sans", "Google Sans", Arial, sans-serif';
    gCtx.textAlign = 'center'; 
    gCtx.textBaseline = 'middle';
    gCtx.fillStyle = '#000';
    gCtx.fillText('G', 80, 85);
    
    // Apply source-in for colors
    gCtx.globalCompositeOperation = 'source-in';
    gCtx.fillStyle = '#4285F4'; gCtx.fillRect(0, 0, 75, 160); // Blue left
    gCtx.fillStyle = '#EA4335'; gCtx.fillRect(75, 0, 85, 75); // Red top right
    gCtx.fillStyle = '#FBBC05'; gCtx.fillRect(75, 75, 85, 40); // Yellow right mid
    gCtx.fillStyle = '#34A853'; gCtx.fillRect(75, 115, 85, 45); // Green bottom right
    gCtx.fillRect(0, 115, 160, 45); // Green bottom curve
    
    ctx.drawImage(gCanvas, cx - 80, curY - 80);

    curY += 80;

    // ── 4. GOLD STARS ──
    ctx.save();
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('★  ★  ★  ★  ★', cx, curY);
    ctx.restore();
    curY += 55;

    // ── 5. "REVIEW US ON" TEXT ──
    ctx.save();
    ctx.font = 'bold 32px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '4px';
    ctx.fillText('REVIEW US ON', cx, curY);
    ctx.restore();
    curY += 55;

    // ── 6. "Google" WORD in brand colors ──
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 85px "Product Sans", "Google Sans", Arial, sans-serif';
    const googleLetters = [
      { ch: 'G', color: '#4285F4' },
      { ch: 'o', color: '#EA4335' },
      { ch: 'o', color: '#FBBC05' },
      { ch: 'g', color: '#4285F4' },
      { ch: 'l', color: '#34A853' },
      { ch: 'e', color: '#EA4335' },
    ];
    let totalGoogleW = 0;
    googleLetters.forEach(l => { totalGoogleW += ctx.measureText(l.ch).width; });
    let gx = cx - totalGoogleW / 2;
    googleLetters.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillText(l.ch, gx + ctx.measureText(l.ch).width / 2, curY);
      gx += ctx.measureText(l.ch).width;
    });
    ctx.restore();
    curY += 65;

    // ── 7. "YOUR FEEDBACK MATTERS" ──
    ctx.save();
    ctx.font = '20px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    const fbText = 'YOUR FEEDBACK MATTERS';
    const fbW = ctx.measureText(fbText).width;
    // Golden lines
    ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.fillRect(cx - fbW / 2 - 50, curY - 5, 35, 1.5);
    ctx.fillRect(cx + fbW / 2 + 15, curY - 5, 35, 1.5);
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '3px';
    ctx.fillText(fbText, cx, curY);
    ctx.restore();
    curY += 40;

    // ── 8. QR CODE SECTION ──
    const qrContainerSize = 580;
    const qrPadding = 30;
    const qrBorderW = 6;
    const qrBoxX = cx - qrContainerSize / 2;
    const qrBoxY = curY;

    // ── Google-color exact border ──
    const sX = qrBoxX - qrBorderW / 2;
    const sY = qrBoxY - qrBorderW / 2;
    const sSize = qrContainerSize + qrBorderW;
    const sR = 24;

    ctx.save();
    ctx.lineWidth = qrBorderW;
    
    // Top-left: Red
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY);
    ctx.lineTo(sX + sR, sY);
    ctx.quadraticCurveTo(sX, sY, sX, sY + sR);
    ctx.lineTo(sX, sY + sSize/2);
    ctx.strokeStyle = '#EA4335';
    ctx.stroke();

    // Top-right: Blue
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY);
    ctx.lineTo(sX + sSize - sR, sY);
    ctx.quadraticCurveTo(sX + sSize, sY, sX + sSize, sY + sR);
    ctx.lineTo(sX + sSize, sY + sSize/2);
    ctx.strokeStyle = '#4285F4';
    ctx.stroke();

    // Bottom-right: Yellow
    ctx.beginPath();
    ctx.moveTo(sX + sSize, sY + sSize/2);
    ctx.lineTo(sX + sSize, sY + sSize - sR);
    ctx.quadraticCurveTo(sX + sSize, sY + sSize, sX + sSize - sR, sY + sSize);
    ctx.lineTo(sX + sSize/2, sY + sSize);
    ctx.strokeStyle = '#FBBC05';
    ctx.stroke();

    // Bottom-left: Green
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY + sSize);
    ctx.lineTo(sX + sR, sY + sSize);
    ctx.quadraticCurveTo(sX, sY + sSize, sX, sY + sSize - sR);
    ctx.lineTo(sX, sY + sSize/2);
    ctx.strokeStyle = '#34A853';
    ctx.stroke();
    
    ctx.restore();

    // White QR container
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.15)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffffff';
    roundRect(qrBoxX, qrBoxY, qrContainerSize, qrContainerSize, 20);
    ctx.fill();
    ctx.restore();

    // Draw QR code (black, large)
    const qrDrawSize = qrContainerSize - qrPadding * 2;
    const qrDrawX = qrBoxX + qrPadding;
    const qrDrawY = qrBoxY + qrPadding;

    // Create a temp canvas for black QR
    const tempQR = document.createElement('canvas');
    tempQR.width = qrDrawSize;
    tempQR.height = qrDrawSize;
    const tempCtx = tempQR.getContext('2d');

    // Re-generate QR in black on white for the poster
    if (window.QRCode) {
      const tempDiv = document.createElement('div');
      new window.QRCode(tempDiv, {
        text: reviewPageUrl,
        width: qrDrawSize,
        height: qrDrawSize,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.H,
      });
      // Wait for QR to render
      await new Promise(r => setTimeout(r, 300));
      const qrCanvas = tempDiv.querySelector('canvas');
      if (qrCanvas) {
        tempCtx.drawImage(qrCanvas, 0, 0, qrDrawSize, qrDrawSize);
      }
    }

    ctx.drawImage(tempQR, qrDrawX, qrDrawY, qrDrawSize, qrDrawSize);

    curY = qrBoxY + qrContainerSize + 40;

    // ── 10. CTA BUTTON: "📱 Scan to Review" ──
    const btnW = 380, btnH = 60, btnR = 30;
    const btnX = cx - btnW / 2, btnY = curY;

    // Button glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
    ctx.shadowBlur = 20;
    roundRect(btnX, btnY, btnW, btnH, btnR);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.fill();
    ctx.restore();

    // Button border
    ctx.save();
    roundRect(btnX, btnY, btnW, btnH, btnR);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Button text
    ctx.save();
    ctx.font = 'bold 24px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('📱  SCAN TO REVIEW', cx, btnY + btnH / 2 + 8);
    ctx.restore();

    curY = btnY + btnH + 40;

    // ── Divider with Gold Heart ──
    ctx.save();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.fillRect(cx - 150, curY - 5, 120, 1.5);
    ctx.fillRect(cx + 30, curY - 5, 120, 1.5);
    ctx.fillStyle = '#FFD700';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤', cx, curY - 4);
    ctx.restore();

    curY += 35;

    // ── 11. BUSINESS DETAILS (Side-by-side layout) ──
    const catEmojis = {
      'Restaurant': '🍽️', 'Cafe': '☕', 'Hotel': '🏨', 'Resort': '🏖️',
      'Hospital': '🏥', 'Clinic': '🩺', 'Dental Clinic': '🦷',
      'Medical Store': '💊', 'Pharmacy': '⚕️', 'Salon': '💇',
      'Hair cutting Shop': '✂️', 'Spa': '🧖', 'Gym': '🏋️',
      'Fitness Center': '💪', 'School': '🏫', 'Coaching Center': '📚',
      'College': '🎓', 'Institute': '🏛️', 'Jewellery Shop': '💍',
      'Clothing Store': '👕', 'Boutique': '🛍️', 'Supermarket': '🛒',
      'Grocery Store': '🥬', 'Mobile Shop': '📱', 'Laptop Store': '💻',
      'Electronics Store': '🔌', 'Book Store': '📚', 'Bakery': '🧁',
      'Sweet Shop': '🍬', 'Ice Cream Shop': '🍦', 'Pet Shop': '🐾',
      'Veterinary Clinic': '🐕', 'Car Showroom': '🚗', 'Auto Repair': '🔧',
      'Garage': '🛠️', 'Photographer': '📸', 'Wedding Planner': '💒',
      'Event Planner': '🎉', 'Travel Agency': '✈️', 'Lawyer': '⚖️',
      'Printing Press': '🖨️', 'Cinema Hall': '🎬', 'Banquet Hall': '🏛️',
      'E-commerce Store': '🛒', 'Retail & Shopping': '🛍️', 'Other': '📦'
    };
    const catEmoji = catEmojis[business.type] || business.emoji || '⭐';
    const catCity = [business.type, business.city].filter(Boolean).join('  •  ');
    let bName = business.name ? business.name.toUpperCase() : 'MY BUSINESS';

    ctx.save();
    ctx.font = 'bold 36px "Inter", "Segoe UI", Arial, sans-serif';
    const nameW = ctx.measureText(bName).width;
    ctx.font = '22px "Inter", "Segoe UI", Arial, sans-serif';
    const subW = ctx.measureText(catCity).width;
    const textBlockW = Math.max(nameW, subW);
    const iconSize = 80;
    const gap = 24;
    const totalBlockW = iconSize + gap + textBlockW;
    const startX = cx - totalBlockW / 2;
    
    // ── Draw Enhanced Category Icon ──
    const iconCenterY = curY + iconSize / 2;
    const iconRadius = iconSize / 2;
    
    // Outer glow & background
    ctx.beginPath();
    ctx.arc(startX + iconRadius, iconCenterY, iconRadius, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(20, 20, 25, 0.9)'; // Dark premium background
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Gold border
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();

    // The Category Emoji
    ctx.font = `${iconSize * 0.6}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(catEmoji, startX + iconRadius, iconCenterY + 4);
    
    ctx.restore();

    // Draw Texts
    const textX = startX + iconSize + gap;
    ctx.save();
    ctx.textAlign = 'left';
    
    // Name
    ctx.font = 'bold 36px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bName, textX, curY + 35);
    
    // Subtext
    ctx.font = '22px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(catCity, textX, curY + 75);
    ctx.restore();

    // ── 12. FOOTER: "Powered by RevUp-AI" ──
    const footY = H - 50;
    // Divider line above footer
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(cx - 200, footY - 35, 400, 1);
    ctx.restore();

    ctx.save();
    ctx.font = '18px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('Powered by', cx - 55, footY);
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 20px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText('RevUp-AI', cx + 45, footY);
    // Small sparkle
    ctx.font = '16px Arial';
    ctx.fillText('✨', cx - 115, footY);
    ctx.restore();

    // ── 13. BOTTOM GOOGLE COLOR BAR ──
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * (W / 4), H - 8, W / 4, 8);
    });

    // ── EXPORT PNG ──
    dlCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${business.name.replace(/\s+/g, '_')}_Google_Review_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onToast('✅ Premium QR Poster downloaded! Print & place at your counter 📥');
    }, 'image/png');
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
          <button className="btn-new-biz" onClick={onEdit}>
            ✏ Edit Business
          </button>
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

      {/* QR Section — Premium */}
      <div className="qr-section qr-section--premium glass-card">
        <div className="qr-premium-header">
          <div className="qr-premium-icon">📱</div>
          <div>
            <div className="qr-section-title">Your QR Code</div>
            <div className="qr-section-sub">
              Print this QR &amp; place at your counter — customers scan, rate &amp; post on Google!
            </div>
          </div>
        </div>

        <div className="qr-box qr-box--premium">
          <div className="qr-code-wrap qr-code-wrap--premium">
            <div className="qr-glow-ring" />
            <div ref={qrRef} id="qr-code" />
            <div className="qr-scan-badge">Scan Me ✨</div>
          </div>
          <div className="qr-info">
            <div className="qr-info-label">🔗 Review Page Link</div>
            <div className="qr-link">{reviewPageUrl}</div>
            {gmbLink && (
              <>
                <div className="qr-info-label" style={{ marginTop: 10 }}>🌐 Google Review Link</div>
                <div className="qr-link">{gmbLink}</div>
              </>
            )}
            <div className="qr-actions qr-actions--premium">
              <button className="qr-btn primary qr-btn--glow" onClick={downloadQR}>⬇️ Download QR</button>
              <button className="qr-btn" onClick={copyLink}>📋 Copy Link</button>
              <button className="qr-btn" onClick={onPreview}>👁️ Preview</button>
            </div>
          </div>
        </div>

        <div className="qr-tip-banner">
          💡 <strong>Pro Tip:</strong> Laminate the QR and place it near billing — 3x more scans!
        </div>
      </div>

      {/* Reviews List */}
      <div className="reviews-section glass-card">
        <div className="reviews-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="qr-section-title" style={{ margin: 0 }}>⭐ Recent Reviews</div>
            <button 
              onClick={fetchStats} 
              disabled={loading}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {loading ? '⏳...' : '↻ Refresh'}
            </button>
          </div>
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
