export interface LanguageCatalogItem {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  popular?: boolean;
}

export const LANGUAGE_CATALOG: LanguageCatalogItem[] = [
  {
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "en-GB",
    "name": "English (United Kingdom)",
    "nativeName": "English (UK)",
    "direction": "ltr"
  },
  {
    "code": "en-CA",
    "name": "English (Canada)",
    "nativeName": "English (Canada)",
    "direction": "ltr"
  },
  {
    "code": "en-AU",
    "name": "English (Australia)",
    "nativeName": "English (Australia)",
    "direction": "ltr"
  },
  {
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "es-MX",
    "name": "Spanish (Mexico)",
    "nativeName": "Español (México)",
    "direction": "ltr"
  },
  {
    "code": "fr",
    "name": "French",
    "nativeName": "Français",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "fr-CA",
    "name": "French (Canada)",
    "nativeName": "Français (Canada)",
    "direction": "ltr"
  },
  {
    "code": "de",
    "name": "German",
    "nativeName": "Deutsch",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "zh-CN",
    "name": "Chinese (Simplified)",
    "nativeName": "简体中文",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "zh-TW",
    "name": "Chinese (Traditional)",
    "nativeName": "繁體中文",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "zh-HK",
    "name": "Chinese (Traditional, Hong Kong)",
    "nativeName": "繁體中文 (香港)",
    "direction": "ltr"
  },
  {
    "code": "ja",
    "name": "Japanese",
    "nativeName": "日本語",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "ko",
    "name": "Korean",
    "nativeName": "한국어",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "pt-BR",
    "name": "Portuguese (Brazil)",
    "nativeName": "Português (Brasil)",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "pt-PT",
    "name": "Portuguese (Portugal)",
    "nativeName": "Português (Portugal)",
    "direction": "ltr"
  },
  {
    "code": "it",
    "name": "Italian",
    "nativeName": "Italiano",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "ru",
    "name": "Russian",
    "nativeName": "Русский",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "ar",
    "name": "Arabic",
    "nativeName": "العربية",
    "direction": "rtl",
    "popular": true
  },
  {
    "code": "hi",
    "name": "Hindi",
    "nativeName": "हिन्दी",
    "direction": "ltr",
    "popular": true
  },
  {
    "code": "nl",
    "name": "Dutch",
    "nativeName": "Nederlands",
    "direction": "ltr"
  },
  {
    "code": "pl",
    "name": "Polish",
    "nativeName": "Polski",
    "direction": "ltr"
  },
  {
    "code": "tr",
    "name": "Turkish",
    "nativeName": "Türkçe",
    "direction": "ltr"
  },
  {
    "code": "sv",
    "name": "Swedish",
    "nativeName": "Svenska",
    "direction": "ltr"
  },
  {
    "code": "uk",
    "name": "Ukrainian",
    "nativeName": "Українська",
    "direction": "ltr"
  },
  {
    "code": "el",
    "name": "Greek",
    "nativeName": "Ελληνικά",
    "direction": "ltr"
  },
  {
    "code": "cs",
    "name": "Czech",
    "nativeName": "Čeština",
    "direction": "ltr"
  },
  {
    "code": "da",
    "name": "Danish",
    "nativeName": "Dansk",
    "direction": "ltr"
  },
  {
    "code": "fi",
    "name": "Finnish",
    "nativeName": "Suomi",
    "direction": "ltr"
  },
  {
    "code": "no",
    "name": "Norwegian",
    "nativeName": "Norsk",
    "direction": "ltr"
  },
  {
    "code": "nn-NO",
    "name": "Norwegian (Nynorsk)",
    "nativeName": "Norsk nynorsk",
    "direction": "ltr"
  },
  {
    "code": "ro",
    "name": "Romanian",
    "nativeName": "Română",
    "direction": "ltr"
  },
  {
    "code": "hu",
    "name": "Hungarian",
    "nativeName": "Magyar",
    "direction": "ltr"
  },
  {
    "code": "sk",
    "name": "Slovak",
    "nativeName": "Slovenčina",
    "direction": "ltr"
  },
  {
    "code": "sl",
    "name": "Slovenian",
    "nativeName": "Slovenščina",
    "direction": "ltr"
  },
  {
    "code": "bg",
    "name": "Bulgarian",
    "nativeName": "Български",
    "direction": "ltr"
  },
  {
    "code": "hr",
    "name": "Croatian",
    "nativeName": "Hrvatski",
    "direction": "ltr"
  },
  {
    "code": "sr-latn",
    "name": "Serbian (Latin)",
    "nativeName": "Srpski (latinica)",
    "direction": "ltr"
  },
  {
    "code": "sr-cyrl",
    "name": "Serbian (Cyrillic)",
    "nativeName": "Српски (ћирилица)",
    "direction": "ltr"
  },
  {
    "code": "bs",
    "name": "Bosnian",
    "nativeName": "Bosanski",
    "direction": "ltr"
  },
  {
    "code": "mk",
    "name": "Macedonian",
    "nativeName": "Македонски",
    "direction": "ltr"
  },
  {
    "code": "be",
    "name": "Belarusian",
    "nativeName": "Беларуская",
    "direction": "ltr"
  },
  {
    "code": "lt",
    "name": "Lithuanian",
    "nativeName": "Lietuvių",
    "direction": "ltr"
  },
  {
    "code": "lv",
    "name": "Latvian",
    "nativeName": "Latviešu",
    "direction": "ltr"
  },
  {
    "code": "et",
    "name": "Estonian",
    "nativeName": "Eesti",
    "direction": "ltr"
  },
  {
    "code": "is",
    "name": "Icelandic",
    "nativeName": "Íslenska",
    "direction": "ltr"
  },
  {
    "code": "ca",
    "name": "Catalan",
    "nativeName": "Català",
    "direction": "ltr"
  },
  {
    "code": "eu",
    "name": "Basque",
    "nativeName": "Euskara",
    "direction": "ltr"
  },
  {
    "code": "gl",
    "name": "Galician",
    "nativeName": "Galego",
    "direction": "ltr"
  },
  {
    "code": "ga",
    "name": "Irish",
    "nativeName": "Gaeilge",
    "direction": "ltr"
  },
  {
    "code": "cy",
    "name": "Welsh",
    "nativeName": "Cymraeg",
    "direction": "ltr"
  },
  {
    "code": "lb",
    "name": "Luxembourgish",
    "nativeName": "Lëtzebuergesch",
    "direction": "ltr"
  },
  {
    "code": "mt",
    "name": "Maltese",
    "nativeName": "Malti",
    "direction": "ltr"
  },
  {
    "code": "gd",
    "name": "Scottish Gaelic",
    "nativeName": "Gàidhlig",
    "direction": "ltr"
  },
  {
    "code": "sq",
    "name": "Albanian",
    "nativeName": "Shqip",
    "direction": "ltr"
  },
  {
    "code": "vi",
    "name": "Vietnamese",
    "nativeName": "Tiếng Việt",
    "direction": "ltr"
  },
  {
    "code": "id",
    "name": "Indonesian",
    "nativeName": "Bahasa Indonesia",
    "direction": "ltr"
  },
  {
    "code": "th",
    "name": "Thai",
    "nativeName": "ไทย",
    "direction": "ltr"
  },
  {
    "code": "bn",
    "name": "Bengali",
    "nativeName": "বাংলা",
    "direction": "ltr"
  },
  {
    "code": "ms",
    "name": "Malay",
    "nativeName": "Bahasa Melayu",
    "direction": "ltr"
  },
  {
    "code": "fil",
    "name": "Filipino",
    "nativeName": "Filipino",
    "direction": "ltr"
  },
  {
    "code": "ta",
    "name": "Tamil",
    "nativeName": "தமிழ்",
    "direction": "ltr"
  },
  {
    "code": "te",
    "name": "Telugu",
    "nativeName": "తెలుగు",
    "direction": "ltr"
  },
  {
    "code": "mr",
    "name": "Marathi",
    "nativeName": "मराठी",
    "direction": "ltr"
  },
  {
    "code": "gu",
    "name": "Gujarati",
    "nativeName": "ગુજરાતી",
    "direction": "ltr"
  },
  {
    "code": "kn",
    "name": "Kannada",
    "nativeName": "ಕನ್ನಡ",
    "direction": "ltr"
  },
  {
    "code": "ml",
    "name": "Malayalam",
    "nativeName": "മലയാളം",
    "direction": "ltr"
  },
  {
    "code": "pa",
    "name": "Punjabi",
    "nativeName": "ਪੰਜਾਬੀ",
    "direction": "ltr"
  },
  {
    "code": "ne",
    "name": "Nepali",
    "nativeName": "नेपाली",
    "direction": "ltr"
  },
  {
    "code": "si",
    "name": "Sinhala",
    "nativeName": "සිංහල",
    "direction": "ltr"
  },
  {
    "code": "as",
    "name": "Assamese",
    "nativeName": "অসমীয়া",
    "direction": "ltr"
  },
  {
    "code": "kok",
    "name": "Konkani",
    "nativeName": "कोंकणी",
    "direction": "ltr"
  },
  {
    "code": "or",
    "name": "Odia",
    "nativeName": "ଓଡ଼ିଆ",
    "direction": "ltr"
  },
  {
    "code": "km",
    "name": "Khmer",
    "nativeName": "ខ្មែរ",
    "direction": "ltr"
  },
  {
    "code": "lo",
    "name": "Lao",
    "nativeName": "ລາວ",
    "direction": "ltr"
  },
  {
    "code": "my",
    "name": "Burmese",
    "nativeName": "မြန်မာ",
    "direction": "ltr"
  },
  {
    "code": "kk",
    "name": "Kazakh",
    "nativeName": "Қазақ тілі",
    "direction": "ltr"
  },
  {
    "code": "uz",
    "name": "Uzbek",
    "nativeName": "O‘zbek",
    "direction": "ltr"
  },
  {
    "code": "az",
    "name": "Azerbaijani",
    "nativeName": "Azərbaycan",
    "direction": "ltr"
  },
  {
    "code": "ka",
    "name": "Georgian",
    "nativeName": "ქართული",
    "direction": "ltr"
  },
  {
    "code": "hy",
    "name": "Armenian",
    "nativeName": "Հայերեն",
    "direction": "ltr"
  },
  {
    "code": "ky",
    "name": "Kyrgyz",
    "nativeName": "Кыргызча",
    "direction": "ltr"
  },
  {
    "code": "mn",
    "name": "Mongolian",
    "nativeName": "Монгол",
    "direction": "ltr"
  },
  {
    "code": "tg",
    "name": "Tajik",
    "nativeName": "Тоҷикӣ",
    "direction": "ltr"
  },
  {
    "code": "tk",
    "name": "Turkmen",
    "nativeName": "Türkmençe",
    "direction": "ltr"
  },
  {
    "code": "tt",
    "name": "Tatar",
    "nativeName": "Татарча",
    "direction": "ltr"
  },
  {
    "code": "he",
    "name": "Hebrew",
    "nativeName": "עברית",
    "direction": "rtl"
  },
  {
    "code": "fa",
    "name": "Persian",
    "nativeName": "فارسی",
    "direction": "rtl"
  },
  {
    "code": "ur",
    "name": "Urdu",
    "nativeName": "اردو",
    "direction": "rtl"
  },
  {
    "code": "prs",
    "name": "Dari",
    "nativeName": "دری",
    "direction": "rtl"
  },
  {
    "code": "ku",
    "name": "Kurdish (Sorani)",
    "nativeName": "کوردی",
    "direction": "rtl"
  },
  {
    "code": "sd",
    "name": "Sindhi",
    "nativeName": "سنڌي",
    "direction": "rtl"
  },
  {
    "code": "ug",
    "name": "Uyghur",
    "nativeName": "ئۇيغۇرچە",
    "direction": "rtl"
  },
  {
    "code": "sw",
    "name": "Swahili",
    "nativeName": "Kiswahili",
    "direction": "ltr"
  },
  {
    "code": "yo",
    "name": "Yoruba",
    "nativeName": "Yorùbá",
    "direction": "ltr"
  },
  {
    "code": "ha",
    "name": "Hausa",
    "nativeName": "Hausa",
    "direction": "ltr"
  },
  {
    "code": "ig",
    "name": "Igbo",
    "nativeName": "Asụsụ Igbo",
    "direction": "ltr"
  },
  {
    "code": "am",
    "name": "Amharic",
    "nativeName": "አማርኛ",
    "direction": "ltr"
  },
  {
    "code": "af",
    "name": "Afrikaans",
    "nativeName": "Afrikaans",
    "direction": "ltr"
  },
  {
    "code": "zu",
    "name": "Zulu",
    "nativeName": "isiZulu",
    "direction": "ltr"
  },
  {
    "code": "xh",
    "name": "Xhosa",
    "nativeName": "isiXhosa",
    "direction": "ltr"
  },
  {
    "code": "rw",
    "name": "Kinyarwanda",
    "nativeName": "Kinyarwanda",
    "direction": "ltr"
  },
  {
    "code": "nso",
    "name": "Northern Sotho",
    "nativeName": "Sesotho sa Leboa",
    "direction": "ltr"
  },
  {
    "code": "tn",
    "name": "Setswana",
    "nativeName": "Setswana",
    "direction": "ltr"
  },
  {
    "code": "wo",
    "name": "Wolof",
    "nativeName": "Wolof",
    "direction": "ltr"
  },
  {
    "code": "ti",
    "name": "Tigrinya",
    "nativeName": "ትግርኛ",
    "direction": "ltr"
  },
  {
    "code": "quz",
    "name": "Quechua",
    "nativeName": "Runasimi",
    "direction": "ltr"
  },
  {
    "code": "chr",
    "name": "Cherokee",
    "nativeName": "ᏣᎳᎩ",
    "direction": "ltr"
  },
  {
    "code": "iu",
    "name": "Inuktitut",
    "nativeName": "ᐃᓄᒃᑎᑐᑦ",
    "direction": "ltr"
  },
  {
    "code": "quc",
    "name": "Kiche",
    "nativeName": "K'iche'",
    "direction": "ltr"
  }
];

export const DEFAULT_LANGUAGE_CODE = 'en';

export const LANGUAGE_MAP: Record<string, LanguageCatalogItem> = LANGUAGE_CATALOG.reduce(
  (acc, item) => {
    acc[item.code.toLowerCase()] = item;
    return acc;
  },
  {} as Record<string, LanguageCatalogItem>,
);

export function resolveLanguageItem(code?: string | null): LanguageCatalogItem {
  if (!code) {
    return LANGUAGE_MAP[DEFAULT_LANGUAGE_CODE]!;
  }
  const normalized = code.toLowerCase().trim();
  if (LANGUAGE_MAP[normalized]) {
    return LANGUAGE_MAP[normalized]!;
  }
  // Try matching primary language tag (e.g. 'es-ES' -> 'es')
  const baseCode = normalized.split('-')[0];
  if (baseCode && LANGUAGE_MAP[baseCode]) {
    return LANGUAGE_MAP[baseCode]!;
  }
  return LANGUAGE_MAP[DEFAULT_LANGUAGE_CODE]!;
}
