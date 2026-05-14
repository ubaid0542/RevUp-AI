/**
 * Dynamic Favicon Generator
 * 
 * Creates a favicon from:
 * 1. The uploaded business logo (cropped to circle), OR
 * 2. A gradient letter avatar using the first letter of the business name
 */

/**
 * Update the browser tab favicon dynamically.
 * @param {string} logoDataUrl - Base64 data URL of uploaded logo (or empty)
 * @param {string} businessName - Business name (used for letter avatar fallback)
 */
export function updateFavicon(logoDataUrl, businessName) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Ensure we have a favicon link element
  let link = document.getElementById('dynamic-favicon');
  if (!link) {
    link = document.createElement('link');
    link.id = 'dynamic-favicon';
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);
  }

  function applyFavicon() {
    link.href = canvas.toDataURL('image/png');
  }

  if (logoDataUrl) {
    // Use the uploaded logo — draw it clipped to a circle
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0, size, size);
      applyFavicon();
    };
    img.src = logoDataUrl;
  } else {
    // Generate a gradient letter avatar
    const letter = businessName ? businessName.charAt(0).toUpperCase() : 'R';

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#6c63ff');
    grad.addColorStop(1, '#a78bfa');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + 1);

    applyFavicon();
  }
}

/**
 * Reset favicon to default star emoji.
 */
export function resetFavicon() {
  const link = document.getElementById('dynamic-favicon');
  if (link) {
    // Create a small star favicon
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark background circle
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(1, '#6c63ff');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Star emoji
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', size / 2, size / 2 + 2);

    link.href = canvas.toDataURL('image/png');
  }
}
