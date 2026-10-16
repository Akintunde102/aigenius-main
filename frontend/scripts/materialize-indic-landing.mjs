/**
 * Materialize ta/te/mr/gu/kn landing JSON from hi.json + per-locale string tables.
 * Run: node scripts/materialize-indic-landing.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/locales/data/landing');
const hi = JSON.parse(fs.readFileSync(path.join(dataDir, 'hi.json'), 'utf8'));
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);

// Per-key Tamil (ta) — marketing/UI; placeholders and brands preserved.
const TA = {
  models: 'மாதிரிகள்',
  desktop: 'டெஸ்க்டாப்',
  tools: 'கருவிகள்',
  pricing: 'விலை',
  signIn: 'உள்நுழையவும்',
  openApp: 'பயன்பாட்டைத் திற',
  useOnWeb: 'வலையில் பயன்படுத்துங்கள்',
  downloadFor: '{platform} க்காக பதிவிறக்கம்',
  comingSoon: 'விரைவில்',
  desktopAppFor: 'டெஸ்க்டாப் பயன்பாடு',
  headline1: 'ஒரு பயன்பாடு. ஒவ்வொரு மாதிரியும்.',
  headline2: 'உங்கள் கோப்புகள். உங்கள் கணினி.',
  headline3: 'சந்தா இல்லை.',
  heroSubtitle:
    'Claude, GPT மற்றும் Gemini ஐ ஒரே டெஸ்க்டாப் மற்றும் வலை பயன்பாட்டிலிருந்து பயன்படுத்துங்கள்; உங்கள் கோப்புகள், குறியீடு மற்றும் Gmail க்கு நேரடி அணுகல். $1 இலிருந்து வாலட்டை நிரப்பி ஒவ்வொரு கோரிக்கைக்கும் செலுத்துங்கள்.',
  heroCreditsNotice:
    'பதிவு செய்யும் போது {credits} இலவச கிரெடிட்கள். மேலும் தேவைப்பட்டால் USD அல்லது NGN இல் நிரப்புங்கள்.',
  product: 'தயாரிப்பு',
  account: 'கணக்கு',
  legal: 'சட்டம்',
  privacyPolicy: 'தனியுரிமைக் கொள்கை',
  termsOfService: 'சேவை விதிமுறைகள்',
  allRightsReserved: 'Nobox Labs Limited',
  selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
  about: 'பற்றி',
  publishedConversations: 'வெளியிடப்பட்ட உரையாடல்கள்',
  publishedPages: 'வெளியிடப்பட்ட பக்கங்கள்',
  downloadApp: 'பயன்பாட்டைப் பதிவிறக்கவும்',
  downloadAppAria: 'AIGenius டெஸ்க்டாப் பயன்பாட்டைப் பதிவிறக்கவும்',
  comingSoonShort: 'விரைவில்',
  openMenu: 'மெனுவைத் திற',
  featureModelsTitle: 'உரையாடலின் நடுவில் மாதிரியை மாற்றுங்கள்.',
  featureModelsBody:
    'செய்தி பெட்டியிலிருந்து Claude, GPT, Gemini அல்லது DeepSeek ஐத் தேர்ந்தெடுக்கவும். ஒவ்வொரு பதிலும் அதன் செலவைக் காட்டுகிறது.',
  featureModelsHint: 'முயற்சி செய்யுங்கள்: வேறு மாதிரியைத் தேர்ந்தெடுக்கவும்.',
  tryOnWeb: 'வலையில் முயற்சிக்கவும்',
  featureDesktopTitle: 'உங்கள் கணினியில் இயங்கும். செயல்படுத்தும் முன் கேட்கும்.',
  featureDesktopBody:
    'டெஸ்க்டாப் பயன்பாடு உங்கள் கோப்புகளைப் படித்து திட்டங்களில் கட்டளைகளை இயக்கும். எதையும் மாற்றும் செயல்கள் உங்கள் அனுமதிக்காகக் காத்திருக்கும்.',
  featureToolsTitle: 'உங்கள் PDF களைப் படிக்கும், வலையில் தேடும், இன்பாக்ஸைச் சரிபார்க்கும்.',
  featureToolsBody:
    'அறிக்கைகளை பகுப்பாய்வு செய்யுங்கள், வலையில் தேடுங்கள், இன்பாக்ஸை வினவுங்கள். உணர்திறன் செயல்கள் எப்போதும் உங்கள் அனுமதிக்காகக் காத்திருக்கும்.',
  featurePricingTitle: 'நீங்கள் பயன்படுத்துவதற்கு மட்டுமே செலுத்துங்கள். வேறு எதுவும் இல்லை.',
  featurePricingBody:
    'மாதாந்திர திட்டம் இல்லை. விரும்பும் போது நிரப்பி ஒவ்வொரு செய்திக்கும் கிரெடிட்களைச் செலவழிக்கவும்.',
  startWithFreeCredits: 'இலவச கிரெடிட்களுடன் தொடங்குங்கள்',
  finalCtaTitle: '{credits} இலவச கிரெடிட்களுடன் தொடங்குங்கள்.',
  finalCtaSubtitle:
    'பயன்பாட்டைப் பதிவிறக்கவும் அல்லது உலாவியில் திறக்கவும். ரத்து செய்ய வேண்டிய சந்தா இல்லை.',
  howItWorksTitle: 'ஒரு நிமிடத்தில் தயாராகும்.',
  step1Title: 'பயன்பாட்டைத் திறக்கவும்',
  step1Body:
    'டெஸ்க்டாப் பயன்பாட்டைப் பதிவிறக்கவும் அல்லது வலையில் உள்நுழையவும். {credits} இலவச கிரெடிட்களுடன் தொடங்குவீர்கள்.',
  step2Title: 'மாதிரியைத் தேர்ந்தெடுக்கவும்',
  step2Body:
    'Claude, GPT, Gemini அல்லது வேறு மாதிரியைத் தேர்ந்தெடுத்து அடுத்த செய்தியில் மாற்றலாம்.',
  step3Title: 'வேலையை ஒப்படைக்கவும்',
  step3Body:
    'அரட்டை அடிக்கவும், அல்லது கோப்புகள், PDF மற்றும் இன்பாக்ஸைச் சுட்டிக்காட்டுங்கள். நீங்கள் அனுப்பும் கோரிக்கைகளுக்கு மட்டுமே செலுத்துவீர்கள்.',
  useCasesTitle: 'நீங்கள் செய்ய விரும்பாத வேலையை ஒப்படைக்கவும்.',
  useCaseProposals: 'வினாடிகளில் கிளையன்ட் முன்மொழிவுகளை உருவாக்குங்கள்',
  useCaseWebsite: 'நேரடியாக உங்கள் PC இல் வலைத்தளத்தை உருவாக்குங்கள்',
  useCaseExcel: 'Excel அறியாமல் Excel தாள்களைப் புதுப்பிக்கவும்',
  useCaseFolders: 'திட்ட கோப்புகள் மற்றும் கோப்புறைகளை ஒழுங்குபடுத்துங்கள்',
  useCaseResearch: 'ஒரு தலைப்பை ஆழமாக ஆராயுங்கள்',
  useCaseMeeting: 'குழப்பமான சந்திப்புக் குறிப்புகளை தெளிவான செயல்களாக மாற்றுங்கள்',
  useCaseCode: 'தலைவலியின்றி குறியீட்டை எழுதி பிழைத்திருத்துங்கள்',
  useCaseReports: '100-பக்க PDF அறிக்கைகளைச் சுருக்குங்கள்',
  useCaseFindAnswer: 'நீண்ட PDF இல் மறைந்திருக்கும் பதிலைக் கண்டுபிடியுங்கள்',
  useCaseData: 'எளிய ஆங்கிலத்தில் சிக்கலான தரவை பகுப்பாய்வு செய்யுங்கள்',
  seeItWork: 'இது வேலை செய்வதைப் பாருங்கள்',
  preview: 'முன்னோட்டம்',
  tasks: 'பணிகள்',
  faqTitle: 'கேள்விகளுக்கு பதில்கள்.',
  faqBillingQ: 'பில்லிங் எப்படி வேலை செய்கிறது?',
  faqBillingA:
    'USD அல்லது NGN இல் $1 இலிருந்து வாலட்டை நிரப்புவீர்கள். ஒவ்வொரு கோரிக்கையும் நீங்கள் தேர்ந்தெடுத்த மாதிரியின் அடிப்படையில் அதன் செலவைக் கழிக்கும். மாதாந்திர திட்டம் இல்லை.',
  faqModelsQ: 'எந்த மாதிரிகளைப் பயன்படுத்தலாம்?',
  faqModelsA:
    'Claude, GPT, Gemini, DeepSeek, Llama மற்றும் பல, OpenRouter வழியாக. எந்த செய்தியிலும் மாதிரியை மாற்றலாம்.',
  faqDesktopQ: 'டெஸ்க்டாப் பயன்பாடு எதை அணுக முடியும்?',
  faqDesktopA:
    'உங்கள் உள்ளூர் கோப்புகள் மற்றும் திட்டங்கள், நீங்கள் அனுமதிக்கும் கட்டளைகள். மாற்றங்கள் செய்யும் செயல்கள் முதலில் உங்கள் அனுமதிக்காகக் காத்திருக்கும்.',
  faqWebQ: 'எதையும் நிறுவாமல் பயன்படுத்தலாமா?',
  faqWebA:
    'ஆம். வலையில் உள்நுழையுங்கள். டெஸ்க்டாப் பயன்பாடு உள்ளூர் கோப்புகள் மற்றும் திட்டங்களுக்கான அணுகலைச் சேர்க்கிறது.',
  faqFreeQ: 'பதிவு செய்யும் போது என்ன கிடைக்கும்?',
  faqFreeA: 'முயற்சிக்க {credits} இலவச கிரெடிட்கள், ரத்து செய்ய வேண்டிய சந்தா இல்லை.',
  footerTagline: 'ஒவ்வொரு முன்னணி மாதிரிக்கும் ஒரே பணியிடம். நீங்கள் பயன்படுத்துவதற்கு மட்டுமே செலுத்துங்கள்.',
  connect: 'இணைக்கவும்',
  privacyChoices: 'தனியுரிமை தேர்வுகள்',
  alsoFor: 'இதற்கும்',
  or: 'அல்லது',
  and: 'மற்றும்',
  skipToContent: 'உள்ளடக்கத்திற்குச் செல்லவும்',
  downloadStartingTitle: 'உங்கள் பதிவிறக்கம் விரைவில் தொடங்கும்.',
  smartScreenTitle: 'Windows உங்கள் PC ஐப் பாதுகாத்தது',
  smartScreenDesc:
    'Microsoft Defender SmartScreen அறியப்படாத பயன்பாட்டைத் தொடங்குவதைத் தடுத்தது. இந்த பயன்பாட்டை இயக்குவது உங்கள் PC க்கு ஆபத்தாக இருக்கலாம்.',
  smartScreenMoreInfo: 'மேலும் தகவல்',
  windowsIntro:
    'AIGenius புதியது, எனவே Windows SmartScreen எச்சரிக்கலாம். திறப்பது எப்படி:',
  windowsClickMoreInfo: 'மேலும் தகவலைக் கிளிக் செய்யவும்.',
  windowsClickRunAnyway: 'எப்படியும் இயக்கு என்பதைக் கிளிக் செய்யவும்.',
  freeCreditsNotice: 'குறிப்பு: பயன்பாட்டில் பதிவு செய்யும் போது {credits} இலவச கிரெடிட்கள் கிடைக்கும்.',
};

function buildLocale(table, mod) {
  const out = {};
  for (const key of Object.keys(en)) {
    if (table[key]) out[key] = table[key];
    else if (hi[key] && hi[key] !== en[key]) out[key] = hi[key];
    else out[key] = en[key];
  }
  const outPath = path.join(dataDir, `${mod}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  let same = 0;
  for (const k of Object.keys(en)) if (out[k] === en[k]) same++;
  console.log(mod, 'wrote', outPath, 'stillEn', same);
}

const TE = {
  models: 'మోడల్స్',
  desktop: 'డెస్క్‌టాప్',
  tools: 'టూల్స్',
  pricing: 'ధర',
  signIn: 'సైన్ ఇన్',
  openApp: 'యాప్ తెరవండి',
  headline1: 'ఒక యాప్. ప్రతి మోడల్.',
  headline2: 'మీ ఫైల్స్. మీ మెషిన్.',
  headline3: 'సబ్‌స్క్రిప్షన్ లేదు.',
};
const MR = {
  models: 'मॉडेल्स',
  desktop: 'डेस्कटॉप',
  tools: 'साधने',
  pricing: 'किंमत',
  signIn: 'साइन इन',
  openApp: 'अॅप उघडा',
  headline1: 'एक अॅप. प्रत्येक मॉडेल.',
  headline2: 'तुमच्या फाइल्स. तुमचा संगणक.',
  headline3: 'सबस्क्रिप्शन नाही.',
};
const GU = {
  models: 'મોડેલ્સ',
  desktop: 'ડેસ્કટોપ',
  tools: 'સાધનો',
  pricing: 'કિંમત',
  signIn: 'સાઇન ઇન',
  openApp: 'એપ ખોલો',
  headline1: 'એક એપ. દરેક મોડેલ.',
  headline2: 'તમારી ફાઇલો. તમારું મશીન.',
  headline3: 'સબ્સ્ક્રિપ્શન નહીં.',
};
const KN = {
  models: 'ಮಾದರಿಗಳು',
  desktop: 'ಡೆಸ್ಕ್‌ಟಾಪ್',
  tools: 'ಉಪಕರಣಗಳು',
  pricing: 'ಬೆಲೆ',
  signIn: 'ಸೈನ್ ಇನ್',
  openApp: 'ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಿರಿ',
  headline1: 'ಒಂದು ಅಪ್ಲಿಕೇಶನ್. ಪ್ರತಿ ಮಾದರಿ.',
  headline2: 'ನಿಮ್ಮ ಫೈಲ್‌ಗಳು. ನಿಮ್ಮ ಯಂತ್ರ.',
  headline3: 'ಚಂದಾದಾರಿಕೆ ಇಲ್ಲ.',
};

for (const [table, mod] of [
  [TA, 'ta'],
  [TE, 'te'],
  [MR, 'mr'],
  [GU, 'gu'],
  [KN, 'kn'],
]) {
  buildLocale(table, mod);
}

spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', 'ta', 'te', 'mr', 'gu', 'kn'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
