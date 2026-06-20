import React, { useState } from 'react';
import './LegalPages.css';

export function LegalPages() {
  const [activeTab, setActiveTab] = useState('terms');

  return (
    <div className="legal-container">
      <div className="legal-header">
        <h1>Legal & Policies</h1>
        <p>Everything you need to know about RevUp AI.</p>
      </div>

      <div className="legal-tabs">
        <button 
          className={activeTab === 'terms' ? 'active' : ''} 
          onClick={() => setActiveTab('terms')}
        >
          Terms of Service
        </button>
        <button 
          className={activeTab === 'privacy' ? 'active' : ''} 
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
        <button 
          className={activeTab === 'refund' ? 'active' : ''} 
          onClick={() => setActiveTab('refund')}
        >
          Refund & Cancellation
        </button>
      </div>

      <div className="legal-content-box">
        {activeTab === 'terms' && (
          <div className="legal-tab-pane">
            <h2>Terms of Service</h2>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <h3>1. Agreement to Terms</h3>
            <p>By accessing or using RevUp AI, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
            <h3>2. Service Description</h3>
            <p>RevUp AI provides an AI-powered review generation tool for businesses. We do not guarantee the publication or success of reviews on third-party platforms like Google My Business.</p>
            <h3>3. User Accounts</h3>
            <p>You are responsible for safeguarding the password and for all activities that occur under your account.</p>
            <h3>4. Acceptable Use</h3>
            <p>You agree not to use the service to generate fake, deceptive, or malicious reviews that violate the policies of third-party platforms.</p>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="legal-tab-pane">
            <h2>Privacy Policy</h2>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <h3>1. Information We Collect</h3>
            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us.</p>
            <h3>2. How We Use Information</h3>
            <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you.</p>
            <h3>3. Data Security</h3>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing.</p>
            <h3>4. Third-Party AI Services</h3>
            <p>We use third-party AI services (like OpenRouter) to generate reviews. Please note that data sent for generation may be processed by these third-party providers according to their privacy policies.</p>
          </div>
        )}

        {activeTab === 'refund' && (
          <div className="legal-tab-pane">
            <h2>Refund & Cancellation Policy</h2>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <h3>1. Subscription Cancellations</h3>
            <p>You can cancel your subscription at any time. Your cancellation will take effect at the end of the current paid term.</p>
            <h3>2. Refunds</h3>
            <p>We offer a 7-day money-back guarantee for all new subscriptions. If you are not satisfied with our service, contact us within 7 days of your purchase for a full refund.</p>
            <h3>3. Exceptions</h3>
            <p>Refunds will not be provided for partial months of service, upgrade/downgrade refunds, or for months unused with an open account after the initial 7 days.</p>
            <h3>4. Contact Us</h3>
            <p>For any refund requests or cancellation issues, please email us at growengers@gmail.com.</p>
          </div>
        )}
      </div>
    </div>
  );
}
