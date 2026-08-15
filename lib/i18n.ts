import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import en from '../assets/locales/en.json';
import es from '../assets/locales/es.json';
import pt from '../assets/locales/pt.json';
import de from '../assets/locales/de.json';
import it from '../assets/locales/it.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  de: { translation: de },
  it: { translation: it },
};

const LANGUAGE_KEY = 'user_language';

// Synchronous base initialization
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default — English base
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

/**
 * Client-side safe initialization to detect language and load saved settings.
 */
export const setupI18n = async () => {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;

  try {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    
    if (!savedLanguage) {
      // Detect system language
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const deviceLanguage = locales[0].languageCode;
        savedLanguage = resources[deviceLanguage as keyof typeof resources] ? deviceLanguage : 'en';
      }
    }

    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.warn('[i18n] Initialization error:', error);
  }
};

export default i18n;
