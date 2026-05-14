import React, { useRef, useCallback } from 'react';
import './StarRating.css';

/**
 * StarRating — Interactive 5-star rating with particle burst effects
 * 
 * Each star click triggers:
 * 1. Active state highlight (gold color)
 * 2. Pop animation on selected stars
 * 3. Particle burst from the clicked star
 */
export default function StarRating({ questionIndex, value, onRate }) {
  const starsRef = useRef([]);

  const burstParticles = useCallback((btn, val) => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const symbols = val >= 4 ? ['★', '✦', '✧', '⭐', '💫'] : ['★', '✦', '·'];
    const count = val >= 4 ? 12 : 7;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'star-particle';
      el.textContent = symbols[i % symbols.length];
      const angle = (i / count) * 360;
      const dist = 40 + Math.random() * 50;
      const rad = (angle * Math.PI) / 180;
      const tx = Math.cos(rad) * dist;
      const ty = Math.sin(rad) * dist - 20;
      const dur = (0.4 + Math.random() * 0.4) + 's';
      el.style.cssText = `
        left:${cx}px; top:${cy}px;
        color:${val >= 4 ? '#f59e0b' : '#94a3b8'};
        --tx:${tx}px; --ty:${ty}px;
        --rot:${Math.random() * 360}deg;
        --dur:${dur};
        font-size:${10 + Math.random() * 10}px;
        margin-left:-8px; margin-top:-8px;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
  }, []);

  const handleClick = useCallback((starValue, e) => {
    // Trigger particle burst
    burstParticles(e.currentTarget, starValue);

    // Animate stars
    starsRef.current.forEach((btn, i) => {
      if (!btn) return;
      btn.classList.remove('pop', 'shake-off', 'active');
      void btn.offsetWidth; // force reflow
      if (i < starValue) {
        btn.classList.add('active');
        setTimeout(() => {
          btn.classList.add('pop');
          setTimeout(() => btn.classList.remove('pop'), 350);
        }, i * 45);
      } else {
        btn.classList.add('shake-off');
        setTimeout(() => btn.classList.remove('shake-off'), 300);
      }
    });

    onRate(starValue);
  }, [onRate, burstParticles]);

  return (
    <div className="stars-row">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          ref={(el) => (starsRef.current[v - 1] = el)}
          className={`star-btn ${value >= v ? 'active' : ''}`}
          onClick={(e) => handleClick(v, e)}
          aria-label={`Rate ${v} star${v > 1 ? 's' : ''}`}
          id={`star-${questionIndex}-${v}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
