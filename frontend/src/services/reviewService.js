// GoogleGenerativeAI import removed — API calls are now proxied through the backend for security

/**
 * Review Generator Service (Frontend)
 * 
 * Generates reviews in HINGLISH (Hindi + English mix) using templates.
 * Supports dynamic question IDs based on business category.
 * When the Laravel backend is running, can also call the API.
 */

const API_BASE = '/api';

const ratingLabels = {
  overall: 'Overall Experience',
  quality: 'Product / Service Quality',
  service: 'Service & Staff',
  value: 'Value for Money',
  ambience: 'Ambience / Vibe',
  recommend: 'Likelihood to Recommend',
  doctors: 'Doctor Consultation',
  staff: 'Staff Behaviour',
  cleanliness: 'Cleanliness & Hygiene',
  food: 'Food Quality & Taste',
  designs: 'Variety & Designs',
  rooms: 'Room Quality',
  hygiene: 'Hygiene & Cleanliness',
  teaching: 'Teaching Quality',
  facility: 'Facilities & Infrastructure',
  results: 'Results & Performance',
};

function formatRatingKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAverageRating(ratings) {
  const values = Object.values(ratings)
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (!values.length) return 3;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildReviewPrompt(businessName, businessType, ratings, language, options = {}) {
  const overall = ratings.overall || Math.round(getAverageRating(ratings));
  const subcategory = options.businessSubcategory || '';
  const keywords = options.customerKeywords || '';

  const ratingLines = Object.entries(ratings)
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([key, value]) => {
      const label = ratingLabels[key] || formatRatingKey(key);
      const level = Number(value) >= 4 ? 'very positive' : Number(value) === 3 ? 'average' : 'negative';
      return `- ${label}: ${level}`;
    })
    .join('\n');

  // Rating-based tone description
  const toneMap = {
    5: 'Very positive, highly satisfied, naturally recommend the business.',
    4: 'Positive with balanced appreciation and a small neutral observation if appropriate.',
    3: 'Mixed experience with both good and average points.',
    2: 'Mostly dissatisfied but polite and constructive.',
    1: 'Clearly disappointed while remaining respectful.',
  };
  const tone = toneMap[overall] || toneMap[3];

  // Business context string
  let bizContext = `Business Name: ${businessName}\nBusiness Category: ${businessType}`;
  if (subcategory) bizContext += `\nBusiness Subcategory: ${subcategory}`;

  // Name placement instruction — randomize
  const namePlacements = [
    'Place the business name naturally in the MIDDLE of the review.',
    'Place the business name naturally near the END of the review.',
    'Place the business name at the START of the review in a natural way.',
    'Do NOT mention the business name at all — write without it if the review sounds more natural.',
    'Mention the business name only once, anywhere it fits naturally.',
  ];
  const namePlacement = namePlacements[Math.floor(Math.random() * namePlacements.length)];

  let prompt = `You are an expert at writing authentic Google reviews that sound like real customers.\n\n`;
  prompt += `### Input Variables\n${bizContext}\nSelected Rating: ${overall} out of 5 stars\n`;
  if (keywords) prompt += `Customer Keywords (optional): ${keywords}\n`;
  prompt += `\nDetailed aspect ratings:\n${ratingLines || `- Overall Experience: ${overall >= 4 ? 'very positive' : overall === 3 ? 'average' : 'negative'}`}\n\n`;

  prompt += `### Review Rules\n`;
  prompt += `- Generate a review between 30 to 60 words ONLY.\n`;
  prompt += `- Use 80% Hinglish (Roman Hindi — Hindi words written in English script) and 20% English.\n`;
  prompt += `- Keep the writing style simple and consistent while ensuring every review is unique in wording and sentence structure.\n`;
  prompt += `- Sound like a genuine customer sharing a real experience in a casual, conversational tone.\n`;
  prompt += `- Use only the provided business information and customer input.\n`;
  prompt += `- Do NOT invent products, services, staff names, or experiences that are not relevant to the business.\n`;
  prompt += `- Avoid repetitive phrases, robotic language, emojis, hashtags, excessive punctuation, and overly promotional wording.\n`;
  prompt += `- Keep grammar clean but allow natural human-style imperfections for authenticity.\n`;
  prompt += `- Return ONLY the review text with no title, quotation marks, numbering, or explanation.\n\n`;

  prompt += `### Business Name Placement\n`;
  prompt += `${namePlacement}\n`;
  prompt += `NEVER start every review with the business name. Vary the placement naturally.\n\n`;

  prompt += `### Filler Words\n`;
  prompt += `- Use natural conversational filler words ONLY when they fit naturally: kaafi, actually, sach me, overall, personally, honestly, waise, genuinely.\n`;
  prompt += `- Maximum 1-2 filler words per review. Never overuse them.\n`;
  if (overall >= 4) {
    prompt += `- Since the rating is ${overall} stars (above 3), naturally include the word "best" somewhere in the review as part of a human-like sentence. Do not force it at the beginning.\n`;
  } else {
    prompt += `- Since the rating is ${overall} stars (3 or below), do NOT use the word "best" anywhere in the review.\n`;
  }

  prompt += `\n### Rating-Based Tone\n`;
  prompt += `Selected rating is ${overall} stars. Tone: ${tone}\n\n`;

  prompt += `### Business Context Awareness\n`;
  prompt += `Understand the business from the Business Name, Category, and Subcategory provided above. Generate a review that mentions services, products, or experiences that logically belong to that business type.\n`;
  prompt += `Examples: Restaurant → food, taste, ambience. Salon → staff, hygiene, haircut quality. Clothing Store → collection, quality, pricing. Gym → equipment, trainers. Hotel → rooms, cleanliness, comfort.\n`;
  prompt += `If the Business Name itself indicates a specialty (e.g., bakery, pizza, dental, mobile repair), use that context naturally even if the category is broad.\n\n`;

  if (keywords) {
    prompt += `### Customer Keywords\n`;
    prompt += `The customer mentioned these keywords: "${keywords}". Weave them naturally into the review without forcing them.\n\n`;
  }

  prompt += `### Strict Prohibitions\n`;
  prompt += `- Do NOT include any numbers, ratings, or scores like "4/5", "8/10".\n`;
  prompt += `- Do NOT mention star ratings in any form.\n`;
  prompt += `- Do NOT include emojis or hashtags.\n`;
  prompt += `- Do NOT include quotation marks around the review.\n`;
  prompt += `- Do NOT add a title or heading.\n`;
  prompt += `- Output ONLY the review text, nothing else.\n`;

  if (options.regenerate) {
    const perspectives = ['a young professional', 'a family person', 'a first-time visitor', 'a regular customer', 'a student', 'someone who visited with friends'];
    const tones = ['enthusiastic', 'calm and measured', 'casual and friendly', 'detailed and thoughtful', 'short and punchy', 'storytelling style'];
    const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];

    prompt += `\n### Regeneration\n`;
    prompt += `This is a regenerate request. Write a COMPLETELY DIFFERENT review.\n`;
    prompt += `Write from the perspective of ${randomPerspective} with a ${randomTone} tone.\n`;
    prompt += `Use entirely different sentence structure, vocabulary, and focus on different aspects.\n`;
    prompt += `Variation seed: ${Date.now()}-${Math.random().toString(36).slice(2)}.\n`;

    if (options.previousText) {
      prompt += `DO NOT repeat or rephrase any part of this previous review: "${options.previousText}"\n`;
    }
  }

  prompt += `\nGenerate a fresh, natural review now.`;
  return prompt;
}

function isGeminiApiKeyError(error) {
  const message = [
    error?.message,
    error?.toString?.(),
    JSON.stringify(error?.errorDetails || ''),
  ].join(' ');

  return /API_KEY_INVALID|API key expired|API key not valid|invalid api key/i.test(message);
}

/**
 * Detect gibberish / hallucinated text in AI-generated reviews.
 * Returns true if the text looks like garbage.
 */
function isGibberish(text) {
  if (!text || text.length < 15) return true;

  // 1. Non-Latin script contamination — random Arabic, Bengali, Tamil, Devanagari, CJK etc.
  //    Hinglish uses only Latin chars (a-z), so any other script is a red flag.
  const nonLatinScripts = /[\u0600-\u06FF\u0980-\u09FF\u0B80-\u0BFF\u0900-\u097F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;
  const nonLatinMatches = text.match(nonLatinScripts) || [];
  if (nonLatinMatches.length > 2) {
    console.warn('[Gibberish] Non-Latin scripts detected:', nonLatinMatches.length, 'chars');
    return true;
  }

  // 2. Code-like patterns — variable names, brackets, HTML tags, operators
  const codePatterns = /(<[A-Z][a-zA-Z]*|\b(function|const|var|let|import|export|class|return|Header|Footer|null|undefined|typeof|console)\b|[{}()\[\]<>=]{3,}|==|=>|\|\||&&)/g;
  const codeMatches = text.match(codePatterns) || [];
  if (codeMatches.length > 1) {
    console.warn('[Gibberish] Code patterns detected:', codeMatches);
    return true;
  }

  // 3. Excessive special characters ratio
  const specialChars = text.match(/[^a-zA-Z0-9\s.,!?'"\-–—:;()@#&]/g) || [];
  const specialRatio = specialChars.length / text.length;
  if (specialRatio > 0.15) {
    console.warn('[Gibberish] High special char ratio:', (specialRatio * 100).toFixed(1) + '%');
    return true;
  }

  // 4. Nonsense word detection — words with 6+ consecutive consonants (no vowels)
  const words = text.split(/\s+/);
  const consonantHeavy = words.filter(w => /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(w));
  if (consonantHeavy.length > 2) {
    console.warn('[Gibberish] Too many consonant-heavy words:', consonantHeavy);
    return true;
  }

  // 5. Real word ratio — check if enough words are recognizable
  const commonWords = new Set([
    'the','a','an','is','was','are','and','or','but','in','on','at','to','for','of','with',
    'this','that','it','i','we','they','my','our','your','he','she','not','no','yes',
    'very','much','so','too','also','just','really','only','all','more','most',
    'good','bad','best','worst','great','nice','amazing','excellent','awesome','wonderful',
    'bahut','accha','acha','achi','achha','mast','kya','hai','tha','thi','the','bhi',
    'nahi','nhi','bohot','boht','kaafi','ekdum','bilkul','sab','sabko','sabse',
    'khana','staff','service','quality','experience','recommend','visit','time',
    'overall','mein','mili','hua','hoga','hota','raha','rahi','rahe',
    'ne','ka','ki','ke','ko','se','pe','par','ho','kar','karo','kiya','ki',
    'wala','wali','wale','laga','lagi','acche','bura','buri',
    'aur','ya','lekin','phir','toh','abhi','yahan','wahan',
    'hoon','hain','hun','tha','thi','the','ga','ge','gi',
    'price','food','taste','fresh','clean','fast','slow','friendly','polite',
    'hotel','restaurant','shop','salon','hospital','doctor','room','table',
    'definitely','highly','must','pakka','zaroor','jaao','jao','try',
  ]);
  const realWords = words.filter(w => commonWords.has(w.toLowerCase().replace(/[^a-z]/g, '')));
  const realRatio = realWords.length / Math.max(words.length, 1);
  if (words.length > 10 && realRatio < 0.15) {
    console.warn('[Gibberish] Low real-word ratio:', (realRatio * 100).toFixed(1) + '%');
    return true;
  }

  // 6. Repetitive character sequences like "xxxxxx" or "aaaaa"
  if (/(.)\1{5,}/i.test(text)) {
    console.warn('[Gibberish] Repetitive character sequences detected');
    return true;
  }

  return false;
}

// ── Hinglish Review Templates by Category (30-60 words, no emojis, name varies) ──

/**
 * Helper: randomly decide where to place business name.
 * Returns a function that builds a sentence fragment with/without name.
 */
function nameVariant(name) {
  const r = Math.random();
  // 20% omit, 30% start, 25% middle, 25% end
  if (r < 0.2) return { pos: 'omit', name };
  if (r < 0.5) return { pos: 'start', name };
  if (r < 0.75) return { pos: 'mid', name };
  return { pos: 'end', name };
}

const categoryTemplates = {
  'Hospital/Clinic': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} mein kaafi accha experience raha, doctor ne sab kuch detail mein samjhaya. Staff bhi cooperative tha aur cleanliness best thi. Sach mein recommend karunga sabko.`;
        if (nv.pos === 'mid') return `Doctor consultation bahut achi rahi, ${n} mein sab kuch organized tha. Staff polite the aur hygiene ka poora dhyan rakha gaya. Overall best clinic experience mila.`;
        if (nv.pos === 'end') return `Doctor ne bahut patience se suna aur treatment bhi sahi raha. Staff ne poori help ki aur jagah bhi saaf thi. Genuinely best experience mila ${n} mein.`;
        return `Actually doctor ne bahut acche se explain kiya sab kuch. Staff cooperative tha, cleanliness ka poora dhyan tha. Treatment se satisfied hoon, best experience raha honestly.`;
      }
      if (avg === 3) {
        if (nv.pos === 'start') return `${n} mein doctor toh theek the lekin staff thoda busy laga. Cleanliness average thi, overall normal experience raha. Kuch accha tha kuch improve ho sakta hai.`;
        return `Doctor consultation theek thi par jaldi mein laga. Staff average tha aur waiting time thoda zyada laga. Cleanliness passable thi, overall mixed experience raha.`;
      }
      if (nv.pos === 'start') return `${n} se honestly disappoint hua. Doctor ne time nahi diya aur staff bhi cooperative nahi tha. Cleanliness bhi theek nahi thi, improvement ki zaroorat hai.`;
      return `Doctor se zyada baat nahi ho payi, jaldi mein the. Staff ka behaviour bhi accha nahi laga aur jagah mein safai ki kami thi. Waise improvement ki zaroorat hai.`;
    },
  ],

  'Restaurant/Cafe': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} ka khana sach mein bahut tasty tha, fresh ingredients use hue the. Service bhi fast thi aur ambience kaafi pleasant tha. Best jagah hai khaane ke liye honestly.`;
        if (nv.pos === 'mid') return `Khana bahut accha laga, taste ekdum perfect tha. ${n} ki service bhi smooth thi aur staff friendly tha. Ambience mast tha, waise best dining experience raha.`;
        if (nv.pos === 'end') return `Food quality kaafi impressive thi aur presentation bhi acchi thi. Staff ne bahut acche se serve kiya, ambience pleasant tha. Sach mein best experience mila ${n} mein.`;
        return `Khana genuinely bahut accha tha, taste aur freshness dono mein kaafi impressed hua. Service prompt thi aur jagah ka vibe bhi sahi tha. Best dining experience raha overall.`;
      }
      if (avg === 3) {
        if (nv.pos === 'start') return `${n} mein khana theek-thaak tha, taste average laga. Service normal thi, zyada fast nahi thi. Ambience passable tha lekin kuch special nahi laga overall.`;
        return `Food average tha honestly, kuch dishes acchi thi kuch nahi. Service mein thoda improvement chahiye aur ambience bhi normal tha. Ek baar try kar sakte ho.`;
      }
      if (nv.pos === 'start') return `${n} ka khana disappoint kiya, taste mein kuch khaas nahi tha. Service slow thi aur staff attentive nahi laga. Waise improvement ki bahut zaroorat hai.`;
      return `Khana bland laga aur freshness bhi nahi thi. Service slow thi aur staff ka attitude bhi theek nahi tha. Overall disappointing experience raha, expected better tha.`;
    },
  ],

  'Jewellery Shop': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} ka collection sach mein kaafi impressive tha, designs bahut beautiful the. Staff ne patience se dikhaya sab kuch. Quality bhi genuine lagi, best jewellery shopping experience raha.`;
        if (nv.pos === 'mid') return `Jewellery ki quality bahut achi thi aur designs trendy the. ${n} mein staff ne bahut help ki choosing mein. Overall best shopping experience mila honestly.`;
        return `Collection mein bahut variety thi, traditional aur modern dono designs mile. Staff cooperative tha aur quality genuine lagi. Sach mein best experience mila jewellery shopping ka.`;
      }
      if (avg === 3) return `Collection theek-thaak tha, kuch designs acche the kuch average. Staff normal tha, zyada help nahi ki. Quality passable thi overall, par kuch special nahi laga.`;
      return `Designs mein variety ki kami thi aur quality bhi expected se kam lagi. Staff ka behaviour bhi average tha. Honestly thoda disappoint hua, improvement chahiye.`;
    },
  ],

  'Hotel/Restro': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} mein stay bahut comfortable raha, room saaf aur spacious tha. Food bhi kaafi accha tha aur staff ki hospitality ne impress kiya. Best hotel experience genuinely.`;
        if (nv.pos === 'end') return `Room clean tha, AC sahi chal raha tha aur food bhi tasty tha. Staff welcoming tha aur check-in smooth hua. Best stay experience mila ${n} mein sach mein.`;
        return `Stay kaafi comfortable raha, room mein sab facilities thi. Food quality acchi thi aur staff ne bahut acche se treat kiya. Overall best hotel experience mila honestly.`;
      }
      if (avg === 3) return `Room theek tha lekin maintenance mein thoda dhyan dena chahiye. Food average tha aur service normal thi. Overall ek standard experience raha, kuch special nahi.`;
      return `Room ki condition expected se kam thi aur cleanliness mein kami thi. Food bland laga aur staff bhi attentive nahi tha. Honestly disappoint hua, improvement chahiye.`;
    },
  ],

  'Salon/Spa': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} mein haircut karwaya aur result kaafi accha aaya. Stylist skilled tha aur hygiene ka poora dhyan rakha gaya. Sach mein best salon experience mila.`;
        if (nv.pos === 'mid') return `Service bahut professional thi, jo look chahiye tha wahi mila. ${n} ki hygiene impressive thi aur staff experienced tha. Best experience raha honestly.`;
        return `Salon visit bahut satisfying rahi, treatment professionally hua. Tools sanitized the aur towels fresh the. Staff ne exactly wahi diya jo manga tha, genuinely best experience.`;
      }
      if (avg === 3) return `Service theek thi par kuch special nahi laga. Hygiene passable thi aur staff average tha. Overall normal salon experience raha, try kar sakte ho ek baar.`;
      return `Service se satisfy nahi hua, result expected jaisa nahi aaya. Hygiene mein bhi improvement chahiye aur staff ko aur training ki zaroorat hai. Waise disappointing raha.`;
    },
  ],

  'School/Coaching': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} ki teaching quality kaafi impressive hai, teachers concepts clear karte hain. Facilities bhi acchi hain aur results consistently acche aa rahe hain. Best institute hai sach mein.`;
        if (nv.pos === 'end') return `Teachers bahut knowledgeable hain aur har student pe individually dhyan dete hain. Facilities modern hain aur environment positive hai. Best coaching experience mila ${n} mein.`;
        return `Teaching method bahut effective hai, concepts clear hote hain easily. Faculty supportive hai aur infrastructure bhi kaafi accha hai. Overall best institute hai honestly education ke liye.`;
      }
      if (avg === 3) return `Teaching theek hai lekin kuch teachers improve kar sakte hain. Facilities average hain aur results bhi mixed aa rahe hain. Overall normal experience raha, kuch accha kuch average.`;
      return `Teaching quality se satisfied nahi hoon, teachers ko aur focus karna chahiye. Facilities outdated hain aur results bhi expected se kam hain. Honestly improvement ki zaroorat hai.`;
    },
  ],

  'Clothing Store': [
    (n, ratings) => {
      const r = (k) => ratings[k] || 3;
      const avg = Math.round(getAverageRating(ratings));
      const nv = nameVariant(n);
      if (avg >= 4) {
        if (nv.pos === 'start') return `${n} ka collection kaafi impressive hai, har type ke designs aur sizes available hain. Fabric quality bhi acchi hai aur staff ne matching select karne mein help ki. Best shopping experience raha.`;
        if (nv.pos === 'mid') return `Collection mein bahut variety thi, trendy aur traditional dono options mile. ${n} mein staff helpful tha aur fabric quality genuinely acchi lagi. Best store hai shopping ke liye.`;
        return `Kapdon ki range bahut acchi hai, fitting perfect aayi aur fabric quality se kaafi satisfied hoon. Staff ne properly guide kiya selection mein. Best shopping experience mila sach mein.`;
      }
      if (avg === 3) return `Collection theek-thaak tha, kuch designs acche the kuch average. Fabric quality passable thi aur staff normal tha. Overall ek standard shopping experience raha honestly.`;
      return `Designs mein variety ki kami thi aur fabric quality bhi expected se kam lagi. Staff ne zyada help nahi ki aur fitting options bhi limited the. Honestly disappoint hua.`;
    },
  ],
};

// ── Fallback generic Hinglish templates (30-60 words, no emojis) ──
const genericTemplates = [
  (n, ratings) => {
    const avg = Math.round(getAverageRating(ratings));
    const nv = nameVariant(n);
    if (avg >= 4) {
      if (nv.pos === 'start') return `${n} mein kaafi accha experience mila, quality impressive thi aur staff ne bahut help ki. Sab kuch smooth raha aur paisa wasool laga. Honestly best jagah hai, recommend karunga sabko.`;
      if (nv.pos === 'mid') return `Quality bahut acchi thi aur service smooth rahi. ${n} mein staff friendly tha aur overall sab kuch satisfying raha. Best experience mila genuinely, zaroor visit karo.`;
      return `Service aur quality dono mein kaafi impressed hua. Staff helpful tha aur overall experience bahut accha raha. Sach mein best jagah hai, sabko recommend karta hoon.`;
    }
    if (avg === 3) {
      if (nv.pos === 'start') return `${n} mein experience normal raha, kuch accha tha kuch average. Quality theek thi aur service bhi passable lagi. Overall ek standard experience mila, try kar sakte ho.`;
      return `Quality average thi aur service mein bhi kuch khaas nahi laga. Staff normal tha, overall theek-thaak experience raha. Ek baar visit kar sakte ho agar nearby ho.`;
    }
    if (nv.pos === 'start') return `${n} se honestly thoda disappoint hua, quality expected se kam thi. Service bhi slow lagi aur staff attentive nahi tha. Improvement ki zaroorat hai, abhi recommend karna mushkil hai.`;
    return `Quality se bilkul satisfied nahi hua aur service mein bhi bahut kami thi. Staff ka attitude bhi improve hona chahiye. Waise disappointing raha overall, expected better tha.`;
  },
  (n, ratings) => {
    const avg = Math.round(getAverageRating(ratings));
    const nv = nameVariant(n);
    if (avg >= 4) {
      if (nv.pos === 'end') return `Sab kuch bahut accha raha, quality top-notch thi aur staff ka behaviour genuinely pleasant tha. Paisa poora wasool hua aur experience best mila ${n} mein.`;
      return `Actually bahut accha experience mila, quality impressive thi aur service prompt rahi. Staff ne bahut acche se treat kiya, overall best raha. Zaroor jaana chahiye.`;
    }
    if (avg === 3) return `Experience mixed raha, kuch cheezein acchi thi aur kuch average. Service normal thi aur quality bhi standard lagi. Overall theek tha, expectations se thoda kam mila.`;
    return `Honestly experience accha nahi raha, quality disappointing thi aur service slow lagi. Staff ko improve karna chahiye. Abhi recommend nahi karunga, umeed hai aage better hoga.`;
  },
];

/**
 * Generate a review locally using category-specific Hinglish templates (no API needed).
 */
export function generateReviewLocal(businessName, businessType, ratings) {
  const templates = categoryTemplates[businessType] || genericTemplates;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(businessName, ratings);
}

/**
 * Generate a review via the Laravel API.
 * Falls back to local generation if API is unavailable.
 */
export async function generateReviewAPI(businessId, ratings, language = 'hinglish') {
  try {
    const response = await fetch(`${API_BASE}/reviews/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ business_id: businessId, ratings, language }),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return { id: data.data.review.id, text: data.data.text };
  } catch {
    // API unavailable — fallback handled by caller
    return null;
  }
}

/**
 * Regenerate a review via the Laravel API.
 */
export async function regenerateReviewAPI(businessId, ratings, previousText = '', language = 'hinglish') {
  try {
    const response = await fetch(`${API_BASE}/reviews/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        ratings,
        language,
        previous_text: previousText,
        variation_seed: `${Date.now()}-${Math.random()}`,
      }),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return { id: data.data.review.id, text: data.data.text };
  } catch {
    return null;
  }
}

/**
 * Create a business profile via the API.
 */
export async function createBusiness(name, type, googlePlaceId) {
  try {
    const response = await fetch(`${API_BASE}/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, type, google_place_id: googlePlaceId }),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.data;
  } catch {
    return null;
  }
}

/**
 * Generate a review using OpenRouter API directly from frontend (free models).
 */
export async function generateReviewOpenRouter(businessName, businessType, ratings, apiKey, language = 'hinglish', options = {}) {
  // API calls are now proxied through the backend for security
  // Direct frontend API calls disabled — keys are kept server-side only
  return null;
}

/**
 * Generate a review using the Gemini API directly from the frontend (standalone mode).
 */
export async function generateReviewGeminiFrontend(businessName, businessType, ratings, apiKey, language = 'hinglish', options = {}) {
  // API calls are now proxied through the backend for security
  // Direct frontend API calls disabled — keys are kept server-side only
  return null;
}

/**
 * Track QR Scan event on the backend
 */
export async function logQRScan(businessId) {
  try {
    await fetch(`${API_BASE}/public/business/${businessId}/scan`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
  } catch (err) {
    console.error("QR scan logging failed:", err);
  }
}

/**
 * Save review generated by frontend APIs (OpenRouter, Gemini, Local) to backend DB
 */
export async function saveExternalReviewAPI(businessId, ratings, text, source, language = 'hinglish') {
  try {
    const avgStars = Object.values(ratings).length > 0
      ? Math.round(Object.values(ratings).reduce((s, v) => s + v, 0) / Object.values(ratings).length)
      : 4;

    const response = await fetch(`${API_BASE}/reviews/save-external`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        business_id: businessId,
        ratings,
        generated_text: text,
        language,
        source,
        stars: avgStars,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success ? data.data : null;
    }
    return null;
  } catch (err) {
    console.error("Failed to save external review on backend:", err);
    return null;
  }
}

/**
 * Upload base64 customer photos for a review
 */
export async function uploadReviewPhotosAPI(reviewId, base64Photos) {
  try {
    const response = await fetch(`${API_BASE}/reviews/${reviewId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        photos: base64Photos,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success ? data.data : null;
    }
    return null;
  } catch (err) {
    console.error("Failed to upload review photos:", err);
    return null;
  }
}

