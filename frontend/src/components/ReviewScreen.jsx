import React, { useState, useCallback } from 'react';
import BusinessCard from './BusinessCard';
import QuestionSlider from './QuestionSlider';
import ReviewResult from './ReviewResult';
import { generateReviewLocal, generateReviewAPI } from '../services/reviewService';
import './ReviewScreen.css';

const QUESTIONS = [
  { id: 'overall',   label: 'Overall experience?',     sub: 'How was your visit overall?' },
  { id: 'quality',   label: 'Food / Product quality?',  sub: 'Rate the quality of what you received.' },
  { id: 'service',   label: 'Service & staff?',         sub: 'Were the staff helpful and friendly?' },
  { id: 'value',     label: 'Value for money?',         sub: 'Was it worth the price?' },
  { id: 'ambience',  label: 'Ambience & atmosphere?',   sub: 'How was the environment / vibe?' },
  { id: 'recommend', label: 'Would you recommend?',     sub: 'Would you suggest this to a friend?' },
];

/**
 * ReviewScreen — Main review generation flow
 *
 * Contains the business header card, question slider, and result card.
 */
export default function ReviewScreen({ businessData, onEdit }) {
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [questionsComplete, setQuestionsComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [generatedReview, setGeneratedReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleAnswer = useCallback((questionIndex, value) => {
    const questionId = QUESTIONS[questionIndex].id;
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    setTimeout(() => {
      if (questionIndex < QUESTIONS.length - 1) {
        setCurrentQ(questionIndex + 1);
      } else {
        setQuestionsComplete(true);
      }
    }, 520);
  }, []);

  const handleSkip = useCallback(() => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setQuestionsComplete(true);
    }
  }, [currentQ]);

  const handleGenerate = useCallback(async () => {
    setShowResult(true);
    setIsLoading(true);

    // Simulate API delay
    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));

    // Try API first, then fallback to local
    let text = null;
    if (businessData.id) {
      text = await generateReviewAPI(businessData.id, answers);
    }
    if (!text) {
      text = generateReviewLocal(businessData.name, businessData.type, answers);
    }

    setGeneratedReview(text);
    setIsLoading(false);
  }, [businessData, answers]);

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setGeneratedReview('');

    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));

    let text = null;
    if (businessData.id) {
      text = await generateReviewAPI(businessData.id, answers);
    }
    if (!text) {
      text = generateReviewLocal(businessData.name, businessData.type, answers);
    }

    setGeneratedReview(text);
    setIsLoading(false);
  }, [businessData, answers, isLoading]);

  const handleCopy = useCallback(async () => {
    if (!generatedReview) return;
    try {
      await navigator.clipboard.writeText(generatedReview);
      showToastMsg('✅ Copied! Paste it on Google Reviews.');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = generatedReview;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToastMsg('✅ Copied! Paste it on Google Reviews.');
    }
  }, [generatedReview]);

  const handlePostGoogle = useCallback(() => {
    window.open('https://search.google.com/local/writereview?placeid=ChIJxxxxxxxxx', '_blank');
    showToastMsg('🔗 Google Reviews opened — paste your review there!');
  }, []);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div className="screen" id="review-screen">
      <div className="rev-screen">
        {/* Business Header */}
        <BusinessCard
          name={businessData.name}
          type={businessData.type}
          logoUrl={businessData.logoUrl}
          onEdit={onEdit}
        />

        {/* Question Slider (hidden when result is shown) */}
        {!showResult && (
          <QuestionSlider
            questions={QUESTIONS}
            currentQ={currentQ}
            answers={answers}
            questionsComplete={questionsComplete}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            onGenerate={handleGenerate}
          />
        )}

        {/* Result Card */}
        {showResult && (
          <ReviewResult
            reviewText={generatedReview}
            isLoading={isLoading}
            toast={toast}
            onRegenerate={handleRegenerate}
            onCopy={handleCopy}
            onPostGoogle={handlePostGoogle}
          />
        )}

        <p className="powered">
          Powered by <span>Review</span> — Smart Reviews for Every Business
        </p>
      </div>
    </div>
  );
}
