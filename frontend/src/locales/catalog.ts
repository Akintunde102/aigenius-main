export interface LanguageCatalogItem {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  popular?: boolean;
}

export const LANGUAGE_CATALOG: LanguageCatalogItem[] = [
  // Popular / High-frequency Tier
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', popular: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', popular: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', popular: true },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', popular: true },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr', popular: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', popular: true },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', direction: 'ltr', popular: true },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', popular: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', popular: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', popular: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', popular: true },

  // European Tier
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', direction: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', direction: 'ltr' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', direction: 'ltr' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', direction: 'ltr' },

  // Asian & Pacific Tier
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'ltr' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', direction: 'ltr' },

  // Middle Eastern & African Tier
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', direction: 'ltr' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', direction: 'ltr' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', direction: 'ltr' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr' },
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
