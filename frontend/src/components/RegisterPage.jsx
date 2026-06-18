import React, { useState, useRef } from 'react';
import './RegisterPage.css';

/**
 * Category data with subcategories and dynamic questions
 */
const categoryData = {
  'Restaurant / Cafe': {
    sub: ['All', 'Fine Dining', 'Street Food / Dhaba', 'Cafe / Coffee Shop', 'Fast Food', 'Buffet', 'Cloud Kitchen', 'Pub / Bar'],
    questions: [
      { id: 'cuisine', label: 'Cuisine Type', placeholder: 'e.g. North Indian, Chinese, Continental' },
      { id: 'specialty_dish', label: 'Signature Dish', placeholder: 'e.g. Biryani, Pasta' },
    ],
  },
  'Hotel / Resort': {
    sub: ['All', 'Budget Hotel', '3-Star Hotel', '5-Star Hotel / Resort', 'Heritage Hotel', 'Guest House / Home Stay'],
    questions: [
      { id: 'amenities', label: 'Key Amenities', placeholder: 'e.g. Pool, Spa, Free Breakfast' },
    ],
  },
  'Hospital / Clinic': {
    sub: ['All', 'Multi-Specialty Hospital', 'General Clinic', 'Eye Hospital', 'Skin Clinic', 'Orthopaedic', 'Pediatric Clinic', 'Diagnostic Centre'],
    questions: [
      { id: 'speciality', label: 'Main Speciality', placeholder: 'e.g. Cardiology, Ortho' },
      { id: 'facilities', label: 'Special Facilities?', placeholder: 'e.g. ICU, Lab, Pharmacy' },
    ],
  },
  'Dental Clinic': {
    sub: ['All', 'General Dentistry', 'Orthodontics (Braces)', 'Cosmetic Dentistry', 'Implantology'],
    questions: [
      { id: 'specialty', label: 'Main Treatments', placeholder: 'e.g. Braces, Implants, Root Canal' },
    ],
  },
  'Salon / Spa': {
    sub: ['All', 'Unisex Salon', 'Ladies Salon', 'Gents Salon', 'Luxury Spa', 'Nail Art Studio', 'Bridal Studio'],
    questions: [
      { id: 'services', label: 'Popular Services', placeholder: 'e.g. Hair Color, Facial, Massage' },
    ],
  },
  'Gym / Fitness Center': {
    sub: ['All', 'Unisex Gym', 'CrossFit Studio', 'Yoga Studio', 'Zumba/Dance Fitness', 'Martial Arts'],
    questions: [
      { id: 'facilities', label: 'Facilities', placeholder: 'e.g. Cardio, Free Weights, Steam Room' },
    ],
  },
  'School / Coaching': {
    sub: ['All', 'Pre-School / Nursery', 'Primary School', 'High School', 'Coaching Institute', 'Tuition Centre'],
    questions: [
      { id: 'subjects', label: 'Main Subjects / Courses', placeholder: 'e.g. Maths, IIT-JEE, NEET' },
    ],
  },
  'College / Institute': {
    sub: ['All', 'Engineering College', 'Medical College', 'Degree College', 'Management Institute', 'Polytechnic'],
    questions: [
      { id: 'courses', label: 'Top Courses', placeholder: 'e.g. B.Tech, MBA, MBBS' },
    ],
  },
  'Jewellery Shop': {
    sub: ['All', 'Gold Jewellery', 'Diamond Jewellery', 'Silver Jewellery', 'Imitation Jewellery', 'Antique Jewellery'],
    questions: [
      { id: 'specialty', label: 'Specialization?', placeholder: 'e.g. Bridal sets, Custom design' },
    ],
  },
  'Clothing Store / Boutique': {
    sub: ['All', "Men's Wear", "Women's Wear", "Kids Wear", 'Ethnic Wear', 'Western Wear', 'Boutique', 'Wedding Collection'],
    questions: [
      { id: 'collection', label: 'Special Collection / Brands', placeholder: 'e.g. Wedding collections, Levis' },
    ],
  },
  'Supermarket / Grocery': {
    sub: ['All', 'Supermarket', 'Hypermarket', 'Local Grocery', 'Organic Store', 'Convenience Store'],
    questions: [
      { id: 'specialty', label: 'Key Offerings', placeholder: 'e.g. Fresh Produce, Imported Goods' },
    ]
  },
  'Medical Store / Pharmacy': {
    sub: ['All', 'General Pharmacy', 'Ayurvedic Store', 'Homeopathic Store', '24/7 Pharmacy', 'Surgical Supply'],
    questions: [
      { id: 'services', label: 'Special Services', placeholder: 'e.g. Home Delivery, 24/7 Open' },
    ]
  },
  'Pet Shop / Pet Clinic': {
    sub: ['All', 'Pet Food & Supplies', 'Pet Clinic', 'Pet Grooming', 'Pet Boarding / Daycare', 'Aquarium Shop'],
    questions: [
      { id: 'services', label: 'Services / Products', placeholder: 'e.g. Dog Grooming, Vaccinations' },
    ]
  },
  'Car Showroom': {
    sub: ['All', 'New Car Dealer', 'Used Car Dealer', 'Two-Wheeler Showroom', 'Commercial Vehicles', 'Electric Vehicles'],
    questions: [
      { id: 'brands', label: 'Brands Available', placeholder: 'e.g. Maruti, Hyundai, Tata' },
    ]
  },
  'Auto Repair / Garage': {
    sub: ['All', 'General Service', 'Denting & Painting', 'Tyre Shop', 'Car Wash & Detailing', 'Bike Repair', 'AC Repair'],
    questions: [
      { id: 'specialty', label: 'Specialized Services', placeholder: 'e.g. Engine Overhaul, Ceramic Coating' },
    ]
  },
  'Real Estate Agency': {
    sub: ['All', 'Residential Broker', 'Commercial Real Estate', 'Property Management', 'Builders & Developers', 'PG/Hostel'],
    questions: [
      { id: 'focus', label: 'Area of Focus', placeholder: 'e.g. Luxury Apartments, Office Spaces' },
    ]
  },
  'IT Company / Software Agency': {
    sub: ['All', 'Web Development', 'App Development', 'Digital Marketing', 'IT Support', 'UI/UX Design', 'Cloud Services'],
    questions: [
      { id: 'services', label: 'Core Services', placeholder: 'e.g. E-commerce Websites, SEO' },
    ]
  },
  'Photography Studio': {
    sub: ['All', 'Wedding Photography', 'Portrait Studio', 'Commercial Photography', 'Event Photography', 'Photo Printing'],
    questions: [
      { id: 'specialty', label: 'Specialization', placeholder: 'e.g. Candid Weddings, Fashion' },
    ]
  },
  'Event Planner': {
    sub: ['All', 'Wedding Planner', 'Corporate Events', 'Birthday Parties', 'Caterer', 'Decoration Services'],
    questions: [
      { id: 'services', label: 'Key Services', placeholder: 'e.g. Full Wedding Management, Catering' },
    ]
  },
  'Travel Agency': {
    sub: ['All', 'Domestic Tours', 'International Tours', 'Flight Booking', 'Visa Assistance', 'Corporate Travel'],
    questions: [
      { id: 'packages', label: 'Popular Packages', placeholder: 'e.g. Dubai Trips, Kerala Tour' },
    ]
  },
  'Mobile & Electronics Store': {
    sub: ['All', 'Mobile Phones', 'Laptops & Computers', 'Home Appliances', 'Mobile Repair', 'Accessories'],
    questions: [
      { id: 'brands', label: 'Brands / Products', placeholder: 'e.g. Apple, Samsung, Smart TVs' },
    ]
  },
  'Furniture Store': {
    sub: ['All', 'Home Furniture', 'Office Furniture', 'Custom Furniture', 'Mattress Store', 'Outdoor Furniture'],
    questions: [
      { id: 'specialty', label: 'Specialty', placeholder: 'e.g. Teak Wood, Modular Kitchens' },
    ]
  },
  'Construction / Interior Designer': {
    sub: ['All', 'Interior Designer', 'Architect', 'Building Contractor', 'Modular Kitchens', 'Painting Services'],
    questions: [
      { id: 'focus', label: 'Specialization', placeholder: 'e.g. Residential Interiors, Turnkey Projects' },
    ]
  },
  'Bakery / Sweet Shop': {
    sub: ['All', 'Custom Cakes', 'Traditional Sweets (Mithai)', 'Patisserie', 'Namkeen/Snacks', 'Dessert Parlour'],
    questions: [
      { id: 'specialty', label: 'Signature Items', placeholder: 'e.g. Rasmalai, Fondant Cakes' },
    ]
  },
  'Optical Store': {
    sub: ['All', 'Spectacles & Frames', 'Sunglasses', 'Contact Lenses', 'Eye Testing', 'Computer Glasses'],
    questions: [
      { id: 'brands', label: 'Brands / Services', placeholder: 'e.g. Ray-Ban, Free Eye Test' },
    ]
  },
  'Tour & Travels': {
    sub: ['All', 'Cab Services', 'Bus Booking', 'Tempo Traveller', 'Self-Drive Cars', 'Pilgrimage Tours'],
    questions: [
      { id: 'vehicles', label: 'Vehicles / Services', placeholder: 'e.g. Innova Rentals, Chardham Yatra' },
    ]
  },
  'Other': {
    sub: ['All', 'Service Business', 'Manufacturing', 'Freelance / Consultant', 'NGO / Non-Profit', 'Logistics'],
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
  const [keywords, setKeywords] = useState(initialData?.keywords || '');
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
      keywords: keywords.trim(),
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
            <option value="Restaurant / Cafe">🍴 Restaurant / Cafe</option>
            <option value="Hotel / Resort">🏨 Hotel / Resort</option>
            <option value="Hospital / Clinic">🏥 Hospital / Clinic</option>
            <option value="Dental Clinic">🦷 Dental Clinic</option>
            <option value="Salon / Spa">💇 Salon / Spa</option>
            <option value="Gym / Fitness Center">💪 Gym / Fitness Center</option>
            <option value="School / Coaching">🏫 School / Coaching</option>
            <option value="College / Institute">🎓 College / Institute</option>
            <option value="Jewellery Shop">💍 Jewellery Shop</option>
            <option value="Clothing Store / Boutique">👕 Clothing Store / Boutique</option>
            <option value="Supermarket / Grocery">🛒 Supermarket / Grocery</option>
            <option value="Medical Store / Pharmacy">💊 Medical Store / Pharmacy</option>
            <option value="Pet Shop / Pet Clinic">🐶 Pet Shop / Pet Clinic</option>
            <option value="Car Showroom">🚗 Car Showroom</option>
            <option value="Auto Repair / Garage">🔧 Auto Repair / Garage</option>
            <option value="Real Estate Agency">🏠 Real Estate Agency</option>
            <option value="IT Company / Software Agency">💼 IT Company / Software Agency</option>
            <option value="Photography Studio">📸 Photography Studio</option>
            <option value="Event Planner">💐 Event Planner</option>
            <option value="Travel Agency">🏢 Travel Agency</option>
            <option value="Mobile & Electronics Store">📱 Mobile & Electronics Store</option>
            <option value="Furniture Store">🛋️ Furniture Store</option>
            <option value="Construction / Interior Designer">🏗️ Construction / Interior Designer</option>
            <option value="Bakery / Sweet Shop">🍰 Bakery / Sweet Shop</option>
            <option value="Optical Store">👓 Optical Store</option>
            <option value="Tour & Travels">✈️ Tour & Travels</option>
            <option value="Other">📦 Other</option>
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

        {/* Keywords */}
        <div className="field">
          <label>Keywords (for review generation)</label>
          <input
            type="text"
            placeholder="e.g. best doctor, affordable, friendly staff, tasty food"
            maxLength={500}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <div className="form-hint">💡 Ye keywords AI review mein naturally use honge — comma se alag likho</div>
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
          <div className="reg-plans-grid">
            <div
              className={`reg-plan-card glass-card ${plan === 'Starter' ? 'selected' : ''}`}
              onClick={() => setPlan('Starter')}
            >
              <div className="reg-plan-name">Starter</div>
              <div className="reg-plan-price">₹699<span>/mo</span></div>
              <ul className="reg-plan-features">
                <li>1 QR Code</li>
                <li>250 reviews/month</li>
                <li>Basic AI review</li>
                <li>GMB redirect</li>
              </ul>
            </div>
            <div
              className={`reg-plan-card glass-card popular ${plan === 'Growth' ? 'selected' : ''}`}
              onClick={() => setPlan('Growth')}
            >
              <div className="reg-plan-popular-tag">🔥 Popular</div>
              <div className="reg-plan-name">Growth</div>
              <div className="reg-plan-price">₹1,399<span>/mo</span></div>
              <ul className="reg-plan-features">
                <li>3 QR Codes</li>
                <li>750 reviews/month</li>
                <li>Advanced AI review</li>
                <li>GMB redirect</li>
                <li>Analytics dashboard</li>
              </ul>
            </div>
            <div
              className={`reg-plan-card glass-card ${plan === 'Pro' ? 'selected' : ''}`}
              onClick={() => setPlan('Pro')}
            >
              <div className="reg-plan-name">Pro</div>
              <div className="reg-plan-price">₹1,999<span>/mo</span></div>
              <ul className="reg-plan-features">
                <li>Unlimited QR Codes</li>
                <li>Unlimited reviews</li>
                <li>Premium AI reviews</li>
                <li>White-label option</li>
                <li>API access</li>
              </ul>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary">
          {isEditing ? '✏️ Update Business' : '✅ Register & Generate QR Code'}
        </button>
      </form>
    </div>
  );
}
