import React, { useRef, useCallback } from 'react';
import StarRating from './StarRating';
import './QuestionSlider.css';

const MOOD_MAP = {
  1: '😞 Very bad',
  2: '😐 Not great',
  3: '🙂 Okay',
  4: '😊 Good!',
  5: '🤩 Amazing!',
};

/**
 * QuestionSlider — Sliding questionnaire with star ratings
 * 
 * Displays questions one-at-a-time with a sliding animation.
 * Progress bar tracks completion. Auto-advances on answer.
 */
export default function QuestionSlider({
  questions,
  currentQ,
  answers,
  questionsComplete,
  onAnswer,
  onSkip,
  onGenerate,
}) {
  const total = questions.length;
  const progressPct = questionsComplete
    ? 100
    : (currentQ / total) * 100;

  return (
    <div className="rev-card glass-card" id="question-card">
      {/* Progress Header */}
      <div>
        <div className="q-header">
          <span className="q-step" id="q-step-label">
            {questionsComplete ? 'All done! ✅' : `Question ${currentQ + 1} of ${total}`}
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
      <div className="slides-overflow">
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
                onRate={(val) => onAnswer(i, val)}
              />
              <div className="mood-label" id={`mood-${i}`}>
                {answers[q.id] ? MOOD_MAP[answers[q.id]] : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button (shown after all questions) */}
      {questionsComplete && (
        <button
          className="btn-generate"
          id="btn-generate"
          onClick={onGenerate}
        >
          ✨ Generate My Review
        </button>
      )}
    </div>
  );
}
