import React from 'react';
import './ReviewResult.css';

/**
 * ReviewResult — Displays the AI-generated review with actions
 * 
 * Shows loading animation while generating, then the review text
 * with copy, regenerate, and Google post buttons.
 */
export default function ReviewResult({
  reviewText,
  isLoading,
  toast,
  onRegenerate,
  onCopy,
  onPostGoogle,
}) {
  return (
    <div className="result-card glass-card" id="result-card">
      <p className="review-output-label">Your AI Review</p>

      {/* Review Box */}
      <div className="review-box" id="review-box">
        {isLoading ? (
          <p className="review-placeholder">
            <span className="loading-dots">
              <span /><span /><span />
            </span>
            &nbsp; Crafting your review…
          </p>
        ) : (
          <p className="review-gen-text">{reviewText}</p>
        )}
      </div>

      {/* Regenerate */}
      <div className="regen-row">
        <button
          className="regen-btn"
          id="regen-btn"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          ↻ Regenerate
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-row">
        <button
          className="btn-copy"
          id="btn-copy"
          onClick={onCopy}
          disabled={isLoading || !reviewText}
        >
          📋 Copy
        </button>
        <button
          className="btn-gmb"
          id="btn-gmb"
          onClick={onPostGoogle}
          disabled={isLoading || !reviewText}
        >
          Post on Google ↗
        </button>
      </div>

      {/* Toast Message */}
      <div
        className="toast"
        id="toast"
        style={{ opacity: toast ? 1 : 0 }}
      >
        {toast}
      </div>
    </div>
  );
}
