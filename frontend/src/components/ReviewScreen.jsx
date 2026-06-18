import React, { useState, useCallback, useMemo, useEffect } from 'react';
import BusinessCard from './BusinessCard';
import QuestionSlider from './QuestionSlider';
import ReviewResult from './ReviewResult';
import {
  generateReviewLocal,
  generateReviewAPI,
  generateReviewGeminiFrontend,
  generateReviewOpenRouter,
  regenerateReviewAPI,
  logQRScan,
  logCustomerEvent,
  saveExternalReviewAPI,
  uploadReviewPhotosAPI,
  markReviewPostedAPI,
} from '../services/reviewService';
import { generateReviewProxy, isLoggedIn } from '../services/authService';
import { trackEvent, EVENT_TYPES } from '../services/analyticsService';
import './ReviewScreen.css';

/**
 * Category-specific questions — 5 questions tailored to each business type
 */
const CATEGORY_QUESTIONS = {
  'Hospital / Clinic': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall visit?' },
    { id: 'doctors',     label: 'Doctor consultation?',      sub: 'Was the doctor attentive and helpful?' },
    { id: 'staff',       label: 'Staff & reception?',        sub: 'Were the staff polite and cooperative?' },
    { id: 'cleanliness', label: 'Cleanliness & hygiene?',    sub: 'How clean and hygienic was the facility?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this to family or friends?' },
  ],
  'Dental Clinic': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall visit?' },
    { id: 'treatment',   label: 'Treatment quality?',        sub: 'Was the treatment painless and effective?' },
    { id: 'staff',       label: 'Staff & reception?',        sub: 'Were the staff polite and cooperative?' },
    { id: 'cleanliness', label: 'Cleanliness & hygiene?',    sub: 'How clean and hygienic was the clinic?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this clinic to others?' },
  ],
  'Restaurant / Cafe': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your dining experience?' },
    { id: 'food',      label: 'Food quality & taste?',       sub: 'How was the taste and freshness of the food?' },
    { id: 'service',   label: 'Service & staff?',            sub: 'Were the waiters friendly and prompt?' },
    { id: 'ambience',  label: 'Ambience & vibe?',            sub: 'How was the restaurant atmosphere?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this to a friend?' },
  ],
  'Hotel / Resort': [
    { id: 'overall',   label: 'Overall stay?',               sub: 'How was your overall hotel experience?' },
    { id: 'rooms',     label: 'Room quality?',               sub: 'Was the room clean and comfortable?' },
    { id: 'food',      label: 'Food & dining?',              sub: 'How was the hotel food?' },
    { id: 'service',   label: 'Service & hospitality?',      sub: 'Was the staff welcoming and helpful?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this hotel to others?' },
  ],
  'Salon / Spa': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your salon/spa visit?' },
    { id: 'service',   label: 'Service quality?',            sub: 'Was the treatment done professionally?' },
    { id: 'hygiene',   label: 'Hygiene & cleanliness?',      sub: 'Were the tools and space clean?' },
    { id: 'staff',     label: 'Staff expertise?',            sub: 'Was the stylist/therapist skilled?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this salon to others?' },
  ],
  'Gym / Fitness Center': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How is your overall gym experience?' },
    { id: 'equipment', label: 'Equipment & machines?',       sub: 'Are the machines well-maintained?' },
    { id: 'trainers',  label: 'Trainers & coaching?',        sub: 'Are the trainers helpful and knowledgeable?' },
    { id: 'cleanliness',label: 'Hygiene & cleanliness?',    sub: 'Are the gym and locker rooms clean?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this gym to others?' },
  ],
  'School / Coaching': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was the overall learning experience?' },
    { id: 'teaching',  label: 'Teaching quality?',           sub: 'Were the teachers/faculty good?' },
    { id: 'facility',  label: 'Facilities & infrastructure?',sub: 'How were the classrooms and facilities?' },
    { id: 'results',   label: 'Results & performance?',      sub: 'Are you satisfied with the academic support?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this institute to others?' },
  ],
  'College / Institute': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How is the overall college experience?' },
    { id: 'faculty',   label: 'Faculty & teaching?',         sub: 'Are the professors knowledgeable?' },
    { id: 'campus',    label: 'Campus & facilities?',        sub: 'How is the campus infrastructure?' },
    { id: 'placement', label: 'Placements & support?',       sub: 'How is the career support?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this college to others?' },
  ],
  'Jewellery Shop': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your shopping experience?' },
    { id: 'quality',   label: 'Product quality?',            sub: 'How was the quality of the jewellery?' },
    { id: 'designs',   label: 'Variety & designs?',          sub: 'Were there enough designs and options?' },
    { id: 'staff',     label: 'Staff behaviour?',            sub: 'Was the staff helpful in choosing?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this shop to others?' },
  ],
  'Clothing Store / Boutique': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your shopping experience at the store?' },
    { id: 'collection',  label: 'Collection & variety?',     sub: 'Did you find enough designs and options?' },
    { id: 'staff',       label: 'Staff & assistance?',       sub: 'Was the staff helpful and cooperative?' },
    { id: 'quality',     label: 'Fabric & quality?',         sub: 'Are you satisfied with the quality?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to friends?' },
  ],
  'Supermarket / Grocery': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your shopping experience?' },
    { id: 'availability',label: 'Product availability?',     sub: 'Did you find everything you needed?' },
    { id: 'freshness',   label: 'Quality & freshness?',      sub: 'Were the products fresh and of good quality?' },
    { id: 'pricing',     label: 'Pricing & offers?',         sub: 'Were the prices reasonable?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to others?' },
  ],
  'Car Showroom': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your visit to the showroom?' },
    { id: 'staff',       label: 'Staff knowledge?',          sub: 'Did the sales team explain features well?' },
    { id: 'process',     label: 'Buying process?',           sub: 'Was the paperwork and delivery smooth?' },
    { id: 'testdrive',   label: 'Test drive experience?',    sub: 'How was the test drive and demonstration?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this showroom to others?' },
  ],
  'Auto Repair / Garage': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your service experience?' },
    { id: 'quality',     label: 'Service quality?',          sub: 'Was the repair/service done properly?' },
    { id: 'transparency',label: 'Pricing transparency?',     sub: 'Were the charges clear and fair?' },
    { id: 'timeliness',  label: 'Delivery time?',            sub: 'Was the vehicle delivered on time?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this garage to others?' },
  ],
  'Real Estate Agency': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your experience with the agency?' },
    { id: 'professional',label: 'Professionalism?',          sub: 'Was the agent professional and helpful?' },
    { id: 'options',     label: 'Property options?',         sub: 'Did they show good properties matching your needs?' },
    { id: 'transparency',label: 'Transparency?',             sub: 'Were the deals clear and fair?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this agency to others?' },
  ],
  'Event Planner': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was the overall event execution?' },
    { id: 'creativity',  label: 'Creativity & design?',      sub: 'How were the decorations and arrangements?' },
    { id: 'management',  label: 'Event management?',         sub: 'Was everything managed smoothly on time?' },
    { id: 'staff',       label: 'Staff & coordination?',     sub: 'Was the team cooperative and helpful?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest them to others?' },
  ],
};

const DEFAULT_QUESTIONS = [
  { id: 'overall',   label: 'Overall experience?',   sub: 'How was your overall experience?' },
  { id: 'quality',   label: 'Product / service quality?', sub: 'Rate the quality of what you received.' },
  { id: 'service',   label: 'Service & staff?',      sub: 'Were the staff helpful and friendly?' },
  { id: 'value',     label: 'Value for money?',      sub: 'Was it worth the price?' },
  { id: 'recommend', label: 'Would you recommend?',  sub: 'Would you suggest this to a friend?' },
];

function getQuestions(businessType) {
  return CATEGORY_QUESTIONS[businessType] || DEFAULT_QUESTIONS;
}


/**
 * ReviewScreen — Main review generation flow
 *
 * Contains the business header card, question slider, and result card.
 */
export default function ReviewScreen({ businessData, onEdit, onSaveReview }) {
  const questions = useMemo(() => getQuestions(businessData.type), [businessData.type]);

  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [questionsComplete, setQuestionsComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [generatedReview, setGeneratedReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviewSource, setReviewSource] = useState('');
  const [toast, setToast] = useState('');
  const [photos, setPhotos] = useState([]);
  const [backendReviewId, setBackendReviewId] = useState(null);

  // Track QR scan on mount (if opened via ?biz= URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('biz') && businessData && businessData.id) {
      trackEvent(EVENT_TYPES.QR_SCANNED, {
        bizId: businessData.id,
        businessName: businessData.name,
      });
      logQRScan(businessData.id);
    }
  }, [businessData.id]);

  const handleAnswer = useCallback((questionIndex, value) => {
    const questionId = questions[questionIndex].id;
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    setTimeout(() => {
      if (questionIndex < questions.length - 1) {
        setCurrentQ(questionIndex + 1);
      } else {
        setQuestionsComplete(true);
      }
    }, 520);
  }, [questions]);

  const handleSkip = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setQuestionsComplete(true);
    }
  }, [currentQ, questions]);

  /**
   * Copy review text to clipboard (with fallback for mobile)
   */
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch { return false; }
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setShowResult(true);
    setIsLoading(true);
    setReviewSource('');
    setBackendReviewId(null);

    // Simulate API delay
    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));

    let text = null;
    let source = '';

    // 1. Try OpenRouter API first
    text = await generateReviewOpenRouter(businessData.name, businessData.type, answers, null, 'hinglish', { businessSubcategory: businessData.subcategory, city: businessData.city, customerKeywords: businessData.keywords });
    if (text) source = '🤖 OpenRouter API';

    // 2. Try Backend Proxy (works for all businesses, API keys stay server-side)
    if (!text) {
      text = await generateReviewProxy(businessData.name, businessData.type, answers, 'hinglish', { businessSubcategory: businessData.subcategory, city: businessData.city, customerKeywords: businessData.keywords });
      if (text) source = '🔗 Backend Proxy';
    }

    // 2. Fallback to Backend API (Laravel) if OpenRouter fails
    if (!text) {
      const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
      if (isRealDbId) {
        const res = await generateReviewAPI(businessData.id, answers);
        if (res && res.text) {
          text = res.text;
          setBackendReviewId(res.id);
          source = '🔗 Backend API (Laravel)';
        }
      }
    }

    // 3. Fallback to Gemini API if both fail
    if (!text) {
      text = await generateReviewGeminiFrontend(businessData.name, businessData.type, answers, businessData.geminiApiKey, 'hinglish', { businessSubcategory: businessData.subcategory, city: businessData.city, customerKeywords: businessData.keywords });
      if (text) source = '✨ Gemini API';
    }

    // 4. Fallback to Local Templates
    if (!text) {
      text = generateReviewLocal(businessData.name, businessData.type, answers);
      source = '📝 Local Templates';
    }

    // Save externally generated reviews to backend if it's a real DB business
    const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
    if (text && source !== '🔗 Backend API (Laravel)' && isRealDbId) {
      const savedReview = await saveExternalReviewAPI(businessData.id, answers, text, source, 'hinglish');
      if (savedReview && savedReview.id) {
        setBackendReviewId(savedReview.id);
      }
    }

    setGeneratedReview(text);
    setReviewSource(source);
    setIsLoading(false);

    // Track review generated
    if (text) {
      trackEvent(EVENT_TYPES.REVIEW_GENERATED, {
        bizId: businessData.id,
        businessName: businessData.name,
        source,
      });
    }

    // Auto-copy as soon as review is generated
    if (text) {
      const copied = await copyToClipboard(text);
      if (copied) {
        showToastMsg('✅ Review copied to clipboard! Tap "Post on Google" to paste & submit.');
      }
    }
  }, [businessData, answers, copyToClipboard]);

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setGeneratedReview('');
    setReviewSource('');
    setBackendReviewId(null);

    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));

    let text = null;
    let source = '';

    // 1. Try OpenRouter API first
    text = await generateReviewOpenRouter(
      businessData.name,
      businessData.type,
      answers,
      null,
      'hinglish',
      {
        regenerate: true,
        previousText: generatedReview,
        variationSeed: `${Date.now()}-${Math.random()}`,
        businessSubcategory: businessData.subcategory,
        city: businessData.city,
        customerKeywords: businessData.keywords,
      }
    );
    if (text) source = '🤖 OpenRouter API';

    // 2. Try Backend Proxy
    if (!text) {
      text = await generateReviewProxy(businessData.name, businessData.type, answers, 'hinglish', {
        businessSubcategory: businessData.subcategory,
        city: businessData.city,
        customerKeywords: businessData.keywords,
        regenerate: true,
        previousText: generatedReview,
        variationSeed: `${Date.now()}-${Math.random()}`,
      });
      if (text) source = '🔗 Backend Proxy';
    }

    // 2. Fallback to Backend API (Laravel) if OpenRouter fails
    if (!text) {
      const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
      if (isRealDbId) {
        const res = await regenerateReviewAPI(businessData.id, answers, generatedReview);
        if (res && res.text) {
          text = res.text;
          setBackendReviewId(res.id);
          source = '🔗 Backend API (Laravel)';
        }
      }
    }

    // 3. Fallback to Gemini API if both fail
    if (!text) {
      text = await generateReviewGeminiFrontend(
        businessData.name,
        businessData.type,
        answers,
        businessData.geminiApiKey,
        'hinglish',
        {
          regenerate: true,
          previousText: generatedReview,
          variationSeed: `${Date.now()}-${Math.random()}`,
          businessSubcategory: businessData.subcategory,
          city: businessData.city,
          customerKeywords: businessData.keywords,
        }
      );
      if (text) source = '✨ Gemini API';
    }

    // 4. Fallback to Local Templates
    if (!text) {
      text = generateReviewLocal(businessData.name, businessData.type, answers);
      source = '📝 Local Templates';
    }

    // Save externally generated reviews to backend if it's a real DB business
    const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
    if (text && source !== '🔗 Backend API (Laravel)' && isRealDbId) {
      const savedReview = await saveExternalReviewAPI(businessData.id, answers, text, source, 'hinglish');
      if (savedReview && savedReview.id) {
        setBackendReviewId(savedReview.id);
      }
    }

    setGeneratedReview(text);
    setReviewSource(source);
    setIsLoading(false);

    // Track review regenerated
    if (text) {
      trackEvent(EVENT_TYPES.REVIEW_REGENERATED, {
        bizId: businessData.id,
        businessName: businessData.name,
        source,
      });
    }

    // Auto-copy on regenerate too
    if (text) {
      const copied = await copyToClipboard(text);
      if (copied) {
        showToastMsg('✅ New review copied! Tap "Post on Google" to paste & submit.');
      }
    }
  }, [businessData, answers, isLoading, copyToClipboard]);

  const handleCopy = useCallback(async () => {
    if (!generatedReview) return;
    const copied = await copyToClipboard(generatedReview);
    if (copied) {
      trackEvent(EVENT_TYPES.REVIEW_COPIED, {
        bizId: businessData.id,
        businessName: businessData.name,
      });
      const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
      if (isRealDbId) logCustomerEvent(businessData.id, 'review_copied');
    }
    showToastMsg(copied
      ? '✅ Copied! Paste it on Google Reviews.'
      : '⚠️ Could not copy — please select the text manually.');
  }, [generatedReview, copyToClipboard, businessData]);

  const handlePostGoogle = useCallback(async () => {
    // 1. Copy review to clipboard
    if (generatedReview) {
      await copyToClipboard(generatedReview);
    }

    // 2. Save review locally
    if (onSaveReview && businessData.id) {
      const avgStars = Object.values(answers).length > 0
        ? Math.round(Object.values(answers).reduce((s, v) => s + v, 0) / Object.values(answers).length)
        : 4;
      onSaveReview({
        bizId: businessData.id,
        stars: avgStars,
        text: generatedReview,
        photos: photos,
        time: Date.now(),
      });
    }

    // 3. Track post event
    trackEvent(EVENT_TYPES.REVIEW_POSTED, {
      bizId: businessData.id,
      businessName: businessData.name,
    });
    // Track in backend database
    const isRealDbId = businessData.id && !businessData.id.toString().startsWith('biz_') && !businessData.id.toString().startsWith('demo');
    if (isRealDbId) {
      logCustomerEvent(businessData.id, 'review_posted');
      if (backendReviewId) {
        markReviewPostedAPI(backendReviewId, generatedReview);
      }
    }

    // 4. Open GMB link — customer just needs to paste (Ctrl+V / long-press Paste)
    const gmbLink = businessData.gmb || 'https://search.google.com/local/writereview?placeid=ChIJxxxxxxxxx';
    showToastMsg('✅ Review copied — opening Google Reviews… Just paste & post!');

    // Small delay so toast is visible before redirect
    setTimeout(() => {
      window.open(gmbLink, '_blank');
    }, 600);
  }, [generatedReview, businessData, answers, onSaveReview, copyToClipboard, photos, backendReviewId]);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
    })).then(async (base64Photos) => {
      setPhotos(prev => [...prev, ...base64Photos]);
      if (backendReviewId) {
        const res = await uploadReviewPhotosAPI(backendReviewId, base64Photos);
        if (res && res.photos) {
          showToastMsg('📸 Photos uploaded to server successfully!');
        }
      }
    });
  };

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  return (
    <div className="screen" id="review-screen">
      <div className="rev-screen">
        {/* Business Header */}
        <BusinessCard
          name={businessData.name}
          type={businessData.type}
          logoUrl={businessData.logoUrl}
        />

        {/* Question Slider (hidden when result is shown) */}
        {!showResult && (
          <QuestionSlider
            questions={questions}
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
            reviewSource={reviewSource}
            toast={toast}
            photos={photos}
            onPhotoChange={handlePhotoChange}
            onRegenerate={handleRegenerate}
            onCopy={handleCopy}
            onPostGoogle={handlePostGoogle}
            onReviewTextChange={setGeneratedReview}
          />
        )}

        <p className="powered">
          Powered by <span>Review</span> — Smart Reviews for Every Business
        </p>
      </div>
    </div>
  );
}
