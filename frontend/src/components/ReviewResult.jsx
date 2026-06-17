import React, { useState } from 'react';
import './ReviewResult.css';

/**
 * ReviewResult — Displays the AI-generated review with actions
 * 
 * Shows loading animation while generating, then the review text
 * with copy, regenerate, and Google post buttons.
 * Includes step-by-step instructions so customers know the flow.
 */
export default function ReviewResult({
  reviewText,
  isLoading,
  reviewSource,
  toast,
  photos,
  onPhotoChange,
  onRegenerate,
  onCopy,
  onPostGoogle,
  onReviewTextChange,
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="result-card glass-card" id="result-card">
      <div className="review-header-row">
        <p className="review-output-label">Your AI Review</p>
        {!isLoading && reviewText && (
          <button className="edit-review-btn" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '💾 Done' : '✏️ Edit'}
          </button>
        )}
      </div>

      {/* Review Box */}
      <div className="review-box" id="review-box">
        {isLoading ? (
          <p className="review-placeholder">
            <span className="loading-dots">
              <span /><span /><span />
            </span>
            &nbsp; Crafting your review…
          </p>
        ) : isEditing ? (
          <textarea
            className="review-edit-textarea"
            value={reviewText}
            onChange={(e) => onReviewTextChange(e.target.value)}
          />
        ) : (
          <p className="review-gen-text">{reviewText}</p>
        )}
      </div>

      {/* Auto-copied badge + source */}
      {!isLoading && reviewText && (
        <div className="review-meta-row">
          <div className="auto-copied-badge">
            ✅ Review auto-copied to clipboard
          </div>
          {reviewSource && (
            <div className="review-source-badge">
              {reviewSource}
            </div>
          )}
        </div>
      )}

      {/* Photo Upload Option */}
      {!isLoading && reviewText && (
        <div className="photo-upload-section">
          <p className="photo-upload-label">📸 Add Photos to your review (Optional)</p>
          <input
            type="file"
            id="photo-upload"
            multiple
            accept="image/*"
            onChange={onPhotoChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="photo-upload" className="btn-upload-photo">
            Select Photos
          </label>
          {photos && photos.length > 0 && (
            <div className="photo-thumbnails">
              {photos.map((photo, idx) => (
                <img key={idx} src={photo} alt={`Upload ${idx}`} className="photo-thumb" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step-by-step instructions */}
      {!isLoading && reviewText && (
        <div className="post-steps">
          <div className="post-steps-title">📋 How to post your review:</div>
          <div className="post-step">
            <span className="step-num">1</span>
            <span>Tap <strong>"Post on Google"</strong> below</span>
          </div>
          <div className="post-step">
            <span className="step-num">2</span>
            <span>Google Reviews will open — <strong>long-press</strong> the text box & tap <strong>Paste</strong></span>
          </div>
          <div className="post-step">
            <span className="step-num">3</span>
            <span>Select your star rating, <strong>attach your photos</strong>, & hit <strong>Post</strong> ⭐</span>
          </div>
        </div>
      )}

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
