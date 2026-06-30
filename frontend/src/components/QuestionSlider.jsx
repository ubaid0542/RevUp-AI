import React, { useState, useCallback, useRef } from 'react';
import StarRating from './StarRating';
import './QuestionSlider.css';

const MOOD_MAP = {
  1: '😞 Very bad',
  2: '😐 Not great',
  3: '🙂 Okay',
  4: '😊 Good!',
  5: '🤩 Amazing!',
};

/** Emojis that float in the background per mood level */
const MOOD_EMOJIS = {
  1: ['😞', '💔', '😢', '👎', '😤'],
  2: ['😐', '🤔', '😕', '🫤', '☁️'],
  3: ['🙂', '👍', '✌️', '😌', '🌤️'],
  4: ['😊', '🎉', '✨', '💚', '🙌', '💫', '🌟'],
  5: ['🤩', '🔥', '⭐', '💯', '🎊', '💫', '🏆', '💎', '✨', '🥳'],
};

/**
 * Spawn floating emoji elements inside a container
 */
function spawnFloatingEmojis(container, mood) {
  if (!container || !mood) return;

  // Remove any existing floating emojis
  container.querySelectorAll('.floating-emoji').forEach(el => el.remove());

  const emojis = MOOD_EMOJIS[mood] || MOOD_EMOJIS[3];
  const count = mood >= 4 ? 14 : mood >= 3 ? 8 : 6;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'floating-emoji';
    el.textContent = emojis[i % emojis.length];

    // Random position, size, delay, duration
    const left = Math.random() * 90 + 5; // 5% to 95%
    const startTop = 80 + Math.random() * 30; // start from bottom area
    const size = mood >= 4 ? (16 + Math.random() * 14) : (14 + Math.random() * 10);
    const duration = 3;
    const delay = Math.random() * 0.8;
    const drift = (Math.random() - 0.5) * 60; // horizontal drift
    const rotation = (Math.random() - 0.5) * 120;

    el.style.cssText = `
      left: ${left}%;
      top: ${startTop}%;
      font-size: ${size}px;
      --float-duration: ${duration}s;
      --float-delay: ${delay}s;
      --drift-x: ${drift}px;
      --end-rotate: ${rotation}deg;
      opacity: 0;
    `;

    container.appendChild(el);
    // Auto-remove after animation completes
    setTimeout(() => el.remove(), (duration + delay) * 1000 + 200);
  }
}

/**
 * QuestionSlider — Sliding questionnaire with star ratings
 * 
 * Displays questions one-at-a-time with a sliding animation.
 * Progress bar tracks completion. Auto-advances on answer.
 * After questions, shows dish selection (if available) then generate button.
 */
export default function QuestionSlider({
  questions,
  currentQ,
  answers,
  questionsComplete,
  onAnswer,
  onSkip,
  onGenerate,
  availableDishes = [],
  selectedDish = '',
  onDishSelect,
}) {
  const total = questions.length;
  const hasDishes = availableDishes.length > 0;
  const dishSelected = !!selectedDish;
  const [dishSkipped, setDishSkipped] = useState(false);

  // Show dish step only when questions are complete and dishes are available
  const showDishStep = questionsComplete && hasDishes && !dishSkipped;
  // Show generate button: either no dishes, dish selected, or dish skipped
  const showGenerate = questionsComplete && (!hasDishes || dishSelected || dishSkipped);

  const progressPct = questionsComplete
    ? 100
    : (currentQ / total) * 100;

  const [activeMood, setActiveMood] = useState(0);
  const [confettiBurst, setConfettiBurst] = useState(false);
  const cardRef = useRef(null);

  const handleRate = useCallback((questionIndex, val) => {
    setActiveMood(val);

    // Spawn floating emojis in the card background
    if (cardRef.current) {
      spawnFloatingEmojis(cardRef.current, val);
    }
    
    // Trigger confetti burst for 4-5 stars
    if (val >= 4) {
      setConfettiBurst(true);
      setTimeout(() => setConfettiBurst(false), 1200);
    }
    
    onAnswer(questionIndex, val);
    
    // Reset mood after emojis finish (3s animation)
    setTimeout(() => {
      if (questionIndex < total - 1) {
        setActiveMood(0);
      }
    }, 600);
  }, [onAnswer, total]);

  // Get current question's answer for persistent mood
  const currentAnswer = questions[currentQ] ? answers[questions[currentQ].id] || 0 : 0;
  const displayMood = activeMood || currentAnswer;

  const handleDishTap = useCallback((dish) => {
    if (onDishSelect) {
      onDishSelect(dish === selectedDish ? '' : dish); // toggle
    }
  }, [onDishSelect, selectedDish]);

  const handleDishSkip = useCallback(() => {
    setDishSkipped(true);
    if (onDishSelect) onDishSelect('');
  }, [onDishSelect]);

  return (
    <div 
      ref={cardRef}
      className={`rev-card glass-card mood-card ${confettiBurst ? 'confetti-active' : ''}`}
      id="question-card"
      data-mood={displayMood}
    >
      {/* Animated background layers */}
      <div className="mood-bg-layer" />
      <div className="mood-particles-layer" />
      {confettiBurst && <div className="confetti-layer" />}

      {/* Progress Header */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="q-header">
          <span className="q-step" id="q-step-label">
            {questionsComplete
              ? (showDishStep ? '🍽️ One more step!' : 'All done! ✅')
              : `Question ${currentQ + 1} of ${total}`
            }
          </span>
          {!questionsComplete && (
            <span className="q-skip" onClick={onSkip}>Skip →</span>
          )}
        </div>
        <div className="progress-bar-wrap">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Slides Track */}
      <div className="slides-overflow" style={{ position: 'relative', zIndex: 2 }}>
        <div
          className="slides-track"
          style={{ transform: `translateX(-${currentQ * 100}%)` }}
        >
          {questions.map((q, i) => (
            <div className="slide" key={q.id} id={`slide-${i}`}>
              <div className="slide-content">
                <p className="q-label">{q.label}</p>
                <p className="q-sub">{q.sub}</p>
              </div>
              <StarRating
                questionIndex={i}
                value={answers[q.id] || 0}
                onRate={(val) => handleRate(i, val)}
              />
              <div className={`mood-label ${answers[q.id] ? 'mood-label--visible' : ''}`} id={`mood-${i}`}>
                {answers[q.id] ? MOOD_MAP[answers[q.id]] : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dish Selection Step */}
      {showDishStep && (
        <div className="dish-selection" style={{ position: 'relative', zIndex: 2 }}>
          <p className="dish-title">🍽️ Aap ne yaha kya try kiya?</p>
          <p className="dish-subtitle">Select karo jo aapne try kiya</p>
          <div className="dish-buttons">
            {availableDishes.map((dish) => (
              <button
                key={dish}
                className={`dish-btn ${selectedDish === dish ? 'dish-btn--selected' : ''}`}
                onClick={() => handleDishTap(dish)}
              >
                {selectedDish === dish && <span className="dish-check">✓ </span>}
                {dish}
              </button>
            ))}
          </div>
          <button className="dish-skip-btn" onClick={handleDishSkip}>
            Skip — Kuch khaas nahi ⏭️
          </button>
        </div>
      )}

      {/* Generate Button (shown after all questions + dish selection) */}
      {showGenerate && (
        <button
          className="btn-generate"
          id="btn-generate"
          onClick={onGenerate}
          style={{ position: 'relative', zIndex: 2 }}
        >
          ✨ Generate My Review
        </button>
      )}
    </div>
  );
}
