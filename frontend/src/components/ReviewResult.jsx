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
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState('hinglish');
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

  const handleOpenGoogleClick = () => {
    setShowPasteModal(true);
  };

  const handleGotItClick = () => {
    setShowPasteModal(false);
    if (onPostGoogle) onPostGoogle();
  };

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

      {/* Regenerate — right below review */}
      {!isLoading && reviewText && animationDone && (
        <>
          <div className="regen-row">
            <button
              className="regen-gender-btn regen-gender-btn--male"
              onClick={() => onRegenerate('male', selectedLang)}
              disabled={isLoading}
            >
              🙋‍♂️ Male
            </button>
            <button
              className="regen-btn"
              id="regen-btn"
              onClick={() => onRegenerate(null, selectedLang)}
              disabled={isLoading}
            >
              🔄 Regenerate
            </button>
            <button
              className="regen-gender-btn regen-gender-btn--female"
              onClick={() => onRegenerate('female', selectedLang)}
              disabled={isLoading}
            >
              🙋‍♀️ Female
            </button>
          </div>

          <div className="lang-selector-row">
            <span className="lang-selector-label">🌐 Language:</span>
            <div className="lang-selector-btns">
              {['English', 'Hinglish'].map((lang) => (
                <button
                  key={lang}
                  className={`lang-btn ${selectedLang === lang.toLowerCase() ? 'lang-btn--active' : ''}`}
                  onClick={() => {
                    const newLang = lang.toLowerCase();
                    setSelectedLang(newLang);
                    onRegenerate(null, newLang);
                  }}
                  disabled={isLoading}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

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


      {/* Step-by-step instructions — simplified 2 steps */}
      {!isLoading && reviewText && animationDone && (
        <div className="post-steps">
          <div className="post-steps-title">📋 How to post your review:</div>
          <div className="post-step">
            <span className="step-num">1</span>
            <span>Neeche button tap karo → <strong>Google Reviews</strong> khulega</span>
          </div>
          <div className="post-step">
            <span className="step-num">2</span>
            <span>Review box me 👆 <strong>long-press</strong> karo → <strong>Paste</strong> tap karo → <strong>Post</strong> karo ⭐</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="action-row">
        <button
          className="btn-gmb"
          id="btn-gmb"
          onClick={handleOpenGoogleClick}
          disabled={isLoading || !reviewText || !animationDone}
        >
          📋 Open Google &amp; Paste Your Review →
        </button>
      </div>

      {/* Small Helper Text below button */}
      {!isLoading && reviewText && animationDone && (
        <p className="btn-helper-text">
          💡 Google Reviews new tab me khulega. Apna copied review paste karo aur "Post" dabao.
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

      {/* ── Paste Instruction Modal ── */}
      {showPasteModal && (
        <div className="paste-modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="paste-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paste-modal-close" onClick={() => setShowPasteModal(false)}>✕</button>
            
            <div className="paste-modal-icon">✅</div>
            <h3 className="paste-modal-title">Review Copy Ho Gaya!</h3>
            <p className="paste-modal-subtitle">Ab Google pe jaake paste karo — bas 3 simple steps:</p>

            <div className="paste-modal-steps">
              <div className="paste-modal-step">
                <span className="paste-step-num">1</span>
                <span>Google review box me <strong>long-press</strong> karo 👆</span>
              </div>
              <div className="paste-modal-step">
                <span className="paste-step-num">2</span>
                <span><strong>"Paste"</strong> option aayega — usse tap karo 📋</span>
              </div>
              <div className="paste-modal-step">
                <span className="paste-step-num">3</span>
                <span>Star rating do aur <strong>"Post"</strong> dabao ⭐</span>
              </div>
            </div>

            <button className="paste-modal-btn" onClick={handleGotItClick}>
              Samajh Gaya! Open Google →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

