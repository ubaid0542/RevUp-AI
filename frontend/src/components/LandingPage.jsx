import React from 'react';
import './LandingPage.css';

/**
 * LandingPage — Hero, How it Works, and Pricing
 */
export default function LandingPage({ onNavigate, onSelectPlan }) {
  return (
    <div className="landing-page screen">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">🚀 REVWRITEAI — REVIEWS THAT DRIVE GROWTH</div>
          <h1 className="hero-title">
            More Reviews,<br />
            <span className="gradient-text">Zero Effort</span>
          </h1>
          <p className="hero-desc">
            Scan the QR, pick your stars — AI writes a Google-ready review instantly.
            Simple for your customers, powerful for your business growth.
          </p>
          <div className="hero-btns">
            <button className="btn-primary hero-btn" onClick={() => onNavigate('register')}>
              🚀 Start Free Trial
            </button>
            <button className="btn-outline hero-btn" onClick={() => onNavigate('demo')}>
              📱 View Demo
            </button>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/assets/hero_illustration.png" alt="RevWriteAI 3D Illustration" className="hero-image" />
        </div>
      </div>

      {/* How it Works */}
      <div className="how-section">
        <h2 className="section-heading gradient-text">How Does It Work?</h2>
        <p className="section-sub">Get more reviews in 4 simple steps</p>
        <div className="steps-grid">
          {[
            { num: '1', icon: '📝', title: 'Register', desc: 'Enter your business name, GMB link & choose a plan' },
            { num: '2', icon: '📱', title: 'Get Your QR Code', desc: 'Receive a unique QR code — print it & place it at your counter' },
            { num: '3', icon: '⭐', title: 'Customer Scans', desc: 'Customer selects stars — AI generates a review automatically' },
            { num: '4', icon: '🚀', title: 'Live on Google', desc: 'Customer posts the review on Google with a single click' },
          ].map((s) => (
            <div className="step-card glass-card" key={s.num}>
              <div className="step-number">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans & Features */}
      <div className="pricing-section">
        <h2 className="section-heading gradient-text">Plans & Pricing</h2>
        <p className="section-sub">Choose the right plan for your business</p>
        <div className="plans-grid">
          <div className="plan-card glass-card" onClick={() => onSelectPlan('Free')}>
            <div className="plan-name">Free</div>
            <div className="plan-price">₹0<span>/month</span></div>
            <div className="plan-desc">Try it free</div>
            <ul className="plan-features">
              <li>1 QR Code</li>
              <li>20 reviews/month</li>
              <li>Basic AI review</li>
              <li>GMB redirect</li>
            </ul>
          </div>
          <div className="plan-card glass-card" onClick={() => onSelectPlan('Starter')}>
            <div className="plan-name">Starter</div>
            <div className="plan-price">₹699<span>/month</span></div>
            <div className="plan-desc">For small businesses</div>
            <ul className="plan-features">
              <li>1 QR Code</li>
              <li>250 reviews/month</li>
              <li>Basic AI review</li>
              <li>GMB redirect</li>
              <li>Analytics dashboard</li>
            </ul>
          </div>
          <div className="plan-card glass-card popular" onClick={() => onSelectPlan('Growth')}>
            <div className="plan-popular-tag">🔥 Most Popular</div>
            <div className="plan-name">Growth</div>
            <div className="plan-price">₹1,399<span>/month</span></div>
            <div className="plan-desc">For growing businesses</div>
            <ul className="plan-features">
              <li>3 QR Codes</li>
              <li>750 reviews/month</li>
              <li>Advanced AI review</li>
              <li>AI Review Reply</li>
              <li>GMB redirect</li>
              <li>Analytics dashboard</li>
            </ul>
          </div>
          <div className="plan-card glass-card" onClick={() => onSelectPlan('Pro')}>
            <div className="plan-name">Pro</div>
            <div className="plan-price">₹1,999<span>/month</span></div>
            <div className="plan-desc">For multiple locations</div>
            <ul className="plan-features">
              <li>Unlimited QR Codes</li>
              <li>Unlimited reviews</li>
              <li>Premium AI reviews</li>
              <li>AI Review Reply</li>
              <li>White-label option</li>
              <li>API access</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="footer-logo">🚀 RevWriteAI</div>
          <div className="footer-tagline">Reviews That Drive Growth</div>
          <div className="footer-legal-links" style={{ marginTop: '15px' }}>
            <button onClick={() => onNavigate('legal')} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '14px', padding: 0 }}>Terms & Privacy</button>
          </div>
        </div>
        <div className="footer-contact">
          <div className="footer-contact-title">📞 Contact Us</div>
          <div className="footer-contact-items">
            <a href="tel:8726367492" className="footer-link">📱 8726367492</a>
            <a href="tel:8090507639" className="footer-link">📱 8090507639</a>
            <a href="mailto:growengers@gmail.com" className="footer-link">✉️ growengers@gmail.com</a>
          </div>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} RevWriteAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
