import React, { useState, useRef } from 'react';
import './RegisterPage.css';

/**
 * Category data with subcategories and dynamic questions
 */
const categoryData = {
  'Hospital/Clinic': {
    sub: ['All', 'Multi-Specialty Hospital', 'General Clinic', 'Dental Clinic', 'Eye Hospital', 'Skin Clinic', 'Orthopaedic', 'Gynecology', 'Pediatric Clinic', 'Diagnostic Centre'],
    questions: [
      { id: 'speciality', label: 'Main Speciality / Department', placeholder: 'e.g. Cardiology, Ortho, General Medicine' },
      { id: 'facilities', label: 'Any special facilities?', placeholder: 'e.g. ICU, Operation Theatre, Lab, Pharmacy' },
    ],
  },
  'Restaurant/Cafe': {
    sub: ['All', 'Fine Dining', 'Street Food / Dhaba', 'Cafe / Coffee Shop', 'Fast Food', 'Buffet', 'Cloud Kitchen', 'Bakery', 'Juice Bar'],
    questions: [
      { id: 'cuisine', label: 'Cuisine Type', placeholder: 'e.g. North Indian, South Indian, Chinese, Continental' },
      { id: 'specialty_dish', label: 'Signature Dish / Famous Item', placeholder: 'e.g. Biryani, Thali, Pasta' },
    ],
  },
  'Jewellery Shop': {
    sub: ['All', 'Gold Jewellery', 'Diamond Jewellery', 'Silver Jewellery', 'Imitation / Fashion Jewellery', 'Bridal Jewellery', 'Antique Jewellery'],
    questions: [
      { id: 'specialty', label: 'What do you specialize in?', placeholder: 'e.g. Bridal sets, Custom design, Repair' },
    ],
  },
  'Hotel/Restro': {
    sub: ['All', 'Budget Hotel', '3-Star Hotel', '4-Star Hotel', '5-Star Hotel / Resort', 'Heritage Hotel', 'Guest House / Home Stay'],
    questions: [
      { id: 'amenities', label: 'Key Amenities', placeholder: 'e.g. Swimming Pool, Restaurant, Conference Room, Spa' },
    ],
  },
  'Salon/Spa': {
    sub: ['All', 'Unisex Salon', 'Ladies Salon', 'Gents Salon', 'Luxury Spa', 'Hair Studio', 'Nail Art Studio', 'Mehndi / Bridal'],
    questions: [
      { id: 'services', label: 'Popular Services', placeholder: 'e.g. Hair Color, Facial, Waxing, Keratin, Massage' },
    ],
  },
  'School/Coaching': {
    sub: ['All', 'Pre-School / Nursery', 'Primary School (1-5)', 'Middle School (6-8)', 'High School (9-12)', 'Coaching Institute', 'College / University', 'Skill Training', 'Tuition Centre'],
    questions: [
      { id: 'subjects', label: 'Main Subjects / Courses', placeholder: 'e.g. Maths, Science, IIT-JEE, NEET, English' },
      { id: 'board', label: 'Board / Affiliation', placeholder: 'e.g. CBSE, ICSE, UP Board, State Board' },
    ],
  },
  'Clothing Store': {
    sub: ['All', "Men's Wear", "Women's Wear", "Kids Wear", 'Ethnic Wear', 'Western Wear', 'Casual Wear', 'Formal Wear'],
    questions: [
      { id: 'collection', label: 'Special Collection / Brands', placeholder: 'e.g. Wedding collections, Casual wear, Levis, Zara' },
      { id: 'discounts', label: 'Offers / Discounts?', placeholder: 'e.g. Seasonal sales, Flat 20% off' }
    ],
  },
  'Other': {
    sub: ['All', 'Service Business', 'Manufacturing', 'Freelance / Consultant', 'NGO / Non-Profit', 'Event Management', 'Real Estate', 'Travel Agency'],
    questions: [
      { id: 'description', label: 'Tell us about your business', placeholder: 'What you do, how you do it...' },
    ],
  },
};

/**
 * RegisterPage — Business registration with category, subcategory, GMB link, plan
 * Also used for editing existing business data when initialData is passed.
 */
export default function RegisterPage({ selectedPlan: initialPlan, initialData, onRegister, onToast }) {
  const isEditing = !!(initialData && initialData.id);

  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.type || '');
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [gmb, setGmb] = useState(initialData?.gmb || '');
  const [emoji, setEmoji] = useState(initialData?.emoji || '');
  const [plan, setPlan] = useState(initialData?.plan || initialPlan || 'Starter');
  const [extras, setExtras] = useState(initialData?.extras || {});
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  const catData = categoryData[category];

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleExtraChange = (id, value) => {
    setExtras((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { onToast('Please enter your business name!'); return; }
    if (!category) { onToast('Please select a category!'); return; }
    if (!gmb.trim()) { onToast('Please enter your GMB link!'); return; }

    onRegister({
      id: isEditing ? initialData.id : 'biz_' + Date.now(),
      name: name.trim(),
      type: category,
      subcategory,
      city: city.trim(),
      gmb: gmb.trim(),
      emoji: emoji.trim() || '⭐',
      extras,
      plan,
      logoUrl,
      logoFile,
      createdAt: isEditing ? initialData.createdAt : Date.now(),
    });
  };

  return (
    <div className="register-page screen">
      <div className="register-header">
        <p className="register-title gradient-text">
          {isEditing ? 'Update Your Business' : 'Register Your Business'}
        </p>
        <p className="register-sub">
          {isEditing ? 'Edit your business details below' : 'Set up your business and get your QR code'}
        </p>
      </div>

      <form className="register-form glass-card" onSubmit={handleSubmit}>
        {/* Logo Upload */}
        <div className="logo-upload-area">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          <div className="logo-drop" onClick={() => fileInputRef.current?.click()} title="Click to upload logo">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="logo-preview-img" />
            ) : (
              <span className="plus">+</span>
            )}
          </div>
          <p className="logo-hint">Upload your logo (optional)</p>
        </div>

        {/* Business Name */}
        <div className="field">
          <label>Business Name *</label>
          <input
            type="text"
            placeholder="e.g. LG Multispeciality Hospital"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="field">
          <label>Business Category *</label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(''); setExtras({}); }}>
            <option value="">— Select Category —</option>
            <option value="Hospital/Clinic">Hospital / Clinic</option>
            <option value="Restaurant/Cafe">Restaurant / Cafe</option>
            <option value="Jewellery Shop">Jewellery Shop</option>
            <option value="Hotel/Restro">Hotel / Restro</option>
            <option value="Salon/Spa">Salon / Spa</option>
            <option value="School/Coaching">School / Coaching</option>
            <option value="Clothing Store">Clothing Store</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Subcategory */}
        {catData && (
          <div className="field">
            <label>Sub Category</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
              <option value="">— Select Sub Category —</option>
              {catData.sub.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* City */}
        <div className="field">
          <label>City</label>
          <input
            type="text"
            placeholder="e.g. Varanasi, Delhi, Mumbai"
            maxLength={100}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {/* Dynamic extra questions */}
        {catData && catData.questions.map((q) => (
          <div className="field" key={q.id}>
            <label>{q.label}</label>
            <input
              type="text"
              placeholder={q.placeholder}
              value={extras[q.id] || ''}
              onChange={(e) => handleExtraChange(q.id, e.target.value)}
            />
          </div>
        ))}

        {/* GMB Link */}
        <div className="field">
          <label>Google My Business Review Link *</label>
          <input
            type="text"
            placeholder="https://g.page/r/YOUR_GMB_LINK/review"
            value={gmb}
            onChange={(e) => setGmb(e.target.value)}
          />
          <div className="form-hint">💡 Go to GMB dashboard → "Get more reviews" → Copy the link</div>
        </div>



        {/* Emoji */}
        <div className="field">
          <label>Business Emoji / Icon</label>
          <input
            type="text"
            placeholder="🏥"
            maxLength={2}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            style={{ fontSize: '24px', textAlign: 'center' }}
          />
        </div>

        {/* Plan Selector */}
        <div className="field">
          <label>Choose Your Plan *</label>
          <div className="plan-selector">
            {[
              { key: 'Starter', label: 'Starter', price: '₹499/mo' },
              { key: 'Growth', label: 'Growth 🔥', price: '₹999/mo' },
              { key: 'Pro', label: 'Pro', price: '₹1,999/mo' },
            ].map((p) => (
              <div
                key={p.key}
                className={`plan-opt ${plan === p.key ? 'selected' : ''}`}
                onClick={() => setPlan(p.key)}
              >
                <div className="plan-opt-name">{p.label}</div>
                <div className="plan-opt-price">{p.price}</div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary">
          {isEditing ? '✏️ Update Business' : '✅ Register & Generate QR Code'}
        </button>
      </form>
    </div>
  );
}
