import React from 'react';
import './BusinessCard.css';

/**
 * BusinessCard — Premium business header card
 * 
 * Displays the business logo, name, type, and an edit button.
 * Features a gradient cover banner with decorative pattern overlay.
 */
export default function BusinessCard({ name, type, logoUrl, onEdit }) {
  const firstLetter = name ? name.charAt(0).toUpperCase() : '🏢';

  return (
    <div className="biz-card glass-card" id="biz-card">
      <div className="biz-card-cover">
        <div className="biz-card-cover-pattern" />
      </div>
      <div className="biz-card-body">
        <div className="biz-logo-wrap">
          <span className="biz-logo-emoji">{firstLetter}</span>
        </div>
        <div className="biz-info">
          <div className="biz-name-disp">{name}</div>
          <div className="biz-tag">
            <span className="biz-tag-dot" />
            {type}
          </div>
        </div>
        {onEdit && (
          <button className="edit-btn" onClick={onEdit} id="btn-edit">
            ✏ Edit
          </button>
        )}
      </div>
    </div>
  );
}
