import React, { useState, useRef } from 'react';
import './RegisterPage.css';

/**
 * A custom tag input component to handle comma-separated values
 */
function TagInput({ value = '', onChange, placeholder }) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag].join(', '));
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags.join(', '));
    }
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(newTags.join(', '));
  };

  return (
    <div className="tag-input-container">
      <p className="tag-input-hint">Type and press Enter to add. Click on × to remove.</p>
      <div className="tag-input-box">
        {tags.map((tag, idx) => (
          <span key={idx} className={`tag-item tag-color-${idx % 5}`}>
            <span className="tag-text">{tag}</span>
            <button type="button" className="tag-remove" onClick={() => removeTag(idx)}>×</button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : 'Type and press Enter...'}
        />
      </div>
    </div>
  );
}

/**
 * Category data with subcategories and dynamic questions
 */
const categoryData = {
  'Restaurant': {
    sub: ['All', 'Fine Dining', 'Casual Dining', 'Street Food / Dhaba', 'Fast Food', 'Buffet', 'Cloud Kitchen', 'Pub / Bar'],
    questions: [
      { id: 'cuisine', label: 'Cuisine Type', placeholder: 'e.g. North Indian, Chinese, Continental' },
      { id: 'specialty_dish', label: 'Signature Dish', placeholder: 'e.g. Biryani, Pasta, Thali' },
    ],
  },
  'Cafe': {
    sub: ['All', 'Coffee Shop', 'Tea House', 'Bakery Cafe', 'Rooftop Cafe', 'Theme Cafe', 'Hookah Cafe', 'Fast Food', 'Catering Service'],
    questions: [
      { id: 'specialty', label: 'Specialty', placeholder: 'e.g. Cold Brew, Waffles, Shakes' },
    ],
  },
  'Hotel': {
    sub: ['All', 'Budget Hotel', '3-Star Hotel', '5-Star Hotel', 'Heritage Hotel', 'Guest House / Home Stay'],
    questions: [
      { id: 'amenities', label: 'Key Amenities', placeholder: 'e.g. Pool, Spa, Free Breakfast' },
    ],
  },
  'Resort': {
    sub: ['All', 'Beach Resort', 'Hill Station Resort', 'Luxury Resort', 'Eco Resort', 'Wellness Resort'],
    questions: [
      { id: 'amenities', label: 'Key Amenities', placeholder: 'e.g. Pool, Adventure Sports, Spa' },
    ],
  },
  'Hospital': {
    sub: ['All', 'Multi-Specialty Hospital', 'General Hospital', 'Eye Hospital', 'Children Hospital', 'Maternity Hospital'],
    questions: [
      { id: 'speciality', label: 'Main Speciality', placeholder: 'e.g. Cardiology, Ortho, Neuro' },
      { id: 'facilities', label: 'Special Facilities?', placeholder: 'e.g. ICU, Lab, Emergency' },
    ],
  },
  'Clinic': {
    sub: ['All', 'General Clinic', 'Dental Clinic', 'Eye Clinic', 'Skin Clinic', 'ENT Clinic', 'Orthopaedic Clinic', 'Physiotherapy Clinic', 'Blood Bank', 'Nursing Home', 'Veterinary Clinic'],
    questions: [
      { id: 'speciality', label: 'Main Speciality', placeholder: 'e.g. Skin Care, ENT, Ortho' },
    ],
  },
  'Dental Clinic': {
    sub: ['All', 'General Dentistry', 'Orthodontics (Braces)', 'Cosmetic Dentistry', 'Implantology', 'Pediatric Dentistry'],
    questions: [
      { id: 'specialty', label: 'Main Treatments', placeholder: 'e.g. Braces, Implants, Root Canal' },
    ],
  },
  'Medical Store': {
    sub: ['All', 'General Medical Store', 'Ayurvedic Store', 'Homeopathic Store', 'Surgical Supply', 'Online Medicine'],
    questions: [
      { id: 'services', label: 'Special Services', placeholder: 'e.g. Home Delivery, 24/7 Open' },
    ],
  },
  'Pharmacy': {
    sub: ['All', '24/7 Pharmacy', 'Hospital Pharmacy', 'Online Pharmacy', 'Compounding Pharmacy', 'Wellness Pharmacy'],
    questions: [
      { id: 'services', label: 'Special Services', placeholder: 'e.g. Home Delivery, Health Checkup' },
    ],
  },
  'Salon': {
    sub: ['All', 'Unisex Salon', 'Ladies Salon', 'Gents Salon', 'Bridal Studio', 'Nail Art Studio'],
    questions: [
      { id: 'services', label: 'Popular Services', placeholder: 'e.g. Hair Color, Facial, Haircut' },
    ],
  },
  'Hair cutting Shop': {
    sub: ['All', "Men's Haircut", "Women's Haircut", 'Kids Haircut', 'Hair Styling', 'Beard Grooming'],
    questions: [
      { id: 'services', label: 'Popular Services', placeholder: 'e.g. Haircut, Styling, Beard Trimming' },
    ],
  },
  'Spa': {
    sub: ['All', 'Luxury Spa', 'Ayurvedic Spa', 'Thai Spa', 'Wellness Center', 'Body Massage Center'],
    questions: [
      { id: 'services', label: 'Popular Therapies', placeholder: 'e.g. Swedish Massage, Aromatherapy' },
    ],
  },
  'Gym': {
    sub: ['All', 'Unisex Gym', 'Ladies Gym', 'CrossFit Studio', 'Bodybuilding Gym', 'Personal Training'],
    questions: [
      { id: 'facilities', label: 'Facilities', placeholder: 'e.g. Cardio, Free Weights, Steam Room' },
    ],
  },
  'Fitness Center': {
    sub: ['All', 'Yoga Studio', 'Zumba / Dance Fitness', 'Martial Arts', 'Aerobics Center', 'Pilates Studio'],
    questions: [
      { id: 'programs', label: 'Programs Offered', placeholder: 'e.g. Power Yoga, Kickboxing, Zumba' },
    ],
  },
  'School': {
    sub: ['All', 'Pre-School / Nursery', 'Primary School', 'High School', 'CBSE School', 'ICSE School'],
    questions: [
      { id: 'subjects', label: 'Special Programs', placeholder: 'e.g. Sports, Robotics, Arts' },
    ],
  },
  'Coaching Center': {
    sub: ['All', 'IIT-JEE Coaching', 'NEET Coaching', 'Competitive Exams', 'Language Classes', 'Tuition Centre'],
    questions: [
      { id: 'subjects', label: 'Main Subjects / Exams', placeholder: 'e.g. Maths, Physics, UPSC' },
    ],
  },
  'College': {
    sub: ['All', 'Engineering College', 'Medical College', 'Degree College', 'Polytechnic', 'Arts College'],
    questions: [
      { id: 'courses', label: 'Top Courses', placeholder: 'e.g. B.Tech, MBBS, B.Com' },
    ],
  },
  'Institute': {
    sub: ['All', 'Management Institute', 'Computer Institute', 'Design Institute', 'Law Institute', 'Vocational Training'],
    questions: [
      { id: 'courses', label: 'Top Courses', placeholder: 'e.g. MBA, BCA, Fashion Design' },
    ],
  },
  'Jewellery Shop': {
    sub: ['All', 'Gold Jewellery', 'Diamond Jewellery', 'Silver Jewellery', 'Imitation Jewellery', 'Antique Jewellery'],
    questions: [
      { id: 'specialty', label: 'Specialization?', placeholder: 'e.g. Bridal sets, Custom design' },
    ],
  },
  'Clothing Store': {
    sub: ['All', "Men's Wear", "Women's Wear", "Kids Wear", 'Ethnic Wear', 'Western Wear'],
    questions: [
      { id: 'collection', label: 'Special Collection / Brands', placeholder: 'e.g. Wedding collections, Levis' },
    ],
  },
  'Boutique': {
    sub: ['All', 'Designer Boutique', 'Bridal Boutique', 'Ethnic Boutique', 'Fashion Boutique', 'Custom Tailoring'],
    questions: [
      { id: 'specialty', label: 'Specialty', placeholder: 'e.g. Bridal Lehengas, Custom Suits' },
    ],
  },
  'Supermarket': {
    sub: ['All', 'General Supermarket', 'Hypermarket', 'Departmental Store', 'Wholesale Store', 'Mini Mart'],
    questions: [
      { id: 'specialty', label: 'Key Offerings', placeholder: 'e.g. Fresh Produce, Imported Goods' },
    ],
  },
  'Grocery Store': {
    sub: ['All', 'Local Grocery', 'Organic Store', 'Online Grocery', 'Fruits & Vegetables', 'Dry Fruits & Spices'],
    questions: [
      { id: 'specialty', label: 'Key Offerings', placeholder: 'e.g. Organic Products, Home Delivery' },
    ],
  },
  'Mobile Shop': {
    sub: ['All', 'New Mobiles', 'Second-Hand Mobiles', 'Mobile Accessories', 'Mobile Repair', 'SIM & Recharge'],
    questions: [
      { id: 'brands', label: 'Brands Available', placeholder: 'e.g. Samsung, Apple, Vivo' },
    ],
  },
  'Laptop Store': {
    sub: ['All', 'New Laptops', 'Refurbished Laptops', 'Gaming Laptops', 'Laptop Repair', 'Computer Accessories'],
    questions: [
      { id: 'brands', label: 'Brands Available', placeholder: 'e.g. HP, Dell, Lenovo, Apple' },
    ],
  },
  'Electronics Store': {
    sub: ['All', 'Home Appliances', 'Smart TVs', 'Audio Systems', 'Kitchen Appliances', 'Smart Home Devices'],
    questions: [
      { id: 'brands', label: 'Brands / Products', placeholder: 'e.g. LG, Samsung, Philips' },
    ],
  },
  'Book Store': {
    sub: ['All', 'General Books', 'Academic Books', 'Stationery & Books', 'Second-Hand Books', 'Online Book Store'],
    questions: [
      { id: 'specialty', label: 'Specialization', placeholder: 'e.g. Competitive Exams, Fiction, Children Books' },
    ],
  },
  'Bakery': {
    sub: ['All', 'Custom Cakes', 'Bread & Pastry', 'Patisserie', 'Home Bakery', 'Cake Shop'],
    questions: [
      { id: 'specialty', label: 'Signature Items', placeholder: 'e.g. Fondant Cakes, Brownies, Cookies' },
    ],
  },
  'Sweet Shop': {
    sub: ['All', 'Traditional Sweets (Mithai)', 'Namkeen & Snacks', 'Dry Fruit Sweets', 'Bengali Sweets', 'Gift Packing'],
    questions: [
      { id: 'specialty', label: 'Signature Items', placeholder: 'e.g. Rasmalai, Kaju Katli, Laddu' },
    ],
  },
  'Ice Cream Shop': {
    sub: ['All', 'Ice Cream Parlour', 'Gelato Shop', 'Frozen Yogurt', 'Kulfi Shop', 'Shake & Smoothie Bar'],
    questions: [
      { id: 'specialty', label: 'Signature Flavors', placeholder: 'e.g. Belgian Chocolate, Mango Dolly' },
    ],
  },
  'Pet Shop': {
    sub: ['All', 'Pet Food & Supplies', 'Pet Grooming', 'Pet Boarding / Daycare', 'Aquarium Shop', 'Pet Accessories'],
    questions: [
      { id: 'services', label: 'Services / Products', placeholder: 'e.g. Dog Food, Cat Toys, Fish Tanks' },
    ],
  },
  'Veterinary Clinic': {
    sub: ['All', 'General Vet Clinic', 'Pet Hospital', 'Pet Vaccination', 'Pet Surgery', 'Emergency Vet'],
    questions: [
      { id: 'services', label: 'Services', placeholder: 'e.g. Vaccination, Surgery, Health Checkup' },
    ],
  },
  'Car Showroom': {
    sub: ['All', 'New Car Dealer', 'Used Car Dealer', 'Luxury Cars', 'Electric Vehicles', 'Commercial Vehicles'],
    questions: [
      { id: 'brands', label: 'Brands Available', placeholder: 'e.g. Maruti, Hyundai, Tata' },
    ],
  },
  'Auto Repair': {
    sub: ['All', 'General Service Center', 'Denting & Painting', 'Car Wash & Detailing', 'Tyre Shop', 'AC Repair'],
    questions: [
      { id: 'specialty', label: 'Specialized Services', placeholder: 'e.g. Engine Overhaul, Ceramic Coating' },
    ],
  },
  'Garage': {
    sub: ['All', 'Bike Repair', 'Truck / Commercial Vehicle', 'Engine Specialist', 'Electrical Repair', 'Roadside Assistance'],
    questions: [
      { id: 'specialty', label: 'Specialized Services', placeholder: 'e.g. Bike Servicing, Engine Tuning' },
    ],
  },
  'Real Estate Agency': {
    sub: ['All', 'Residential Broker', 'Commercial Real Estate', 'Property Management', 'Builders & Developers', 'PG / Hostel'],
    questions: [
      { id: 'focus', label: 'Area of Focus', placeholder: 'e.g. Luxury Apartments, Office Spaces' },
    ],
  },
  'Interior Designer': {
    sub: ['All', 'Residential Interior', 'Commercial Interior', 'Modular Kitchen', 'Office Interior', 'Turnkey Projects'],
    questions: [
      { id: 'focus', label: 'Specialization', placeholder: 'e.g. Residential Interiors, Modular Kitchens' },
    ],
  },
  'Hardware Store': {
    sub: ['All', 'Building Materials', 'Plumbing Supplies', 'Electrical Supplies', 'Paints & Tools', 'Sanitary Ware'],
    questions: [
      { id: 'products', label: 'Key Products', placeholder: 'e.g. Cement, Pipes, Power Tools' },
    ],
  },
  'Electrician': {
    sub: ['All', 'Home Electrician', 'Commercial Electrician', 'AC Repair & Installation', 'CCTV & Security', 'Solar Panel Installation'],
    questions: [
      { id: 'services', label: 'Main Services', placeholder: 'e.g. Wiring, AC Repair, Smart Home Setup' },
    ],
  },
  'Photographer': {
    sub: ['All', 'Wedding Photography', 'Portrait Studio', 'Commercial Photography', 'Event Photography', 'Photo Printing'],
    questions: [
      { id: 'specialty', label: 'Specialization', placeholder: 'e.g. Candid Weddings, Fashion Shoots' },
    ],
  },
  'Wedding Planner': {
    sub: ['All', 'Full Wedding Management', 'Destination Wedding', 'Wedding Decoration', 'Wedding Photography', 'Mehendi & Makeup'],
    questions: [
      { id: 'services', label: 'Key Services', placeholder: 'e.g. Venue Booking, Catering, DJ' },
    ],
  },
  'Event Planner': {
    sub: ['All', 'Corporate Events', 'Birthday Parties', 'Caterer', 'Decoration Services', 'Sound & DJ'],
    questions: [
      { id: 'services', label: 'Key Services', placeholder: 'e.g. Full Event Management, Catering' },
    ],
  },
  'Travel Agency': {
    sub: ['All', 'Domestic Tours', 'International Tours', 'Flight Booking', 'Visa Assistance', 'Corporate Travel'],
    questions: [
      { id: 'packages', label: 'Popular Packages', placeholder: 'e.g. Dubai Trips, Kerala Tour' },
    ],
  },
  'Lawyer': {
    sub: ['All', 'Criminal Lawyer', 'Civil Lawyer', 'Family / Divorce Lawyer', 'Property Lawyer', 'Corporate Lawyer', 'Tax Consultant'],
    questions: [
      { id: 'specialization', label: 'Area of Practice', placeholder: 'e.g. Property Disputes, Criminal Cases' },
    ],
  },
  'Insurance Agency': {
    sub: ['All', 'Life Insurance', 'Health Insurance', 'Motor Insurance', 'General Insurance', 'Corporate Insurance'],
    questions: [
      { id: 'companies', label: 'Companies / Products', placeholder: 'e.g. LIC, Star Health, HDFC Ergo' },
    ],
  },
  'Courier Service': {
    sub: ['All', 'Domestic Courier', 'International Courier', 'Same-Day Delivery', 'Bulk Shipping', 'Document Delivery'],
    questions: [
      { id: 'services', label: 'Service Highlights', placeholder: 'e.g. Same-Day Delivery, Cash on Delivery' },
    ],
  },
  'Diagnostic Center': {
    sub: ['All', 'Pathology Lab', 'Radiology / X-Ray / MRI', 'Full Body Checkup', 'Home Sample Collection', 'DNA / Genetic Testing'],
    questions: [
      { id: 'tests', label: 'Popular Tests', placeholder: 'e.g. Blood Test, CT Scan, Health Packages' },
    ],
  },
  'IT Company': {
    sub: ['All', 'Web Development', 'App Development', 'IT Support', 'Cloud Services', 'ERP Solutions'],
    questions: [
      { id: 'services', label: 'Core Services', placeholder: 'e.g. E-commerce Websites, App Development' },
    ],
  },
  'Software Agency': {
    sub: ['All', 'Custom Software', 'SaaS Products', 'UI/UX Design', 'QA & Testing', 'AI / ML Solutions'],
    questions: [
      { id: 'services', label: 'Core Services', placeholder: 'e.g. CRM Software, Mobile Apps, AI Bots' },
    ],
  },
  'Digital Marketing Agency': {
    sub: ['All', 'SEO Agency', 'Social Media Marketing', 'PPC / Google Ads', 'Content Marketing', 'Branding Agency'],
    questions: [
      { id: 'services', label: 'Core Services', placeholder: 'e.g. Instagram Marketing, Google Ads, SEO' },
    ],
  },
  'Printing Press': {
    sub: ['All', 'Offset Printing', 'Digital Printing', 'Flex / Banner Printing', 'Visiting Card / Stationery', 'T-Shirt / Mug Printing'],
    questions: [
      { id: 'products', label: 'Key Products', placeholder: 'e.g. Wedding Cards, Brochures, Banners' },
    ],
  },
  'Cinema Hall': {
    sub: ['All', 'Single Screen', 'Multiplex', 'IMAX / 4DX', 'Drive-In Theatre', 'Mini Theatre'],
    questions: [
      { id: 'features', label: 'Special Features', placeholder: 'e.g. Dolby Atmos, Recliner Seats, Food Court' },
    ],
  },
  'Banquet Hall': {
    sub: ['All', 'Wedding Venue', 'Conference Hall', 'Party Hall', 'Farmhouse / Lawn', 'Rooftop Venue'],
    questions: [
      { id: 'capacity', label: 'Capacity & Features', placeholder: 'e.g. 500 guests, AC Hall, Valet Parking' },
    ],
  },
  'E-commerce Store': {
    sub: ['All', 'Fashion & Clothing', 'Electronics', 'Grocery Delivery', 'Handmade / Handicraft', 'Multi-Category Store'],
    questions: [
      { id: 'products', label: 'Product Categories', placeholder: 'e.g. Ethnic Wear, Gadgets, Organic Food' },
    ],
  },
  'Retail & Shopping': {
    sub: ['All', 'Clothing Store', 'Saree Shop', 'Footwear Store', 'Jewellery Shop', 'Gift Shop', 'Grocery Store', 'Electronics Store', 'Mobile Store', 'Furniture Store', 'Toy Store', 'Book Store', 'Cosmetics Store'],
    questions: [
      { id: 'products', label: 'Key Products', placeholder: 'e.g. Ethnic Wear, Footwear, Jewellery' },
    ],
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
            <option value="Restaurant">🍽️ Restaurant</option>
            <option value="Cafe">☕ Cafe</option>
            <option value="Hotel">🏨 Hotel</option>
            <option value="Resort">🏖️ Resort</option>
            <option value="Hospital">🏥 Hospital</option>
            <option value="Clinic">🩺 Clinic</option>
            <option value="Dental Clinic">🦷 Dental Clinic</option>
            <option value="Medical Store">💊 Medical Store</option>
            <option value="Pharmacy">⚕️ Pharmacy</option>
            <option value="Salon">💇 Salon</option>
            <option value="Hair cutting Shop">✂️ Hair cutting Shop</option>
            <option value="Spa">🧖 Spa</option>
            <option value="Gym">🏋️ Gym</option>
            <option value="Fitness Center">💪 Fitness Center</option>
            <option value="School">🏫 School</option>
            <option value="Coaching Center">📚 Coaching Center</option>
            <option value="College">🎓 College</option>
            <option value="Institute">🏛️ Institute</option>
            <option value="Jewellery Shop">💍 Jewellery Shop</option>
            <option value="Clothing Store">👕 Clothing Store</option>
            <option value="Boutique">🛍️ Boutique</option>
            <option value="Supermarket">🛒 Supermarket</option>
            <option value="Grocery Store">🥬 Grocery Store</option>
            <option value="Mobile Shop">📱 Mobile Shop</option>
            <option value="Laptop Store">💻 Laptop Store</option>
            <option value="Electronics Store">📷 Electronics Store</option>
            <option value="Book Store">📖 Book Store</option>
            <option value="Bakery">🎂 Bakery</option>
            <option value="Sweet Shop">🍬 Sweet Shop</option>
            <option value="Ice Cream Shop">🍦 Ice Cream Shop</option>
            <option value="Pet Shop">🐾 Pet Shop</option>
            <option value="Veterinary Clinic">🐕 Veterinary Clinic</option>
            <option value="Car Showroom">🚗 Car Showroom</option>
            <option value="Auto Repair">🔧 Auto Repair</option>
            <option value="Garage">🛠️ Garage</option>
            <option value="Real Estate Agency">🏠 Real Estate Agency</option>
            <option value="Interior Designer">🎨 Interior Designer</option>
            <option value="Hardware Store">🔨 Hardware Store</option>
            <option value="Electrician">⚡ Electrician</option>
            <option value="Photographer">📸 Photographer</option>
            <option value="Wedding Planner">💒 Wedding Planner</option>
            <option value="Event Planner">📅 Event Planner</option>
            <option value="Travel Agency">✈️ Travel Agency</option>
            <option value="Lawyer">⚖️ Lawyer</option>
            <option value="Insurance Agency">🛡️ Insurance Agency</option>
            <option value="Courier Service">🚚 Courier Service</option>
            <option value="Diagnostic Center">🔬 Diagnostic Center</option>
            <option value="IT Company">💻 IT Company</option>
            <option value="Software Agency">🚀 Software Agency</option>
            <option value="Digital Marketing Agency">📢 Digital Marketing Agency</option>
            <option value="Printing Press">🖨️ Printing Press</option>
            <option value="Cinema Hall">🎬 Cinema Hall</option>
            <option value="Banquet Hall">🏛️ Banquet Hall</option>
            <option value="E-commerce Store">🛒 E-commerce Store</option>
            <option value="Retail & Shopping">🛍️ Retail & Shopping</option>
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
            <TagInput
              placeholder={q.placeholder}
              value={extras[q.id] || ''}
              onChange={(newVal) => handleExtraChange(q.id, newVal)}
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
