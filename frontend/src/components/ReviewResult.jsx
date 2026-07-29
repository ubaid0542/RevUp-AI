import React, { useState, useEffect, useRef } from 'react';
import './ReviewResult.css';

/**
 * ReviewResult — Displays the AI-generated review with actions
 * 
 * Shows loading animation while generating, then the review text
 * with a typewriter word-by-word reveal animation.
 * Includes copy, regenerate, and Google post buttons.
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
  const [displayedWords, setDisplayedWords] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const prevReviewRef = useRef('');

  // Typewriter animation — reveal words one by one
  const words = reviewText ? reviewText.split(' ') : [];

  useEffect(() => {
    // Only animate when new review text arrives (not during editing)
    if (reviewText && reviewText !== prevReviewRef.current && !isEditing) {
      prevReviewRef.current = reviewText;
      setDisplayedWords(0);
      setAnimationDone(false);

      const totalWords = reviewText.split(' ').length;
      let wordIndex = 0;
      const speed = Math.max(30, Math.min(60, 1500 / totalWords)); // adaptive speed

      const timer = setInterval(() => {
        wordIndex++;
        setDisplayedWords(wordIndex);
        if (wordIndex >= totalWords) {
          clearInterval(timer);
          setAnimationDone(true);
        }
      }, speed);

      return () => clearInterval(timer);
    } else if (!reviewText) {
      setDisplayedWords(0);
      setAnimationDone(false);
      prevReviewRef.current = '';
    }
  }, [reviewText, isEditing]);

  const visibleText = animationDone || isEditing
    ? reviewText
    : words.slice(0, displayedWords).join(' ');

  // Rotating loading messages to keep user engaged
  const loadingMessages = [
    '✨ AI aapka review likh raha hai...',
    '⏳ Almost ready, please wait...',
    '🔄 Server se connect ho raha hai...',
    '📝 Best review craft ho raha hai...',
    '⚡ Finalizing your review...',
  ];
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) { setLoadingMsgIndex(0); return; }
    const timer = setInterval(() => {
      setLoadingMsgIndex(prev => (prev + 1) % loadingMessages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isLoading]);

  return (
    <div className={`result-card glass-card ${!isLoading && reviewText ? 'result-card--loaded' : ''}`} id="result-card">
      <div className="review-header-row">
        <p className="review-output-label">
          {isLoading ? '⏳ Generating...' : '✨ Your AI Review'}
        </p>
        {!isLoading && reviewText && animationDone && (
          <button className="edit-review-btn" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '💾 Done' : '✏️ Edit'}
          </button>
        )}
      </div>

      {/* Review Box */}
      <div className={`review-box ${!isLoading && reviewText ? 'review-box--active' : ''}`} id="review-box">
        {isLoading ? (
          <div className="review-loading-state">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            <p className="loading-text">{loadingMessages[loadingMsgIndex]}</p>
          </div>
        ) : isEditing ? (
          <textarea
            className="review-edit-textarea"
            value={reviewText}
            onChange={(e) => onReviewTextChange(e.target.value)}
          />
        ) : (
          <p className="review-gen-text">
            {visibleText}
            {!animationDone && reviewText && <span className="typing-cursor">|</span>}
          </p>
        )}
      </div>

      {/* Auto-copied badge + source */}
      {!isLoading && reviewText && animationDone && (
        <div className="review-meta-row">
          <div className="auto-copied-badge">
            ✅ Review copied successfully! You're one step away from posting it on Google.
          </div>
          {reviewSource && (
            <div className="review-source-badge">
              {reviewSource}
            </div>
          )}
        </div>
      )}

      {/* Photo Upload Option */}
      {!isLoading && reviewText && animationDone && (
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

      {/* Prominent Instruction Card */}
      {!isLoading && reviewText && animationDone && (
        <div className="instruction-card">
          <div className="instruction-card-title">🎉 Your Review is Ready!</div>
          <div className="instruction-card-desc">
            Your review has already been copied to your clipboard. Click the button below to open Google Reviews. Once Google opens, simply paste your review into the review box, add your rating/photos if you want, and tap "Post".
          </div>
        </div>
      )}

      {/* Step-by-step instructions */}
      {!isLoading && reviewText && animationDone && (
        <div className="post-steps">
          <div className="post-steps-title">📋 How to post your review:</div>
          <div className="post-step">
            <span className="step-num">1</span>
            <span>Tap <strong>"Open Google &amp; Paste Review →"</strong> below</span>
          </div>
          <div className="post-step">
            <span className="step-num">2</span>
            <span>Google Reviews will open — <strong>long-press</strong> the text box &amp; tap <strong>Paste</strong></span>
          </div>
          <div className="post-step">
            <span className="step-num">3</span>
            <span>Select your star rating, <strong>attach your photos</strong>, &amp; hit <strong>Post</strong> ⭐</span>
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
          className="btn-gmb"
          id="btn-gmb"
          onClick={onPostGoogle}
          disabled={isLoading || !reviewText || !animationDone}
        >
          Open Google &amp; Paste Review →
        </button>
      </div>

      {/* Small Helper Text below button */}
      {!isLoading && reviewText && animationDone && (
        <p className="btn-helper-text">
          💡 Google Reviews will open in a new tab. Paste your copied review and press "Post" to publish it.
        </p>
      )}

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

