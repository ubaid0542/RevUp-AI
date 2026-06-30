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
  'Restaurant': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your dining experience?' },
    { id: 'food',      label: 'Food quality & taste?',       sub: 'How was the taste and freshness of the food?' },
    { id: 'service',   label: 'Service & staff?',            sub: 'Were the waiters friendly and prompt?' },
    { id: 'ambience',  label: 'Ambience & vibe?',            sub: 'How was the restaurant atmosphere?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this to a friend?' },
  ],
  'Cafe': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your cafe visit?' },
    { id: 'beverages', label: 'Coffee / Beverages?',         sub: 'How was the taste of coffee and drinks?' },
    { id: 'food',      label: 'Food & snacks?',              sub: 'How were the snacks and food items?' },
    { id: 'ambience',  label: 'Ambience & vibe?',            sub: 'How was the cafe atmosphere and decor?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this cafe to friends?' },
  ],
  'Hotel': [
    { id: 'overall',   label: 'Overall stay?',               sub: 'How was your overall hotel experience?' },
    { id: 'rooms',     label: 'Room quality?',               sub: 'Was the room clean and comfortable?' },
    { id: 'food',      label: 'Food & dining?',              sub: 'How was the hotel food?' },
    { id: 'service',   label: 'Service & hospitality?',      sub: 'Was the staff welcoming and helpful?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this hotel to others?' },
  ],
  'Resort': [
    { id: 'overall',     label: 'Overall stay?',             sub: 'How was your overall resort experience?' },
    { id: 'rooms',       label: 'Room & amenities?',         sub: 'Was the room and amenities up to mark?' },
    { id: 'activities',  label: 'Activities & recreation?',  sub: 'How were the activities and entertainment?' },
    { id: 'food',        label: 'Food & service?',           sub: 'How was the food and staff service?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this resort to others?' },
  ],
  'Hospital': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall visit?' },
    { id: 'doctors',     label: 'Doctor consultation?',      sub: 'Was the doctor attentive and helpful?' },
    { id: 'staff',       label: 'Staff & reception?',        sub: 'Were the staff polite and cooperative?' },
    { id: 'cleanliness', label: 'Cleanliness & hygiene?',    sub: 'How clean and hygienic was the facility?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this to family or friends?' },
  ],
  'Clinic': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall visit to the clinic?' },
    { id: 'doctor',      label: 'Doctor consultation?',      sub: 'Was the doctor knowledgeable and caring?' },
    { id: 'staff',       label: 'Staff behaviour?',          sub: 'Were the staff polite and helpful?' },
    { id: 'cleanliness', label: 'Cleanliness?',              sub: 'Was the clinic clean and hygienic?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this clinic to others?' },
  ],
  'Dental Clinic': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall visit?' },
    { id: 'treatment',   label: 'Treatment quality?',        sub: 'Was the treatment painless and effective?' },
    { id: 'staff',       label: 'Staff & reception?',        sub: 'Were the staff polite and cooperative?' },
    { id: 'cleanliness', label: 'Cleanliness & hygiene?',    sub: 'How clean and hygienic was the clinic?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this clinic to others?' },
  ],
  'Medical Store': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience?' },
    { id: 'availability',  label: 'Medicine availability?',  sub: 'Did you find all the medicines you needed?' },
    { id: 'staff',         label: 'Staff behaviour?',        sub: 'Was the pharmacist helpful and knowledgeable?' },
    { id: 'pricing',       label: 'Pricing & offers?',       sub: 'Were the prices fair and competitive?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this store to others?' },
  ],
  'Pharmacy': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience at the pharmacy?' },
    { id: 'availability',  label: 'Medicine availability?',  sub: 'Were all required medicines available?' },
    { id: 'staff',         label: 'Pharmacist knowledge?',   sub: 'Was the pharmacist knowledgeable and helpful?' },
    { id: 'pricing',       label: 'Pricing?',                sub: 'Were the prices reasonable?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this pharmacy to others?' },
  ],
  'Salon': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your salon visit?' },
    { id: 'service',   label: 'Service quality?',            sub: 'Was the treatment done professionally?' },
    { id: 'hygiene',   label: 'Hygiene & cleanliness?',      sub: 'Were the tools and space clean?' },
    { id: 'staff',     label: 'Staff expertise?',            sub: 'Was the stylist skilled and attentive?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this salon to others?' },
  ],
  'Hair cutting Shop': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your visit?' },
    { id: 'service',   label: 'Haircut & styling?',          sub: 'Were you happy with the haircut/styling?' },
    { id: 'hygiene',   label: 'Hygiene & cleanliness?',      sub: 'Were the tools and space clean?' },
    { id: 'staff',     label: 'Staff behaviour?',            sub: 'Was the barber/stylist polite and skilled?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this shop to others?' },
  ],
  'Spa': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your spa experience?' },
    { id: 'treatment',   label: 'Treatment quality?',        sub: 'Was the therapy relaxing and effective?' },
    { id: 'ambience',    label: 'Ambience & relaxation?',    sub: 'Was the spa ambience calm and soothing?' },
    { id: 'therapist',   label: 'Therapist expertise?',      sub: 'Was the therapist skilled and professional?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this spa to others?' },
  ],
  'Gym': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How is your overall gym experience?' },
    { id: 'equipment', label: 'Equipment & machines?',       sub: 'Are the machines well-maintained?' },
    { id: 'trainers',  label: 'Trainers & coaching?',        sub: 'Are the trainers helpful and knowledgeable?' },
    { id: 'cleanliness',label: 'Hygiene & cleanliness?',     sub: 'Are the gym and locker rooms clean?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this gym to others?' },
  ],
  'Fitness Center': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How is your overall fitness experience?' },
    { id: 'training',    label: 'Training quality?',         sub: 'Were the classes well-structured and effective?' },
    { id: 'trainer',     label: 'Trainer expertise?',        sub: 'Was the trainer skilled and motivating?' },
    { id: 'facilities',  label: 'Facilities?',               sub: 'Were the facilities clean and well-maintained?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this center to others?' },
  ],
  'School': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was the overall school experience?' },
    { id: 'teaching',  label: 'Teaching quality?',           sub: 'Were the teachers knowledgeable and caring?' },
    { id: 'facility',  label: 'Facilities & infrastructure?',sub: 'How were the classrooms and facilities?' },
    { id: 'results',   label: 'Results & performance?',      sub: 'Are you satisfied with the academic support?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this school to others?' },
  ],
  'Coaching Center': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was the overall coaching experience?' },
    { id: 'faculty',   label: 'Faculty & teaching?',         sub: 'Were the teachers effective and knowledgeable?' },
    { id: 'material',  label: 'Study material?',             sub: 'Was the study material comprehensive and helpful?' },
    { id: 'results',   label: 'Results?',                    sub: 'Are you satisfied with the exam preparation?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this center to others?' },
  ],
  'College': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How is the overall college experience?' },
    { id: 'faculty',   label: 'Faculty & teaching?',         sub: 'Are the professors knowledgeable?' },
    { id: 'campus',    label: 'Campus & facilities?',        sub: 'How is the campus infrastructure?' },
    { id: 'placement', label: 'Placements & support?',       sub: 'How is the career support?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this college to others?' },
  ],
  'Institute': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How is the overall institute experience?' },
    { id: 'course',      label: 'Course quality?',           sub: 'Was the course content relevant and updated?' },
    { id: 'faculty',     label: 'Faculty?',                  sub: 'Were the instructors experienced?' },
    { id: 'infrastructure',label: 'Infrastructure?',         sub: 'Were the labs and classrooms well-equipped?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this institute to others?' },
  ],
  'Jewellery Shop': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your shopping experience?' },
    { id: 'quality',   label: 'Product quality?',            sub: 'How was the quality of the jewellery?' },
    { id: 'designs',   label: 'Variety & designs?',          sub: 'Were there enough designs and options?' },
    { id: 'staff',     label: 'Staff behaviour?',            sub: 'Was the staff helpful in choosing?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this shop to others?' },
  ],
  'Clothing Store': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your shopping experience?' },
    { id: 'collection',  label: 'Collection & variety?',     sub: 'Did you find enough designs and options?' },
    { id: 'staff',       label: 'Staff & assistance?',       sub: 'Was the staff helpful and cooperative?' },
    { id: 'quality',     label: 'Fabric & quality?',         sub: 'Are you satisfied with the quality?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to friends?' },
  ],
  'Boutique': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your boutique experience?' },
    { id: 'design',      label: 'Design & creativity?',      sub: 'Were the designs unique and trendy?' },
    { id: 'quality',     label: 'Fabric & quality?',         sub: 'Was the fabric and stitching quality good?' },
    { id: 'fitting',     label: 'Custom fitting?',           sub: 'Was the fitting and tailoring done well?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this boutique to others?' },
  ],
  'Supermarket': [
    { id: 'overall',      label: 'Overall experience?',      sub: 'How was your shopping experience?' },
    { id: 'availability', label: 'Product availability?',    sub: 'Did you find everything you needed?' },
    { id: 'freshness',    label: 'Quality & freshness?',     sub: 'Were the products fresh and of good quality?' },
    { id: 'pricing',      label: 'Pricing & offers?',        sub: 'Were the prices reasonable?' },
    { id: 'recommend',    label: 'Would you recommend?',     sub: 'Would you suggest this store to others?' },
  ],
  'Grocery Store': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your shopping experience?' },
    { id: 'freshness',   label: 'Product freshness?',        sub: 'Were the fruits, vegetables and items fresh?' },
    { id: 'variety',     label: 'Variety & stock?',           sub: 'Was there enough variety of products?' },
    { id: 'pricing',     label: 'Pricing?',                  sub: 'Were the prices fair and competitive?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to others?' },
  ],
  'Mobile Shop': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall shopping experience?' },
    { id: 'variety',     label: 'Product variety?',           sub: 'Did you find the mobile and model you wanted?' },
    { id: 'staff',       label: 'Staff knowledge?',          sub: 'Did the staff explain features properly?' },
    { id: 'pricing',     label: 'Pricing & deals?',          sub: 'Were the prices competitive with good offers?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this shop to others?' },
  ],
  'Laptop Store': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall shopping experience?' },
    { id: 'range',       label: 'Product range?',            sub: 'Did you find the laptop/specs you needed?' },
    { id: 'staff',       label: 'Staff expertise?',          sub: 'Did the staff guide you well on specifications?' },
    { id: 'aftersales',  label: 'After-sales support?',      sub: 'How was the warranty and support service?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to others?' },
  ],
  'Electronics Store': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall shopping experience?' },
    { id: 'variety',     label: 'Product variety?',           sub: 'Did you find enough brands and options?' },
    { id: 'staff',       label: 'Staff knowledge?',          sub: 'Did the staff explain product features well?' },
    { id: 'pricing',     label: 'Pricing & warranty?',       sub: 'Were the prices fair with good warranty?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to others?' },
  ],
  'Book Store': [
    { id: 'overall',      label: 'Overall experience?',      sub: 'How was your overall shopping experience?' },
    { id: 'collection',   label: 'Book collection?',         sub: 'Did you find the books you were looking for?' },
    { id: 'staff',        label: 'Staff assistance?',        sub: 'Was the staff helpful in finding books?' },
    { id: 'pricing',      label: 'Pricing & offers?',        sub: 'Were the prices reasonable with good discounts?' },
    { id: 'recommend',    label: 'Would you recommend?',     sub: 'Would you suggest this store to others?' },
  ],
  'Bakery': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall experience?' },
    { id: 'taste',       label: 'Taste & freshness?',        sub: 'How was the taste and freshness of items?' },
    { id: 'variety',     label: 'Variety & options?',         sub: 'Were there enough choices available?' },
    { id: 'hygiene',     label: 'Hygiene & packaging?',      sub: 'Was the shop clean and packaging good?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this bakery to others?' },
  ],
  'Sweet Shop': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall experience?' },
    { id: 'taste',       label: 'Taste & freshness?',        sub: 'How was the taste and freshness of sweets?' },
    { id: 'variety',     label: 'Variety?',                   sub: 'Were there enough varieties of sweets?' },
    { id: 'hygiene',     label: 'Hygiene & packaging?',      sub: 'Was the shop clean and packaging attractive?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this shop to others?' },
  ],
  'Ice Cream Shop': [
    { id: 'overall',   label: 'Overall experience?',         sub: 'How was your overall visit?' },
    { id: 'taste',     label: 'Taste & flavors?',            sub: 'How was the taste and variety of flavors?' },
    { id: 'freshness', label: 'Freshness & quality?',        sub: 'Was the ice cream fresh and creamy?' },
    { id: 'hygiene',   label: 'Hygiene & cleanliness?',      sub: 'Was the shop clean and hygienic?' },
    { id: 'recommend', label: 'Would you recommend?',        sub: 'Would you suggest this shop to friends?' },
  ],
  'Pet Shop': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall experience?' },
    { id: 'variety',     label: 'Product variety?',           sub: 'Was there good variety of pet products?' },
    { id: 'staff',       label: 'Staff & handling?',         sub: 'Did the staff handle pets gently and well?' },
    { id: 'pricing',     label: 'Pricing?',                  sub: 'Were the prices reasonable?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this shop to pet owners?' },
  ],
  'Veterinary Clinic': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall experience?' },
    { id: 'doctor',      label: 'Doctor & treatment?',       sub: 'Was the vet doctor skilled and caring?' },
    { id: 'staff',       label: 'Staff & handling?',         sub: 'Did the staff handle your pet gently?' },
    { id: 'cleanliness', label: 'Cleanliness?',              sub: 'Was the clinic clean and hygienic?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this clinic to pet owners?' },
  ],
  'Car Showroom': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your visit to the showroom?' },
    { id: 'staff',       label: 'Staff knowledge?',          sub: 'Did the sales team explain features well?' },
    { id: 'process',     label: 'Buying process?',           sub: 'Was the paperwork and delivery smooth?' },
    { id: 'testdrive',   label: 'Test drive experience?',    sub: 'How was the test drive and demonstration?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this showroom to others?' },
  ],
  'Auto Repair': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your service experience?' },
    { id: 'quality',     label: 'Service quality?',          sub: 'Was the repair/service done properly?' },
    { id: 'transparency',label: 'Pricing transparency?',     sub: 'Were the charges clear and fair?' },
    { id: 'timeliness',  label: 'Delivery time?',            sub: 'Was the vehicle delivered on time?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this service to others?' },
  ],
  'Garage': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your repair experience?' },
    { id: 'quality',     label: 'Repair quality?',           sub: 'Was the repair work done properly?' },
    { id: 'pricing',     label: 'Pricing?',                  sub: 'Were the charges fair and transparent?' },
    { id: 'timeliness',  label: 'Timeliness?',               sub: 'Was the vehicle ready on time?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this garage to others?' },
  ],
  'Real Estate Agency': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your experience with the agency?' },
    { id: 'professional',label: 'Professionalism?',          sub: 'Was the agent professional and helpful?' },
    { id: 'options',     label: 'Property options?',         sub: 'Did they show good properties matching your needs?' },
    { id: 'transparency',label: 'Transparency?',             sub: 'Were the deals clear and fair?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this agency to others?' },
  ],
  'Interior Designer': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall project experience?' },
    { id: 'design',      label: 'Design quality?',           sub: 'Were you happy with the designs and ideas?' },
    { id: 'execution',   label: 'Work execution?',           sub: 'Was the work done properly and neatly?' },
    { id: 'timeliness',  label: 'On-time completion?',       sub: 'Was the project completed on time?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest them to others?' },
  ],
  'Hardware Store': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall shopping experience?' },
    { id: 'availability',  label: 'Product availability?',   sub: 'Did you find everything you needed?' },
    { id: 'quality',       label: 'Product quality?',        sub: 'Was the quality of materials good?' },
    { id: 'staff',         label: 'Staff knowledge?',        sub: 'Did the staff guide you well?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this store to others?' },
  ],
  'Electrician': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was the overall service experience?' },
    { id: 'workquality',   label: 'Work quality?',           sub: 'Was the electrical work done properly and safely?' },
    { id: 'punctuality',   label: 'Punctuality?',            sub: 'Did the electrician arrive on time?' },
    { id: 'pricing',       label: 'Pricing & transparency?', sub: 'Were the charges fair and clearly communicated?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this electrician to others?' },
  ],
  'Photographer': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall photography experience?' },
    { id: 'quality',     label: 'Photo/Video quality?',      sub: 'Were you happy with the final photos/videos?' },
    { id: 'creativity',  label: 'Creativity & ideas?',       sub: 'Did the photographer bring creative ideas?' },
    { id: 'timeliness',  label: 'Delivery time?',            sub: 'Were the photos/videos delivered on time?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this photographer to others?' },
  ],
  'Wedding Planner': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was the overall wedding planning experience?' },
    { id: 'creativity',  label: 'Creativity & decoration?',  sub: 'Were the decorations and themes beautiful?' },
    { id: 'management',  label: 'Event management?',         sub: 'Was everything managed smoothly on the day?' },
    { id: 'budget',      label: 'Budget management?',        sub: 'Did they stay within the agreed budget?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this planner to others?' },
  ],
  'Event Planner': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was the overall event execution?' },
    { id: 'creativity',  label: 'Creativity & design?',      sub: 'How were the decorations and arrangements?' },
    { id: 'management',  label: 'Event management?',         sub: 'Was everything managed smoothly on time?' },
    { id: 'staff',       label: 'Staff & coordination?',     sub: 'Was the team cooperative and helpful?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest them to others?' },
  ],
  'Travel Agency': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall travel experience?' },
    { id: 'planning',    label: 'Trip planning?',            sub: 'Was the itinerary well-planned and organized?' },
    { id: 'value',       label: 'Value for money?',          sub: 'Was the package worth the price?' },
    { id: 'support',     label: 'Support during trip?',      sub: 'Was the team responsive during the trip?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this agency to others?' },
  ],
  'Lawyer': [
    { id: 'overall',        label: 'Overall experience?',    sub: 'How was your overall experience with the lawyer?' },
    { id: 'knowledge',      label: 'Legal knowledge?',       sub: 'Was the lawyer knowledgeable about your case?' },
    { id: 'communication',  label: 'Communication?',         sub: 'Did the lawyer explain things clearly?' },
    { id: 'result',         label: 'Case outcome?',          sub: 'Are you satisfied with the case result?' },
    { id: 'recommend',      label: 'Would you recommend?',   sub: 'Would you suggest this lawyer to others?' },
  ],
  'Insurance Agency': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience with the agency?' },
    { id: 'guidance',      label: 'Policy guidance?',        sub: 'Did the agent explain policies clearly?' },
    { id: 'claimsupport',  label: 'Claim support?',          sub: 'Was the claim process smooth and helpful?' },
    { id: 'followup',      label: 'Follow-up & support?',    sub: 'Does the agent follow up regularly?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this agency to others?' },
  ],
  'Courier Service': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall courier experience?' },
    { id: 'speed',       label: 'Delivery speed?',           sub: 'Was the parcel delivered on time?' },
    { id: 'safety',      label: 'Package safety?',           sub: 'Was the package delivered in good condition?' },
    { id: 'tracking',    label: 'Tracking & updates?',       sub: 'Were you updated about delivery status?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this service to others?' },
  ],
  'Diagnostic Center': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience at the center?' },
    { id: 'accuracy',      label: 'Report accuracy?',        sub: 'Were the test reports accurate and detailed?' },
    { id: 'staff',         label: 'Staff behaviour?',        sub: 'Was the staff professional and gentle?' },
    { id: 'timeliness',    label: 'Report delivery time?',   sub: 'Were the reports delivered on time?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this center to others?' },
  ],
  'IT Company': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience with the company?' },
    { id: 'quality',       label: 'Work quality?',           sub: 'Was the delivered work of good quality?' },
    { id: 'communication', label: 'Communication?',          sub: 'Was the team responsive and clear?' },
    { id: 'delivery',      label: 'On-time delivery?',       sub: 'Was the project delivered on time?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this company to others?' },
  ],
  'Software Agency': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience with the agency?' },
    { id: 'quality',       label: 'Code / product quality?', sub: 'Was the software well-built and bug-free?' },
    { id: 'management',    label: 'Project management?',     sub: 'Was the project managed well with regular updates?' },
    { id: 'support',       label: 'Support & maintenance?',  sub: 'Is the post-delivery support good?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this agency to others?' },
  ],
  'Digital Marketing Agency': [
    { id: 'overall',       label: 'Overall experience?',     sub: 'How was your overall experience with the agency?' },
    { id: 'results',       label: 'Results & ROI?',          sub: 'Did you see good results from their work?' },
    { id: 'communication', label: 'Communication?',          sub: 'Was the team responsive and clear?' },
    { id: 'reporting',     label: 'Reporting & updates?',    sub: 'Did they provide regular performance reports?' },
    { id: 'recommend',     label: 'Would you recommend?',    sub: 'Would you suggest this agency to others?' },
  ],
  'Printing Press': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall printing experience?' },
    { id: 'quality',     label: 'Print quality?',            sub: 'Was the print quality sharp and clear?' },
    { id: 'timeliness',  label: 'Delivery time?',            sub: 'Was the order delivered on time?' },
    { id: 'pricing',     label: 'Pricing?',                  sub: 'Were the charges fair and competitive?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this press to others?' },
  ],
  'Cinema Hall': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall movie experience?' },
    { id: 'screen',      label: 'Screen & sound?',           sub: 'Was the picture and sound quality good?' },
    { id: 'seating',     label: 'Seating comfort?',          sub: 'Were the seats comfortable and clean?' },
    { id: 'food',        label: 'Food & snacks?',            sub: 'How was the food counter and snack quality?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this cinema to others?' },
  ],
  'Banquet Hall': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was the overall venue experience?' },
    { id: 'space',       label: 'Space & décor?',            sub: 'Was the hall spacious and well-decorated?' },
    { id: 'catering',    label: 'Food & catering?',          sub: 'How was the food quality and service?' },
    { id: 'management',  label: 'Event management?',         sub: 'Was the staff cooperative and well-organized?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this venue to others?' },
  ],
  'E-commerce Store': [
    { id: 'overall',     label: 'Overall experience?',       sub: 'How was your overall shopping experience?' },
    { id: 'product',     label: 'Product quality?',          sub: 'Was the product as shown in photos?' },
    { id: 'delivery',    label: 'Delivery speed?',           sub: 'Was the order delivered on time?' },
    { id: 'packaging',   label: 'Packaging?',                sub: 'Was the product packed well and safely?' },
    { id: 'recommend',   label: 'Would you recommend?',      sub: 'Would you suggest this store to others?' },
  ],
};

// Backward compatibility: Map old combined category names to new individual ones
const LEGACY_CATEGORY_MAP = {
  'Restaurant / Cafe': 'Restaurant',
  'Hotel / Resort': 'Hotel',
  'Hospital / Clinic': 'Hospital',
  'Salon / Spa': 'Salon',
  'Gym / Fitness Center': 'Gym',
  'School / Coaching': 'School',
  'College / Institute': 'College',
  'Clothing Store / Boutique': 'Clothing Store',
  'Supermarket / Grocery': 'Supermarket',
  'Medical Store / Pharmacy': 'Medical Store',
  'Pet Shop / Pet Clinic': 'Pet Shop',
  'Auto Repair / Garage': 'Auto Repair',
  'IT Company / Software Agency': 'IT Company',
  'Photography Studio': 'Photographer',
  'Construction / Interior Designer': 'Interior Designer',
  'Bakery / Sweet Shop': 'Bakery',
  'Mobile & Electronics Store': 'Mobile Shop',
  'Furniture Store': 'Electronics Store',
  'Travel Agency': 'Travel Agency',
  'Tour & Travels': 'Travel Agency',
};



const DEFAULT_QUESTIONS = [
  { id: 'overall',   label: 'Overall experience?',   sub: 'How was your overall experience?' },
  { id: 'quality',   label: 'Product / service quality?', sub: 'Rate the quality of what you received.' },
  { id: 'service',   label: 'Service & staff?',      sub: 'Were the staff helpful and friendly?' },
  { id: 'value',     label: 'Value for money?',      sub: 'Was it worth the price?' },
  { id: 'recommend', label: 'Would you recommend?',  sub: 'Would you suggest this to a friend?' },
];
function getQuestions(businessType) {
  const mappedType = LEGACY_CATEGORY_MAP[businessType] || businessType;
  return CATEGORY_QUESTIONS[mappedType] || DEFAULT_QUESTIONS;
}


/**
 * ReviewScreen — Main review generation flow
 *
 * Contains the business header card, question slider, and result card.
 */
export default function ReviewScreen({ businessData, onEdit, onSaveReview }) {
  const questions = useMemo(() => getQuestions(businessData.type).slice(0, 3), [businessData.type]);

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
  const [selectedDish, setSelectedDish] = useState('');

  // Extract all available tags from business extras (specialty_dish, services, brands, etc.)
  const availableDishes = useMemo(() => {
    const extras = businessData.extras || {};
    let allItems = [];
    Object.values(extras).forEach(val => {
      if (typeof val === 'string' && val.trim() !== '') {
        const parts = val.split(',').map(s => s.trim()).filter(Boolean);
        allItems.push(...parts);
      }
    });
    return [...new Set(allItems)]; // Return unique items
  }, [businessData.extras]);

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

    // No artificial delay — generate as fast as possible

    let text = null;
    let source = '';

    // Pick a random keyword from the business keywords if available
    let randomKeyword = '';
    if (businessData.keywords) {
      const kwArr = businessData.keywords.split(',').map(k => k.trim()).filter(k => k);
      if (kwArr.length > 0) {
        randomKeyword = kwArr[Math.floor(Math.random() * kwArr.length)];
      }
    }

    // Combine random keyword with selected dish for richer review
    const combinedKeywords = [selectedDish, randomKeyword].filter(k => k).join(', ');

    // Generate review via Backend Proxy (OpenRouter — API keys stay server-side)
    text = await generateReviewProxy(businessData.name, businessData.type, answers, 'hinglish', { 
      businessSubcategory: businessData.subcategory, 
      city: businessData.city, 
      customerKeywords: combinedKeywords, 
      selectedDish,
      variationSeed: `${Date.now()}-${Math.random()}`
    });
    if (text) source = '🔗 Backend Proxy';

    // If Backend Proxy failed, show error to user
    if (!text) {
      setGeneratedReview('');
      setReviewSource('');
      setIsLoading(false);
      showToastMsg('⚠️ Review generate nahi ho paya. Please thodi der baad try karein.');
      return;
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
  }, [businessData, answers, selectedDish, copyToClipboard]);

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setGeneratedReview('');
    setReviewSource('');
    setBackendReviewId(null);

    // No artificial delay — regenerate as fast as possible

    let text = null;
    let source = '';

    let randomKeyword = '';
    if (businessData.keywords) {
      const kwArr = businessData.keywords.split(',').map(k => k.trim()).filter(k => k);
      if (kwArr.length > 0) {
        randomKeyword = kwArr[Math.floor(Math.random() * kwArr.length)];
      }
    }

    // Combine random keyword with selected dish for richer review
    const combinedKeywords = [selectedDish, randomKeyword].filter(k => k).join(', ');

    // Regenerate review via Backend Proxy (OpenRouter — API keys stay server-side)
    text = await generateReviewProxy(businessData.name, businessData.type, answers, 'hinglish', {
      businessSubcategory: businessData.subcategory,
      city: businessData.city,
      customerKeywords: combinedKeywords,
      selectedDish,
      regenerate: true,
      previousText: generatedReview,
      variationSeed: `${Date.now()}-${Math.random()}`,
    });
    if (text) source = '🔗 Backend Proxy';

    // If Backend Proxy failed, show error to user
    if (!text) {
      setGeneratedReview('');
      setReviewSource('');
      setIsLoading(false);
      showToastMsg('⚠️ Review generate nahi ho paya. Please thodi der baad try karein.');
      return;
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
    const searchQuery = encodeURIComponent(`${businessData.name} ${businessData.city || ''}`.trim());
    const fallbackLink = `https://www.google.com/search?q=${searchQuery}`;
    const gmbLink = businessData.gmb || fallbackLink;
    
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
            availableDishes={availableDishes}
            selectedDish={selectedDish}
            onDishSelect={setSelectedDish}
            businessType={businessData.type}
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
