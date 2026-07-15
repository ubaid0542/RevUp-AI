import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fetchBusinessStatsAPI } from '../services/authService';
import { generateReplyAPI, postReplyAPI } from '../services/reviewService';
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

  // Reply Modal State
  const [replyModal, setReplyModal] = useState({
    open: false, reviewId: null, reviewText: '', stars: 0, reviewIdDisplay: '',
    replyText: '', loading: false, status: 'none', // none | generated | posted
  });

  // Plan check for Reply feature
  const canReply = ['growth', 'pro'].includes(business.plan?.toLowerCase());

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
      id: r.id,
      stars: r.stars,
      text: r.generated_text,
      time: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      photos: r.photos,
      reply_text: r.reply_text || null,
      reply_status: r.reply_status || 'none',
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
    // Solid black premium base
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow at top
    const topGlow = ctx.createRadialGradient(cx, 200, 50, cx, 200, 500);
    topGlow.addColorStop(0, 'rgba(255, 215, 0, 0.06)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, 700);

    // ── AI CIRCUIT BOARD BACKGROUND ──
    // Google brand colors for circuit elements
    const circuitColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

    // Helper: hex to rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    // Helper: draw a glowing node (small illuminated dot)
    const drawNode = (nx, ny, color, radius = 3, glowR = 16) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
      ng.addColorStop(0, hexToRgba(color, 0.6));
      ng.addColorStop(0.5, hexToRgba(color, 0.2));
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.95);
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    };

    // Helper: draw a glowing circuit line
    const drawCircuitLine = (points, color, lineW = 2) => {
      if (points.length < 2) return;
      // Outer glow pass
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW + 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.stroke();
      ctx.restore();
      // Core line pass
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.stroke();
      ctx.restore();
    };

    // Helper: draw hexagon outline
    const drawHexagon = (hx, hy, size, color) => {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = hx + size * Math.cos(angle);
        const py = hy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    // ─── LEFT SIDE CIRCUIT PATTERNS ───
    // Main vertical line (left edge)
    drawCircuitLine([[60, 80], [60, 400], [90, 430], [90, 650], [60, 680], [60, 900], [90, 930], [90, 1100], [60, 1130], [60, 1350]], circuitColors[0]);
    // Branch lines from left
    drawCircuitLine([[60, 200], [140, 200], [140, 280], [180, 320]], circuitColors[1]);
    drawCircuitLine([[60, 400], [120, 400], [160, 440], [160, 520]], circuitColors[2]);
    drawCircuitLine([[90, 650], [160, 650], [190, 680], [190, 750]], circuitColors[3]);
    drawCircuitLine([[90, 930], [150, 930], [150, 1000], [200, 1050]], circuitColors[0]);
    drawCircuitLine([[60, 1130], [130, 1130], [170, 1170]], circuitColors[1]);
    // Secondary left vertical
    drawCircuitLine([[140, 120], [140, 200]], circuitColors[3]);
    drawCircuitLine([[160, 440], [200, 440], [200, 380]], circuitColors[2]);

    // Left nodes (glowing dots at intersections)
    drawNode(60, 200, circuitColors[1], 3, 14);
    drawNode(140, 280, circuitColors[1], 2, 10);
    drawNode(60, 400, circuitColors[2], 3, 14);
    drawNode(160, 520, circuitColors[2], 2, 10);
    drawNode(90, 650, circuitColors[3], 3, 14);
    drawNode(190, 750, circuitColors[3], 2, 10);
    drawNode(90, 930, circuitColors[0], 3, 14);
    drawNode(200, 1050, circuitColors[0], 2, 10);
    drawNode(60, 1130, circuitColors[1], 3, 14);

    // ─── RIGHT SIDE CIRCUIT PATTERNS (mirrored) ───
    drawCircuitLine([[W-60, 80], [W-60, 400], [W-90, 430], [W-90, 650], [W-60, 680], [W-60, 900], [W-90, 930], [W-90, 1100], [W-60, 1130], [W-60, 1350]], circuitColors[0]);
    drawCircuitLine([[W-60, 200], [W-140, 200], [W-140, 280], [W-180, 320]], circuitColors[1]);
    drawCircuitLine([[W-60, 400], [W-120, 400], [W-160, 440], [W-160, 520]], circuitColors[2]);
    drawCircuitLine([[W-90, 650], [W-160, 650], [W-190, 680], [W-190, 750]], circuitColors[3]);
    drawCircuitLine([[W-90, 930], [W-150, 930], [W-150, 1000], [W-200, 1050]], circuitColors[0]);
    drawCircuitLine([[W-60, 1130], [W-130, 1130], [W-170, 1170]], circuitColors[1]);
    drawCircuitLine([[W-140, 120], [W-140, 200]], circuitColors[3]);
    drawCircuitLine([[W-160, 440], [W-200, 440], [W-200, 380]], circuitColors[2]);

    // Right nodes
    drawNode(W-60, 200, circuitColors[1], 3, 14);
    drawNode(W-140, 280, circuitColors[1], 2, 10);
    drawNode(W-60, 400, circuitColors[2], 3, 14);
    drawNode(W-160, 520, circuitColors[2], 2, 10);
    drawNode(W-90, 650, circuitColors[3], 3, 14);
    drawNode(W-190, 750, circuitColors[3], 2, 10);
    drawNode(W-90, 930, circuitColors[0], 3, 14);
    drawNode(W-200, 1050, circuitColors[0], 2, 10);
    drawNode(W-60, 1130, circuitColors[1], 3, 14);

    // ─── HEXAGONS (subtle, scattered on sides) ───
    drawHexagon(100, 150, 25, circuitColors[0]);
    drawHexagon(70, 550, 20, circuitColors[2]);
    drawHexagon(130, 800, 30, circuitColors[3]);
    drawHexagon(80, 1200, 22, circuitColors[1]);
    // Right side hexagons
    drawHexagon(W-100, 150, 25, circuitColors[0]);
    drawHexagon(W-70, 550, 20, circuitColors[2]);
    drawHexagon(W-130, 800, 30, circuitColors[3]);
    drawHexagon(W-80, 1200, 22, circuitColors[1]);
    // Mid-area hexagons (very subtle)
    drawHexagon(200, 350, 18, circuitColors[3]);
    drawHexagon(W-200, 350, 18, circuitColors[3]);
    drawHexagon(220, 1050, 16, circuitColors[0]);
    drawHexagon(W-220, 1050, 16, circuitColors[0]);

    // ─── DIGITAL PARTICLES (tiny glowing dots scattered) ───
    const particlePositions = [
      [45, 130], [170, 160], [30, 500], [200, 600], [50, 1050], [180, 1250],
      [W-45, 130], [W-170, 160], [W-30, 500], [W-200, 600], [W-50, 1050], [W-180, 1250],
      [250, 250], [W-250, 250], [230, 900], [W-230, 900],
    ];
    particlePositions.forEach((p, i) => {
      ctx.save();
      ctx.globalAlpha = 0.12 + (i % 3) * 0.04;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.5, 0, Math.PI * 2);
      ctx.fillStyle = circuitColors[i % 4];
      ctx.fill();
      ctx.restore();
    });

    // ─── AMBIENT GLOW (soft Google-color neon from edges) ───
    // Left edge blue glow
    const leftGlow = ctx.createLinearGradient(0, 0, 150, 0);
    leftGlow.addColorStop(0, 'rgba(66, 133, 244, 0.12)');
    leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, 150, H);

    // Right edge green glow
    const rightGlow = ctx.createLinearGradient(W, 0, W-150, 0);
    rightGlow.addColorStop(0, 'rgba(52, 168, 83, 0.12)');
    rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(W-150, 0, 150, H);

    // Bottom red glow
    const bottomGlow = ctx.createLinearGradient(0, H, 0, H-100);
    bottomGlow.addColorStop(0, 'rgba(234, 67, 53, 0.05)');
    bottomGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, H-100, W, 100);

    // ─── AI CIRCULAR ARCS (concentric rings / radar pattern) ───
    // Left-side arcs radiating from circuit nodes
    const drawArc = (arcX, arcY, radius, startAngle, endAngle, color, alpha = 0.12, dashPattern = []) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      if (dashPattern.length) ctx.setLineDash(dashPattern);
      ctx.beginPath();
      ctx.arc(arcX, arcY, radius, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    };

    // Left side concentric arcs (from top-left area)
    drawArc(0, 300, 180, -0.3, 1.2, circuitColors[0], 0.10, [6, 8]);
    drawArc(0, 300, 240, -0.2, 0.9, circuitColors[1], 0.08, [4, 10]);
    drawArc(0, 300, 310, -0.1, 0.7, circuitColors[2], 0.06, [3, 12]);

    // Left side lower arcs
    drawArc(30, 900, 150, -0.5, 1.0, circuitColors[3], 0.10, [5, 8]);
    drawArc(30, 900, 220, -0.3, 0.8, circuitColors[0], 0.07, [4, 10]);

    // Right side concentric arcs (mirror)
    drawArc(W, 300, 180, Math.PI - 1.2, Math.PI + 0.3, circuitColors[0], 0.10, [6, 8]);
    drawArc(W, 300, 240, Math.PI - 0.9, Math.PI + 0.2, circuitColors[1], 0.08, [4, 10]);
    drawArc(W, 300, 310, Math.PI - 0.7, Math.PI + 0.1, circuitColors[2], 0.06, [3, 12]);

    // Right side lower arcs
    drawArc(W - 30, 900, 150, Math.PI - 1.0, Math.PI + 0.5, circuitColors[3], 0.10, [5, 8]);
    drawArc(W - 30, 900, 220, Math.PI - 0.8, Math.PI + 0.3, circuitColors[0], 0.07, [4, 10]);

    // Center-area subtle full rings (very faint, behind QR)
    drawArc(cx, 700, 380, 0, Math.PI * 2, circuitColors[0], 0.03, [2, 15]);
    drawArc(cx, 700, 450, 0, Math.PI * 2, circuitColors[2], 0.025, [2, 20]);

    // Corner accent arcs
    drawArc(0, 0, 120, 0, Math.PI / 2, circuitColors[1], 0.15, [8, 6]);
    drawArc(W, 0, 120, Math.PI / 2, Math.PI, circuitColors[3], 0.15, [8, 6]);
    drawArc(0, H, 100, -Math.PI / 2, 0, circuitColors[2], 0.12, [6, 8]);
    drawArc(W, H, 100, Math.PI, Math.PI * 1.5, circuitColors[0], 0.12, [6, 8]);

    // Small dotted circles at node points (AI network feel)
    drawArc(140, 280, 20, 0, Math.PI * 2, circuitColors[1], 0.18, [2, 4]);
    drawArc(190, 750, 18, 0, Math.PI * 2, circuitColors[3], 0.18, [2, 4]);
    drawArc(W - 140, 280, 20, 0, Math.PI * 2, circuitColors[1], 0.18, [2, 4]);
    drawArc(W - 190, 750, 18, 0, Math.PI * 2, circuitColors[3], 0.18, [2, 4]);
    drawArc(200, 1050, 15, 0, Math.PI * 2, circuitColors[0], 0.15, [2, 4]);
    drawArc(W - 200, 1050, 15, 0, Math.PI * 2, circuitColors[0], 0.15, [2, 4]);

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

    // ── NEON GLOW PASSES (outer glow behind border) ──
    // Red glow (top-left)
    ctx.save();
    ctx.lineWidth = 18;
    ctx.shadowColor = '#EA4335';
    ctx.shadowBlur = 35;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY);
    ctx.lineTo(sX + sR, sY);
    ctx.quadraticCurveTo(sX, sY, sX, sY + sR);
    ctx.lineTo(sX, sY + sSize/2);
    ctx.strokeStyle = '#EA4335';
    ctx.stroke();
    ctx.restore();

    // Blue glow (top-right)
    ctx.save();
    ctx.lineWidth = 18;
    ctx.shadowColor = '#4285F4';
    ctx.shadowBlur = 35;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY);
    ctx.lineTo(sX + sSize - sR, sY);
    ctx.quadraticCurveTo(sX + sSize, sY, sX + sSize, sY + sR);
    ctx.lineTo(sX + sSize, sY + sSize/2);
    ctx.strokeStyle = '#4285F4';
    ctx.stroke();
    ctx.restore();

    // Yellow glow (bottom-right)
    ctx.save();
    ctx.lineWidth = 18;
    ctx.shadowColor = '#FBBC05';
    ctx.shadowBlur = 35;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(sX + sSize, sY + sSize/2);
    ctx.lineTo(sX + sSize, sY + sSize - sR);
    ctx.quadraticCurveTo(sX + sSize, sY + sSize, sX + sSize - sR, sY + sSize);
    ctx.lineTo(sX + sSize/2, sY + sSize);
    ctx.strokeStyle = '#FBBC05';
    ctx.stroke();
    ctx.restore();

    // Green glow (bottom-left)
    ctx.save();
    ctx.lineWidth = 18;
    ctx.shadowColor = '#34A853';
    ctx.shadowBlur = 35;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(sX + sSize/2, sY + sSize);
    ctx.lineTo(sX + sR, sY + sSize);
    ctx.quadraticCurveTo(sX, sY + sSize, sX, sY + sSize - sR);
    ctx.lineTo(sX, sY + sSize/2);
    ctx.strokeStyle = '#34A853';
    ctx.stroke();
    ctx.restore();

    // ── CORE BORDER (sharp, on top of glow) ──
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

    curY += 115;

    // ── "Thank you!" + "WE APPRECIATE YOUR SUPPORT" ──
    // Gold divider line
    ctx.save();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.fillRect(cx - 160, curY, 130, 1.5);
    ctx.fillRect(cx + 30, curY, 130, 1.5);
    ctx.restore();

    curY += 40;

    // "Thank you!" in cursive italic gold
    ctx.save();
    ctx.font = 'italic 52px "Georgia", "Palatino", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.fillText('Thank you!', cx, curY);
    ctx.restore();

    curY += 35;

    // "WE APPRECIATE YOUR SUPPORT" in small white caps
    ctx.save();
    ctx.font = '600 16px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.letterSpacing = '3px';
    ctx.fillText('WE APPRECIATE YOUR SUPPORT', cx, curY);
    ctx.restore();

    curY += 30;

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
              <div className="review-item glass-card" key={r.id || i}>
                {/* Meta: Review ID */}
                {r.id && (
                  <div className="review-item-meta">
                    <span className="review-item-id">REV-{r.id}</span>
                  </div>
                )}
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
                <div className="review-item-bottom">
                  <span className="review-item-status status-posted">✅ Posted on Google</span>
                  {/* Reply button — Growth/Pro only */}
                  {canReply && r.id && (
                    <>
                      {r.reply_status === 'posted' ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="review-replied-badge">🟢 Replied</span>
                          <button className="review-view-reply-btn" onClick={() => setReplyModal({
                            open: true, reviewId: r.id, reviewText: r.text, stars: r.stars,
                            reviewIdDisplay: `REV-${r.id}`, replyText: r.reply_text || '', loading: false, status: 'posted',
                          })}>👁 View</button>
                        </div>
                      ) : r.reply_status === 'generated' ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button className="review-reply-btn" onClick={() => setReplyModal({
                            open: true, reviewId: r.id, reviewText: r.text, stars: r.stars,
                            reviewIdDisplay: `REV-${r.id}`, replyText: r.reply_text || '', loading: false, status: 'generated',
                          })}>✏️ Edit Reply</button>
                        </div>
                      ) : (
                        <button className="review-reply-btn" onClick={() => handleOpenReplyModal(r)}>💬 Reply</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Reply Modal ── */}
      {replyModal.open && (
        <div className="reply-modal-overlay" onClick={() => !replyModal.loading && setReplyModal(prev => ({ ...prev, open: false }))}>
          <div className="reply-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="reply-modal-header">
              <div className="reply-modal-title">🤖 AI Review Reply</div>
              <button className="reply-modal-close" onClick={() => !replyModal.loading && setReplyModal(prev => ({ ...prev, open: false }))}>✕</button>
            </div>

            {/* Review Info */}
            <div className="reply-review-info">
              <div className="reply-review-meta">
                <span className="reply-review-stars">{'★'.repeat(replyModal.stars)}{'☆'.repeat(5 - replyModal.stars)}</span>
                <span className="reply-review-id-tag">{replyModal.reviewIdDisplay}</span>
              </div>
              <div className="reply-review-text">"{replyModal.reviewText}"</div>
            </div>

            {/* Body */}
            <div className="reply-modal-body">
              {replyModal.loading ? (
                <div className="reply-loading">
                  <div className="reply-loading-spinner"></div>
                  <span>Generating AI reply...</span>
                </div>
              ) : replyModal.replyText ? (
                <>
                  <label className="reply-label">🤖 AI Generated Reply</label>
                  <textarea
                    className="reply-textarea"
                    value={replyModal.replyText}
                    onChange={e => setReplyModal(prev => ({ ...prev, replyText: e.target.value }))}
                    disabled={replyModal.status === 'posted'}
                  />
                </>
              ) : (
                <div className="reply-loading" style={{ padding: '20px 0' }}>
                  <span style={{ color: 'var(--text3)' }}>Click "✨ Generate Reply" to create an AI reply</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="reply-modal-actions">
              {replyModal.status !== 'posted' && (
                <button
                  className="reply-action-btn primary"
                  disabled={replyModal.loading}
                  onClick={() => handleGenerateReply(replyModal.replyText ? true : false)}
                >
                  {replyModal.replyText ? '✨ Regenerate' : '✨ Generate Reply'}
                </button>
              )}
              {replyModal.replyText && (
                <button className="reply-action-btn" onClick={() => {
                  navigator.clipboard.writeText(replyModal.replyText);
                  onToast('📋 Reply copied to clipboard!');
                }}>📋 Copy</button>
              )}
              {replyModal.replyText && replyModal.status !== 'posted' && (
                <button
                  className="reply-action-btn success"
                  disabled={replyModal.loading}
                  onClick={handlePostReply}
                >📤 Post to Google</button>
              )}
              <button
                className="reply-action-btn"
                onClick={() => setReplyModal(prev => ({ ...prev, open: false }))}
                disabled={replyModal.loading}
              >❌ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Reply Handlers ──
  function handleOpenReplyModal(review) {
    setReplyModal({
      open: true, reviewId: review.id, reviewText: review.text, stars: review.stars,
      reviewIdDisplay: `REV-${review.id}`, replyText: '', loading: true, status: 'none',
    });
    // Auto-generate reply on open
    generateReplyAPI(review.id, false).then(result => {
      if (result && !result.error) {
        setReplyModal(prev => ({ ...prev, replyText: result.reply_text, loading: false, status: 'generated' }));
        // Update the review in the local list
        setRecentReviews(prev => prev.map(r => r.id === review.id ? { ...r, reply_text: result.reply_text, reply_status: 'generated' } : r));
      } else {
        setReplyModal(prev => ({ ...prev, loading: false }));
        onToast(result?.message || '❌ Failed to generate reply');
      }
    });
  }

  function handleGenerateReply(isRegeneration) {
    setReplyModal(prev => ({ ...prev, loading: true }));
    generateReplyAPI(replyModal.reviewId, isRegeneration).then(result => {
      if (result && !result.error) {
        setReplyModal(prev => ({ ...prev, replyText: result.reply_text, loading: false, status: 'generated' }));
        setRecentReviews(prev => prev.map(r => r.id === replyModal.reviewId ? { ...r, reply_text: result.reply_text, reply_status: 'generated' } : r));
      } else {
        setReplyModal(prev => ({ ...prev, loading: false }));
        onToast(result?.message || '❌ Failed to generate reply');
      }
    });
  }

  function handlePostReply() {
    setReplyModal(prev => ({ ...prev, loading: true }));

    // 1. Copy reply to clipboard
    navigator.clipboard.writeText(replyModal.replyText).catch(() => {});

    // 2. Mark as posted in backend
    postReplyAPI(replyModal.reviewId, replyModal.replyText).then(result => {
      if (result && !result.error) {
        setReplyModal(prev => ({ ...prev, loading: false, status: 'posted' }));
        setRecentReviews(prev => prev.map(r => r.id === replyModal.reviewId ? { ...r, reply_text: replyModal.replyText, reply_status: 'posted' } : r));

        // 3. Open Google Business Profile to paste reply
        const searchQuery = encodeURIComponent(`${business.name} ${business.city || ''}`.trim());
        const gmbLink = business.gmb || `https://www.google.com/search?q=${searchQuery}`;

        onToast('✅ Reply copied! Opening Google — just paste & submit your reply!');

        setTimeout(() => {
          window.open(gmbLink, '_blank');
        }, 600);
      } else {
        setReplyModal(prev => ({ ...prev, loading: false }));
        onToast(result?.message || '❌ Failed to post reply');
      }
    });
  }
}
