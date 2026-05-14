/**
 * Review Generator Service (Frontend)
 * 
 * Handles review generation locally using Hinglish templates.
 * When the Laravel backend is running, can also call the API.
 */

const API_BASE = '/api';

// ── Hinglish Review Templates (same as original app) ──
const reviewTemplates = [
  (n, t, overall, quality, service, value, ambience, recommend) => {
    const intro = overall >= 4 ? `${n} ka experience ekdum mast raha!` : overall === 3 ? `${n} ka experience theek-thaak raha.` : `${n} ka experience bilkul achha nahi raha.`;
    const qStr = quality >= 4 ? `${t} ki quality zabardast thi, sach mein maja aa gaya.` : quality === 3 ? `Quality average thi, kuch khaas nahi.` : `Quality se bilkul satisfied nahi tha/thi.`;
    const sStr = service >= 4 ? `Staff bahut friendly aur helpful tha.` : service === 3 ? `Service theek thi, kuch improvement ho sakti hai.` : `Service thodi slow aur careless lagi.`;
    const vStr = value >= 4 ? `Paisa wasool tha!` : value === 3 ? `Pricing fair hai.` : `Thoda mehnga laga given the experience.`;
    const rStr = recommend >= 4 ? `Definitely recommend karunga/karungi sabko!` : recommend === 3 ? `Ek baar try kar sakte ho agar nearby ho.` : `Abhi recommend karna mushkil hai.`;
    return `${intro} ${qStr} ${sStr} ${vStr} ${rStr}`;
  },

  (n, t, overall, quality, service, value, ambience, recommend) => {
    const start = overall >= 5 ? `Yaar, ${n} ne toh dil jeet liya!` : overall >= 4 ? `${n} visit karna ek achha decision tha!` : overall === 3 ? `${n} — ek dum average experience mila.` : `${n} se kuch zyada umeed thi, par disappointing raha.`;
    const atm = ambience >= 4 ? `Jagah ka mahaul ekdum shandaar tha, bahut cozy feel hua.` : ambience === 3 ? `Ambience theek tha, na zyada achha na bura.` : `Jagah ka mahaul thoda improve hona chahiye.`;
    const end = recommend >= 4 ? `Mere saare doston ko iske baare mein bata diya hai — must visit hai!` : recommend === 3 ? `Ek baar zaroor try karo.` : `Abhi tak wapas jaane ka mann nahi hai.`;
    return `${start} ${quality >= 4 ? `Quality ekdum top-class thi.` : `Quality ${quality >= 3 ? `acceptable thi` : `kafi disappointing thi`}.`} ${service >= 4 ? `Service ne bhi impress kiya.` : `Service mein thoda dhyan dena chahiye.`} ${atm} ${value >= 4 ? `Value for money bilkul sahi.` : `Pricing pe thoda sochna padega.`} ${end}`;
  },

  (n, t, overall, quality, service, value, ambience, recommend) => {
    const feel = overall >= 4 ? `${n} se wapas aaya/aayi toh mann khush ho gaya!` : overall === 3 ? `${n} se mix feelings hain — na full satisfied, na dissatisfied.` : `${n} se baar baar kaafi disappointed feel hua.`;
    const highlights = [
      quality >= 4 ? `quality ekdum lajawab thi` : quality === 3 ? `quality average thi` : `quality mein kami thi`,
      service >= 4 ? `service ne dil khush kar diya` : service === 3 ? `service normal thi` : `service improve honi chahiye`,
      value >= 4 ? `paisa wasool experience mila` : value === 3 ? `pricing thodi fair hai` : `pricing ke hisaab se kuch khaas nahi mila`
    ].join(', ');
    return `${feel} — ${highlights}. ${ambience >= 4 ? `Jagah ka vibe ekdum alag hi tha, mast laga.` : ambience === 3 ? `Jagah theek-thaak thi.` : `Setting mein thoda kaam karna chahiye.`} ${recommend >= 4 ? `Sabko bolna chahta/chahti hoon — ek baar zaroor jao!` : recommend === 3 ? `Kabhi paas ho toh try karo.` : `Filhaal recommend karna tough hai.`}`;
  },

  (n, t, overall, quality, service, value, ambience, recommend) => {
    const open = overall >= 4 ? `Sach bolun toh ${n} ne expectations se zyada impress kiya!` : overall === 3 ? `${n} — ek reliable jagah hai, kuch wow nahi mila par disappointing bhi nahi tha.` : `${n} ka experience expect se kaafi disappointing raha, honestly.`;
    const body = `${quality >= 4 ? `Jo mila uski quality ekdum first class thi.` : `Quality pe thoda aur dhyan dena chahiye.`} ${service >= 4 ? `Staff ne bahut acche se treat kiya, feel good raha.` : `Staff friendly ho sakta hai, thodi practice chahiye.`} ${value >= 4 ? `Paison ki complete value mili, no regrets.` : `Price ke hisaab se expectation thodi zyada thi.`}`;
    const close = recommend >= 4 ? `Family aur friends sabko yahan laane ka plan hai! ❤️` : recommend === 3 ? `Ek chance dene layak jagah hai.` : `Hope hai ki agli baar better experience hoga.`;
    return `${open} ${body} ${ambience >= 4 ? `Aur jagah ka atmosphere — ekdum premium feel.` : ambience === 3 ? `Atmosphere casual aur decent tha.` : `Atmosphere pe thoda kaam hona chahiye.`} ${close}`;
  }
];

/**
 * Generate a review locally using templates (no API needed).
 */
export function generateReviewLocal(businessName, businessType, ratings) {
  const avg = (v) => v || 3;
  const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
  return template(
    businessName,
    businessType.toLowerCase(),
    avg(ratings.overall),
    avg(ratings.quality),
    avg(ratings.service),
    avg(ratings.value),
    avg(ratings.ambience),
    avg(ratings.recommend)
  );
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
    return data.data.text;
  } catch {
    // API unavailable — fallback handled by caller
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
